package dev.adamgavira.subwatch.reminder;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {

    Optional<Reminder> findBySubscriptionIdAndBillingDate(Long subscriptionId, LocalDate billingDate);

    long countBySubscriptionId(Long subscriptionId);
}
