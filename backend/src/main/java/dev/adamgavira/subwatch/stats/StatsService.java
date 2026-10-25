package dev.adamgavira.subwatch.stats;

import dev.adamgavira.subwatch.subscription.Category;
import dev.adamgavira.subwatch.subscription.Subscription;
import dev.adamgavira.subwatch.subscription.SubscriptionRepository;
import dev.adamgavira.subwatch.subscription.SubscriptionStatus;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class StatsService {

    public record Summary(BigDecimal monthlySpend, BigDecimal yearlySpend, int activeSubscriptions, String currency) {
    }

    public record CategorySpend(Category category, BigDecimal monthlySpend, BigDecimal yearlySpend, int count) {
    }

    private final SubscriptionRepository repository;

    StatsService(SubscriptionRepository repository) {
        this.repository = repository;
    }

    /** Only ACTIVE subscriptions count. The global total is the sum of the rounded category totals. */
    public List<CategorySpend> byCategory(Long userId) {
        Map<Category, BigDecimal> exact = new EnumMap<>(Category.class);
        Map<Category, Integer> counts = new EnumMap<>(Category.class);
        for (Subscription s : repository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)) {
            exact.merge(s.getCategory(), SpendingCalculator.monthlyEquivalent(s.getAmount(), s.getBillingCycle()),
                    BigDecimal::add);
            counts.merge(s.getCategory(), 1, Integer::sum);
        }
        List<CategorySpend> result = new ArrayList<>();
        exact.forEach((category, total) -> {
            result.add(new CategorySpend(category, SpendingCalculator.toCents(total),
                    SpendingCalculator.yearly(total), counts.get(category)));
        });
        result.sort((a, b) -> b.monthlySpend().compareTo(a.monthlySpend()));
        return result;
    }

    public Summary summary(Long userId) {
        List<CategorySpend> categories = byCategory(userId);
        BigDecimal monthly = categories.stream().map(CategorySpend::monthlySpend)
                .reduce(BigDecimal.ZERO.setScale(2), BigDecimal::add);
        BigDecimal yearly = categories.stream().map(CategorySpend::yearlySpend)
                .reduce(BigDecimal.ZERO.setScale(2), BigDecimal::add);
        int active = categories.stream().mapToInt(CategorySpend::count).sum();
        return new Summary(monthly, yearly, active, "EUR");
    }
}
