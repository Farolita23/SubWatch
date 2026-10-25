package dev.adamgavira.subwatch.subscription;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SubscriptionRepository
        extends JpaRepository<Subscription, Long>, JpaSpecificationExecutor<Subscription> {

    Optional<Subscription> findByIdAndUserId(Long id, Long userId);

    List<Subscription> findByUserIdAndStatus(Long userId, SubscriptionStatus status);

    List<Subscription> findByUserIdAndStatusAndNextBillingDateBetweenOrderByNextBillingDateAscNameAsc(
            Long userId, SubscriptionStatus status, LocalDate from, LocalDate to);

    List<Subscription> findByStatusAndNextBillingDateLessThan(SubscriptionStatus status, LocalDate date);

    List<Subscription> findByStatusAndNextBillingDateBetween(SubscriptionStatus status, LocalDate from, LocalDate to);
}
