package dev.adamgavira.subwatch.subscription;

import java.time.LocalDate;
import java.time.YearMonth;

public enum BillingCycle {
    WEEKLY, MONTHLY, QUARTERLY, YEARLY;

    /**
     * Next billing date after {@code current}. {@code anchorDay} is the day of month the user originally
     * chose, so a charge on the 31st returns to the 31st after a short month instead of drifting to the 28th.
     */
    public LocalDate advance(LocalDate current, int anchorDay) {
        return switch (this) {
            case WEEKLY -> current.plusWeeks(1);
            case MONTHLY -> addMonths(current, 1, anchorDay);
            case QUARTERLY -> addMonths(current, 3, anchorDay);
            case YEARLY -> addMonths(current, 12, anchorDay);
        };
    }

    /** Advances until the date is today or later (an overdue date is moved to the next future charge). */
    public LocalDate advanceUntilNotBefore(LocalDate current, int anchorDay, LocalDate today) {
        LocalDate date = current;
        while (date.isBefore(today)) {
            date = advance(date, anchorDay);
        }
        return date;
    }

    private static LocalDate addMonths(LocalDate current, int months, int anchorDay) {
        YearMonth target = YearMonth.from(current).plusMonths(months);
        return target.atDay(Math.min(anchorDay, target.lengthOfMonth()));
    }
}
