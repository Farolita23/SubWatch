package dev.adamgavira.subwatch.stats;

import dev.adamgavira.subwatch.subscription.BillingCycle;
import java.math.BigDecimal;
import java.math.RoundingMode;

/** Normalizes recurring amounts to a monthly cost. Money is always BigDecimal, rounded only at the end. */
public final class SpendingCalculator {

    private static final int PRECISION = 10;
    private static final BigDecimal WEEKS_PER_YEAR = BigDecimal.valueOf(52);
    private static final BigDecimal MONTHS_PER_YEAR = BigDecimal.valueOf(12);

    private SpendingCalculator() {
    }

    /** Monthly equivalent with extra precision (not yet rounded to cents). */
    public static BigDecimal monthlyEquivalent(BigDecimal amount, BillingCycle cycle) {
        return switch (cycle) {
            case WEEKLY -> amount.multiply(WEEKS_PER_YEAR).divide(MONTHS_PER_YEAR, PRECISION, RoundingMode.HALF_UP);
            case MONTHLY -> amount;
            case QUARTERLY -> amount.divide(BigDecimal.valueOf(3), PRECISION, RoundingMode.HALF_UP);
            case YEARLY -> amount.divide(MONTHS_PER_YEAR, PRECISION, RoundingMode.HALF_UP);
        };
    }

    /** Rounds a monthly amount to cents. */
    public static BigDecimal toCents(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    /** Yearly cost from the exact (unrounded) monthly amount, so 412.50/year stays 412.50. */
    public static BigDecimal yearly(BigDecimal monthlyExact) {
        return toCents(monthlyExact.multiply(MONTHS_PER_YEAR));
    }
}
