package dev.adamgavira.subwatch.subscription;

import dev.adamgavira.subwatch.common.ApiException;
import dev.adamgavira.subwatch.subscription.SubscriptionDtos.SubscriptionRequest;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** All operations are scoped to the owner: another user's subscription is reported as not found. */
@Service
@Transactional
public class SubscriptionService {

    private static final LocalDate MIN_DATE = LocalDate.of(2000, 1, 1);
    private static final LocalDate MAX_DATE = LocalDate.of(2100, 12, 31);

    private final SubscriptionRepository repository;
    private final Clock clock;

    SubscriptionService(SubscriptionRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Page<Subscription> list(Long userId, SubscriptionStatus status, Category category, String q,
            int page, int size) {
        Specification<Subscription> spec = (root, query, cb) -> cb.equal(root.get("userId"), userId);
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (category != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), category));
        }
        if (q != null && !q.isBlank()) {
            String escaped = q.trim().toLowerCase(Locale.ROOT)
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
            String pattern = "%" + escaped + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("name")), pattern, '\\'));
        }
        Sort sort = Sort.by("nextBillingDate").ascending().and(Sort.by("id"));
        return repository.findAll(spec, PageRequest.of(page, size, sort));
    }

    @Transactional(readOnly = true)
    public Subscription get(Long userId, Long id) {
        return repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Suscripción no encontrada"));
    }

    @Transactional(readOnly = true)
    public List<Subscription> upcoming(Long userId, int days) {
        LocalDate today = LocalDate.now(clock);
        return repository.findByUserIdAndStatusAndNextBillingDateBetweenOrderByNextBillingDateAscNameAsc(
                userId, SubscriptionStatus.ACTIVE, today, today.plusDays(days));
    }

    public Subscription create(Long userId, SubscriptionRequest req) {
        Subscription s = new Subscription(userId);
        apply(s, req);
        return repository.save(s);
    }

    public Subscription update(Long userId, Long id, SubscriptionRequest req) {
        Subscription s = get(userId, id);
        apply(s, req);
        return s;
    }

    public void delete(Long userId, Long id) {
        repository.delete(get(userId, id));
    }

    /** Resuming with a past billing date moves it to the next future cycle. */
    public Subscription changeStatus(Long userId, Long id, SubscriptionStatus status) {
        Subscription s = get(userId, id);
        s.setStatus(status);
        if (status == SubscriptionStatus.ACTIVE) {
            LocalDate today = LocalDate.now(clock);
            s.rollForwardTo(s.getBillingCycle()
                    .advanceUntilNotBefore(s.getNextBillingDate(), s.getBillingAnchorDay(), today));
        }
        return s;
    }

    private void apply(Subscription s, SubscriptionRequest req) {
        LocalDate date = req.nextBillingDate();
        if (date.isBefore(MIN_DATE) || date.isAfter(MAX_DATE)) {
            throw ApiException.invalidField("nextBillingDate", "La fecha debe estar entre 2000 y 2100");
        }
        s.setName(req.name().trim());
        s.setAmount(req.amount());
        s.setBillingCycle(req.billingCycle());
        s.setBillingDate(date);
        if (s.getStatus() == SubscriptionStatus.ACTIVE) {
            s.rollForwardTo(s.getBillingCycle()
                    .advanceUntilNotBefore(date, date.getDayOfMonth(), LocalDate.now(clock)));
        }
        s.setCategory(req.category() != null ? req.category() : Category.OTHER);
        s.setNotes(blankToNull(req.notes()));
        s.setUrl(blankToNull(req.url()));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
