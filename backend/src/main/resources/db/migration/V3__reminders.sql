CREATE TABLE reminder (
    id              BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    subscription_id BIGINT      NOT NULL,
    billing_date    DATE        NOT NULL,
    sent_at         TIMESTAMP(6),
    status          VARCHAR(10) NOT NULL,
    CONSTRAINT uq_reminder_subscription_date UNIQUE (subscription_id, billing_date),
    CONSTRAINT fk_reminder_subscription FOREIGN KEY (subscription_id) REFERENCES subscription (id) ON DELETE CASCADE
);
