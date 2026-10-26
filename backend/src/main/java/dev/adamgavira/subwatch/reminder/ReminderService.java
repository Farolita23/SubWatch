package dev.adamgavira.subwatch.reminder;

import dev.adamgavira.subwatch.subscription.Subscription;
import dev.adamgavira.subwatch.subscription.SubscriptionRepository;
import dev.adamgavira.subwatch.subscription.SubscriptionStatus;
import dev.adamgavira.subwatch.user.UserRepository;
import java.text.NumberFormat;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/**
 * Daily maintenance: rolls overdue billing dates forward and emails upcoming charges.
 * Idempotency: a reminder row (UNIQUE subscription + billing date) is claimed before sending, so
 * a second run, or a concurrent one, never sends a second email. FAILED rows are retried on later runs.
 */
@Service
public class ReminderService {

    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);
    private static final Locale ES = Locale.forLanguageTag("es-ES");

    private final SubscriptionRepository subscriptions;
    private final ReminderRepository reminders;
    private final UserRepository users;
    private final EmailService email;
    private final Clock clock;
    private final int daysBefore;

    ReminderService(SubscriptionRepository subscriptions, ReminderRepository reminders, UserRepository users,
            EmailService email, Clock clock, @Value("${subwatch.reminder.days-before}") int daysBefore) {
        this.subscriptions = subscriptions;
        this.reminders = reminders;
        this.users = users;
        this.email = email;
        this.clock = clock;
        this.daysBefore = daysBefore;
    }

    /** Returns the number of emails sent. */
    public int runDaily(LocalDate today) {
        rollOverdueDates(today);
        int sent = 0;
        List<Subscription> due = subscriptions.findByStatusAndNextBillingDateBetween(
                SubscriptionStatus.ACTIVE, today, today.plusDays(daysBefore));
        for (Subscription s : due) {
            try {
                if (remind(s)) {
                    sent++;
                }
            } catch (RuntimeException e) {
                log.error("Reminder failed for subscription {}", s.getId(), e);
            }
        }
        log.info("Reminder job finished for {}: {} emails sent", today, sent);
        return sent;
    }

    private void rollOverdueDates(LocalDate today) {
        List<Subscription> overdue = subscriptions.findByStatusAndNextBillingDateLessThan(
                SubscriptionStatus.ACTIVE, today);
        for (Subscription s : overdue) {
            s.rollForwardTo(s.getBillingCycle().advanceUntilNotBefore(s.getNextBillingDate(),
                    s.getBillingAnchorDay(), today));
        }
        subscriptions.saveAll(overdue);
    }

    private boolean remind(Subscription s) {
        Reminder reminder = reminders.findBySubscriptionIdAndBillingDate(s.getId(), s.getNextBillingDate())
                .orElse(null);
        if (reminder == null) {
            try {
                reminder = reminders.saveAndFlush(new Reminder(s.getId(), s.getNextBillingDate()));
            } catch (DataIntegrityViolationException e) {
                return false; // another run claimed it first
            }
        } else if (reminder.getStatus() == Reminder.Status.SENT) {
            return false;
        }
        var owner = users.findById(s.getUserId()).orElse(null);
        if (owner == null) {
            return false;
        }
        try {
            email.send(owner.getEmail(), subject(s), body(owner.getName(), s));
            reminder.markSent(clock.instant());
            reminders.save(reminder);
            return true;
        } catch (RuntimeException e) {
            log.warn("Could not send reminder for subscription {} ({}); will retry", s.getId(), e.getMessage());
            reminder.markFailed();
            reminders.save(reminder);
            return false;
        }
    }

    private static String subject(Subscription s) {
        return "SubWatch: " + s.getName().replaceAll("[\r\n]+", " ") + " se cobra pronto";
    }

    private static String body(String userName, Subscription s) {
        String amount = NumberFormat.getCurrencyInstance(ES).format(s.getAmount());
        String date = s.getNextBillingDate().format(DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", ES));
        return "Hola " + userName + ",\n\n"
                + "Tu suscripción " + s.getName() + " se cobrará el " + date + " por " + amount + ".\n\n"
                + "Si ya no la quieres, cancélala antes de esa fecha.\n\nSubWatch";
    }
}
