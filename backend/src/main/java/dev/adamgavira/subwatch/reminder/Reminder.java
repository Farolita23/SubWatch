package dev.adamgavira.subwatch.reminder;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "reminder", uniqueConstraints = @UniqueConstraint(columnNames = {"subscription_id", "billing_date"}))
public class Reminder {

    public enum Status { SENT, FAILED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "subscription_id", nullable = false)
    private Long subscriptionId;

    @Column(name = "billing_date", nullable = false)
    private LocalDate billingDate;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Status status;

    protected Reminder() {
    }

    public Reminder(Long subscriptionId, LocalDate billingDate) {
        this.subscriptionId = subscriptionId;
        this.billingDate = billingDate;
        this.status = Status.FAILED;
    }

    public void markSent(Instant at) {
        this.status = Status.SENT;
        this.sentAt = at;
    }

    public void markFailed() {
        this.status = Status.FAILED;
    }

    public Long getSubscriptionId() { return subscriptionId; }
    public LocalDate getBillingDate() { return billingDate; }
    public Instant getSentAt() { return sentAt; }
    public Status getStatus() { return status; }
}
