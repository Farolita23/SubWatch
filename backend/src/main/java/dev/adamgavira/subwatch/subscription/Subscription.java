package dev.adamgavira.subwatch.subscription;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "subscription")
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    @JdbcTypeCode(SqlTypes.CHAR)
    private String currency = "EUR";

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle", nullable = false, length = 20)
    private BillingCycle billingCycle;

    @Column(name = "next_billing_date", nullable = false)
    private LocalDate nextBillingDate;

    /** Day of month originally chosen; keeps end-of-month charges from drifting. */
    @Column(name = "billing_anchor_day", nullable = false)
    private int billingAnchorDay;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Category category = Category.OTHER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

    @Column(length = 500)
    private String notes;

    @Column(length = 255)
    private String url;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Subscription() {
    }

    public Subscription(Long userId) {
        this.userId = userId;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    /** Sets the next charge date chosen by the user and resets the anchor day to it. */
    public void setBillingDate(LocalDate date) {
        this.nextBillingDate = date;
        this.billingAnchorDay = date.getDayOfMonth();
    }

    /** Moves the date forward after a charge, keeping the anchor day. */
    public void rollForwardTo(LocalDate date) {
        this.nextBillingDate = date;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public BillingCycle getBillingCycle() { return billingCycle; }
    public void setBillingCycle(BillingCycle billingCycle) { this.billingCycle = billingCycle; }
    public LocalDate getNextBillingDate() { return nextBillingDate; }
    public int getBillingAnchorDay() { return billingAnchorDay; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public SubscriptionStatus getStatus() { return status; }
    public void setStatus(SubscriptionStatus status) { this.status = status; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
