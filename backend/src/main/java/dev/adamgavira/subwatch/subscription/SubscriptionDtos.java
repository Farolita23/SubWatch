package dev.adamgavira.subwatch.subscription;

import dev.adamgavira.subwatch.stats.SpendingCalculator;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class SubscriptionDtos {

    private SubscriptionDtos() {
    }

    /** Body for POST and PUT. */
    public record SubscriptionRequest(
            @NotBlank(message = "El nombre es obligatorio")
            @Size(max = 100, message = "Máximo 100 caracteres")
            @Pattern(regexp = "^[^\r\n]*$", message = "El nombre no puede tener saltos de línea") String name,
            @NotNull(message = "El importe es obligatorio")
            @DecimalMin(value = "0.00", inclusive = false, message = "El importe debe ser mayor que 0")
            @Digits(integer = 8, fraction = 2, message = "Importe con máximo 8 enteros y 2 decimales") BigDecimal amount,
            @NotNull(message = "El ciclo de cobro es obligatorio") BillingCycle billingCycle,
            @NotNull(message = "La próxima fecha de cobro es obligatoria") LocalDate nextBillingDate,
            Category category,
            @Size(max = 500, message = "Máximo 500 caracteres") String notes,
            @Size(max = 255, message = "Máximo 255 caracteres")
            @Pattern(regexp = "^https?://\\S+$", message = "La URL debe empezar por http:// o https://") String url) {
    }

    public record StatusRequest(@NotNull(message = "El estado es obligatorio") SubscriptionStatus status) {
    }

    public record SubscriptionResponse(Long id, String name, BigDecimal amount, String currency,
            BillingCycle billingCycle, BigDecimal monthlyEquivalent, LocalDate nextBillingDate, Category category,
            SubscriptionStatus status, String notes, String url, Instant createdAt, Instant updatedAt) {

        public static SubscriptionResponse from(Subscription s) {
            return new SubscriptionResponse(s.getId(), s.getName(), s.getAmount(), s.getCurrency(),
                    s.getBillingCycle(), SpendingCalculator.monthlyEquivalent(s.getAmount(), s.getBillingCycle())
                            .setScale(2, java.math.RoundingMode.HALF_UP),
                    s.getNextBillingDate(), s.getCategory(), s.getStatus(), s.getNotes(), s.getUrl(),
                    s.getCreatedAt(), s.getUpdatedAt());
        }
    }

    public record UpcomingResponse(Long id, String name, BigDecimal amount, String currency, BillingCycle billingCycle,
            Category category, LocalDate nextBillingDate, long daysUntil) {

        public static UpcomingResponse from(Subscription s, LocalDate today) {
            return new UpcomingResponse(s.getId(), s.getName(), s.getAmount(), s.getCurrency(), s.getBillingCycle(),
                    s.getCategory(), s.getNextBillingDate(),
                    java.time.temporal.ChronoUnit.DAYS.between(today, s.getNextBillingDate()));
        }
    }
}
