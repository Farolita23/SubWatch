CREATE TABLE subscription (
    id                BIGINT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id           BIGINT         NOT NULL,
    name              VARCHAR(100)   NOT NULL,
    amount            DECIMAL(10, 2) NOT NULL,
    currency          CHAR(3)        NOT NULL DEFAULT 'EUR',
    billing_cycle     VARCHAR(20)    NOT NULL,
    next_billing_date DATE           NOT NULL,
    billing_anchor_day INT           NOT NULL,
    category          VARCHAR(30)    NOT NULL,
    status            VARCHAR(20)    NOT NULL,
    notes             VARCHAR(500),
    url               VARCHAR(255),
    created_at        TIMESTAMP(6)   NOT NULL,
    updated_at        TIMESTAMP(6)   NOT NULL,
    CONSTRAINT fk_subscription_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_subscription_user ON subscription (user_id);
CREATE INDEX idx_subscription_next_billing ON subscription (next_billing_date);
