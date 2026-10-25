package dev.adamgavira.subwatch.subscription;

import dev.adamgavira.subwatch.common.PageResponse;
import dev.adamgavira.subwatch.subscription.SubscriptionDtos.StatusRequest;
import dev.adamgavira.subwatch.subscription.SubscriptionDtos.SubscriptionRequest;
import dev.adamgavira.subwatch.subscription.SubscriptionDtos.SubscriptionResponse;
import dev.adamgavira.subwatch.subscription.SubscriptionDtos.UpcomingResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private final SubscriptionService service;
    private final Clock clock;

    SubscriptionController(SubscriptionService service, Clock clock) {
        this.service = service;
        this.clock = clock;
    }

    @GetMapping
    PageResponse<SubscriptionResponse> list(Authentication auth,
            @RequestParam(required = false) SubscriptionStatus status,
            @RequestParam(required = false) Category category,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return PageResponse.of(service.list(userId(auth), status, category, q, page, size),
                SubscriptionResponse::from);
    }

    @GetMapping("/upcoming")
    List<UpcomingResponse> upcoming(Authentication auth,
            @RequestParam(defaultValue = "30") @Min(1) @Max(365) int days) {
        LocalDate today = LocalDate.now(clock);
        return service.upcoming(userId(auth), days).stream().map(s -> UpcomingResponse.from(s, today)).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    SubscriptionResponse create(Authentication auth, @Valid @RequestBody SubscriptionRequest req) {
        return SubscriptionResponse.from(service.create(userId(auth), req));
    }

    @GetMapping("/{id}")
    SubscriptionResponse get(Authentication auth, @PathVariable Long id) {
        return SubscriptionResponse.from(service.get(userId(auth), id));
    }

    @PutMapping("/{id}")
    SubscriptionResponse update(Authentication auth, @PathVariable Long id,
            @Valid @RequestBody SubscriptionRequest req) {
        return SubscriptionResponse.from(service.update(userId(auth), id, req));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(Authentication auth, @PathVariable Long id) {
        service.delete(userId(auth), id);
    }

    @PatchMapping("/{id}/status")
    SubscriptionResponse changeStatus(Authentication auth, @PathVariable Long id,
            @Valid @RequestBody StatusRequest req) {
        return SubscriptionResponse.from(service.changeStatus(userId(auth), id, req.status()));
    }

    private static Long userId(Authentication auth) {
        return Long.valueOf(auth.getName());
    }
}
