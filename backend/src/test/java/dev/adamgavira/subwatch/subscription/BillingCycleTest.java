package dev.adamgavira.subwatch.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class BillingCycleTest {

    @Test
    void weeklyAddsSevenDays() {
        assertThat(BillingCycle.WEEKLY.advance(LocalDate.of(2025, 12, 28), 28)).isEqualTo(LocalDate.of(2026, 1, 4));
    }

    @Test
    void monthlyFromJan31GoesToFeb28InCommonYear() {
        assertThat(BillingCycle.MONTHLY.advance(LocalDate.of(2025, 1, 31), 31)).isEqualTo(LocalDate.of(2025, 2, 28));
    }

    @Test
    void monthlyFromJan31GoesToFeb29InLeapYear() {
        assertThat(BillingCycle.MONTHLY.advance(LocalDate.of(2024, 1, 31), 31)).isEqualTo(LocalDate.of(2024, 2, 29));
    }

    @Test
    void anchorDayIsRecoveredAfterAShortMonth() {
        assertThat(BillingCycle.MONTHLY.advance(LocalDate.of(2025, 2, 28), 31)).isEqualTo(LocalDate.of(2025, 3, 31));
        assertThat(BillingCycle.MONTHLY.advance(LocalDate.of(2025, 3, 31), 31)).isEqualTo(LocalDate.of(2025, 4, 30));
    }

    @Test
    void monthlyCrossesYearBoundary() {
        assertThat(BillingCycle.MONTHLY.advance(LocalDate.of(2025, 12, 15), 15)).isEqualTo(LocalDate.of(2026, 1, 15));
    }

    @Test
    void quarterlyFromNov30GoesToFeb28() {
        assertThat(BillingCycle.QUARTERLY.advance(LocalDate.of(2025, 11, 30), 30)).isEqualTo(LocalDate.of(2026, 2, 28));
    }

    @Test
    void yearlyFromLeapDayGoesToFeb28ThenBackToFeb29() {
        assertThat(BillingCycle.YEARLY.advance(LocalDate.of(2024, 2, 29), 29)).isEqualTo(LocalDate.of(2025, 2, 28));
        assertThat(BillingCycle.YEARLY.advance(LocalDate.of(2027, 2, 28), 29)).isEqualTo(LocalDate.of(2028, 2, 29));
    }

    @Test
    void advanceUntilNotBeforeKeepsFutureAndTodayDates() {
        LocalDate today = LocalDate.of(2025, 6, 10);
        assertThat(BillingCycle.MONTHLY.advanceUntilNotBefore(today, 10, today)).isEqualTo(today);
        assertThat(BillingCycle.MONTHLY.advanceUntilNotBefore(today.plusDays(5), 15, today)).isEqualTo(today.plusDays(5));
    }

    @Test
    void advanceUntilNotBeforeCatchesUpSeveralCycles() {
        LocalDate today = LocalDate.of(2025, 6, 10);
        assertThat(BillingCycle.MONTHLY.advanceUntilNotBefore(LocalDate.of(2025, 1, 31), 31, today))
                .isEqualTo(LocalDate.of(2025, 6, 30));
        assertThat(BillingCycle.WEEKLY.advanceUntilNotBefore(LocalDate.of(2025, 5, 1), 1, today))
                .isEqualTo(LocalDate.of(2025, 6, 12));
    }
}
