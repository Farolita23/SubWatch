package dev.adamgavira.subwatch.common;

import dev.adamgavira.subwatch.subscription.BillingCycle;
import dev.adamgavira.subwatch.subscription.Category;
import dev.adamgavira.subwatch.subscription.Subscription;
import dev.adamgavira.subwatch.subscription.SubscriptionRepository;
import dev.adamgavira.subwatch.subscription.SubscriptionStatus;
import dev.adamgavira.subwatch.user.User;
import dev.adamgavira.subwatch.user.UserRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Creates demo@subwatch.dev with realistic subscriptions. Enabled with subwatch.demo-data.enabled=true. */
@Component
@ConditionalOnProperty(name = "subwatch.demo-data.enabled", havingValue = "true")
class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    static final String EMAIL = "demo@subwatch.dev";

    private final UserRepository users;
    private final SubscriptionRepository subscriptions;
    private final PasswordEncoder encoder;
    private final Clock clock;

    DemoDataSeeder(UserRepository users, SubscriptionRepository subscriptions, PasswordEncoder encoder, Clock clock) {
        this.users = users;
        this.subscriptions = subscriptions;
        this.encoder = encoder;
        this.clock = clock;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.existsByEmail(EMAIL)) {
            return;
        }
        User user = users.save(new User(EMAIL, encoder.encode("Demo1234!"), "Demo"));
        LocalDate today = LocalDate.now(clock);
        add(user, "Netflix", "13.99", BillingCycle.MONTHLY, today.plusDays(3), Category.ENTERTAINMENT, SubscriptionStatus.ACTIVE, "https://www.netflix.com");
        add(user, "Spotify Premium", "10.99", BillingCycle.MONTHLY, today.plusDays(9), Category.ENTERTAINMENT, SubscriptionStatus.ACTIVE, "https://www.spotify.com");
        add(user, "Gimnasio", "39.90", BillingCycle.MONTHLY, today.plusDays(1), Category.HEALTH, SubscriptionStatus.ACTIVE, null);
        add(user, "Seguro del coche", "412.50", BillingCycle.YEARLY, today.plusDays(21), Category.INSURANCE, SubscriptionStatus.ACTIVE, null);
        add(user, "Dominio adamgavira.dev", "14.00", BillingCycle.YEARLY, today.plusDays(45), Category.DOMAINS_HOSTING, SubscriptionStatus.ACTIVE, null);
        add(user, "GitHub Copilot", "10.00", BillingCycle.MONTHLY, today.plusDays(14), Category.SOFTWARE, SubscriptionStatus.ACTIVE, "https://github.com");
        add(user, "Fibra y móvil", "29.99", BillingCycle.MONTHLY, today.plusDays(6), Category.UTILITIES, SubscriptionStatus.ACTIVE, null);
        add(user, "Disney+", "8.99", BillingCycle.MONTHLY, today.plusDays(18), Category.ENTERTAINMENT, SubscriptionStatus.PAUSED, "https://www.disneyplus.com");
        log.info("Demo user {} created", EMAIL);
    }

    private void add(User user, String name, String amount, BillingCycle cycle, LocalDate next, Category category,
            SubscriptionStatus status, String url) {
        Subscription s = new Subscription(user.getId());
        s.setName(name);
        s.setAmount(new BigDecimal(amount));
        s.setBillingCycle(cycle);
        s.setBillingDate(next);
        s.setCategory(category);
        s.setStatus(status);
        s.setUrl(url);
        subscriptions.save(s);
    }
}
