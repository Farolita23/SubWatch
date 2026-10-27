package dev.adamgavira.subwatch.stats;

import static org.assertj.core.api.Assertions.assertThat;

import dev.adamgavira.subwatch.subscription.BillingCycle;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class SpendingCalculatorTest {

    private static BigDecimal monthly(String amount, BillingCycle cycle) {
        return SpendingCalculator.toCents(SpendingCalculator.monthlyEquivalent(new BigDecimal(amount), cycle));
    }

    @Test
    void monthlyStaysTheSame() {
        assertThat(monthly("10.00", BillingCycle.MONTHLY)).isEqualByComparingTo("10.00");
    }

    @Test
    void yearlyIsDividedByTwelve() {
        assertThat(monthly("120.00", BillingCycle.YEARLY)).isEqualByComparingTo("10.00");
    }

    @Test
    void quarterlyIsDividedByThree() {
        assertThat(monthly("30.00", BillingCycle.QUARTERLY)).isEqualByComparingTo("10.00");
    }

    @Test
    void weeklyIsTimes52DividedBy12() {
        assertThat(monthly("3.00", BillingCycle.WEEKLY)).isEqualByComparingTo("13.00");
        assertThat(monthly("10.00", BillingCycle.WEEKLY)).isEqualByComparingTo("43.33");
    }

    @Test
    void roundsHalfUpOnlyAtTheEnd() {
        assertThat(monthly("100.00", BillingCycle.YEARLY)).isEqualByComparingTo("8.33");
        assertThat(monthly("10.00", BillingCycle.YEARLY)).isEqualByComparingTo("0.83");
        assertThat(monthly("0.06", BillingCycle.MONTHLY)).isEqualByComparingTo("0.06");
    }

    @Test
    void productExampleTenMonthlyPlus120YearlyIs20MonthlyAnd240Yearly() {
        BigDecimal exact = SpendingCalculator.monthlyEquivalent(new BigDecimal("10.00"), BillingCycle.MONTHLY)
                .add(SpendingCalculator.monthlyEquivalent(new BigDecimal("120.00"), BillingCycle.YEARLY));
        BigDecimal monthly = SpendingCalculator.toCents(exact);
        assertThat(monthly).isEqualByComparingTo("20.00");
        assertThat(SpendingCalculator.yearly(monthly)).isEqualByComparingTo("240.00");
    }

    @Test
    void yearlyComesFromTheExactAmountNotFromTheRoundedMonthly() {
        BigDecimal exactMonthly = SpendingCalculator.monthlyEquivalent(new BigDecimal("412.50"), BillingCycle.YEARLY);
        assertThat(SpendingCalculator.toCents(exactMonthly)).isEqualByComparingTo("34.38");
        assertThat(SpendingCalculator.yearly(exactMonthly)).isEqualByComparingTo("412.50");
    }
}
