package dev.adamgavira.subwatch.reminder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import dev.adamgavira.subwatch.subscription.BillingCycle;
import dev.adamgavira.subwatch.subscription.Category;
import dev.adamgavira.subwatch.subscription.Subscription;
import dev.adamgavira.subwatch.subscription.SubscriptionRepository;
import dev.adamgavira.subwatch.subscription.SubscriptionStatus;
import dev.adamgavira.subwatch.user.User;
import dev.adamgavira.subwatch.user.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
@ActiveProfiles("test")
class ReminderServiceIntegrationTest {

    private static final LocalDate TODAY = LocalDate.of(2025, 6, 10);

    @Autowired ReminderService service;
    @Autowired UserRepository users;
    @Autowired SubscriptionRepository subscriptions;
    @Autowired ReminderRepository reminders;
    @MockitoBean EmailService email;

    private User user;

    @BeforeEach
    void setUp() {
        reset(email);
        user = users.save(new User("rem-" + UUID.randomUUID() + "@test.dev", "x", "Rem"));
    }

    private Subscription sub(String name, LocalDate next, SubscriptionStatus status) {
        Subscription s = new Subscription(user.getId());
        s.setName(name);
        s.setAmount(new BigDecimal("12.50"));
        s.setBillingCycle(BillingCycle.MONTHLY);
        s.setBillingDate(next);
        s.setCategory(Category.OTHER);
        s.setStatus(status);
        return subscriptions.save(s);
    }

    @Test
    void sendsOneEmailEvenWhenJobRunsTwice() {
        Subscription s = sub("Netflix", TODAY.plusDays(3), SubscriptionStatus.ACTIVE);

        service.runDaily(TODAY);
        service.runDaily(TODAY);

        verify(email, times(1)).send(eq(user.getEmail()), any(), any());
        assertThat(reminders.countBySubscriptionId(s.getId())).isEqualTo(1);
        assertThat(reminders.findBySubscriptionIdAndBillingDate(s.getId(), TODAY.plusDays(3)))
                .get().extracting(Reminder::getStatus).isEqualTo(Reminder.Status.SENT);
    }

    @Test
    void ignoresPausedCancelledAndFarAwaySubscriptions() {
        sub("Paused", TODAY.plusDays(3), SubscriptionStatus.PAUSED);
        sub("Cancelled", TODAY.plusDays(3), SubscriptionStatus.CANCELLED);
        sub("Far", TODAY.plusDays(20), SubscriptionStatus.ACTIVE);

        service.runDaily(TODAY);

        verify(email, never()).send(any(), any(), any());
    }

    @Test
    void failedSendIsRecordedAndRetriedNextDay() {
        Subscription s = sub("Gym", TODAY.plusDays(3), SubscriptionStatus.ACTIVE);
        doThrow(new IllegalStateException("smtp down")).when(email).send(any(), any(), any());

        service.runDaily(TODAY);
        assertThat(reminders.findBySubscriptionIdAndBillingDate(s.getId(), TODAY.plusDays(3)))
                .get().extracting(Reminder::getStatus).isEqualTo(Reminder.Status.FAILED);

        reset(email);
        service.runDaily(TODAY.plusDays(1));

        verify(email, times(1)).send(eq(user.getEmail()), any(), any());
        assertThat(reminders.findBySubscriptionIdAndBillingDate(s.getId(), TODAY.plusDays(3)))
                .get().extracting(Reminder::getStatus).isEqualTo(Reminder.Status.SENT);
    }

    @Test
    void overdueActiveSubscriptionsAreRolledForward() {
        Subscription s = sub("Old", TODAY.minusDays(40), SubscriptionStatus.ACTIVE);

        service.runDaily(TODAY);

        LocalDate next = subscriptions.findById(s.getId()).orElseThrow().getNextBillingDate();
        assertThat(next).isAfterOrEqualTo(TODAY).isBefore(TODAY.plusMonths(1).plusDays(1));
    }
}
