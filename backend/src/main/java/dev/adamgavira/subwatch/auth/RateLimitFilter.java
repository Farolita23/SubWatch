package dev.adamgavira.subwatch.auth;

import dev.adamgavira.subwatch.common.ProblemJson;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * In-memory fixed-window limiter for the credential endpoints, keyed by client IP + path.
 * Single-instance only; behind a proxy, configure forwarded headers so the real client IP is seen.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Set<String> LIMITED = Set.of("/api/auth/login", "/api/auth/register", "/api/auth/refresh");
    private static final int MAX_TRACKED_KEYS = 10_000;

    private record Window(long startNanos, int count) {
    }

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final boolean enabled;
    private final int maxRequests;
    private final long windowNanos;

    RateLimitFilter(@Value("${subwatch.rate-limit.enabled:true}") boolean enabled,
            @Value("${subwatch.rate-limit.max-requests:10}") int maxRequests,
            @Value("${subwatch.rate-limit.window:1m}") Duration window) {
        this.enabled = enabled;
        this.maxRequests = maxRequests;
        this.windowNanos = window.toNanos();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !enabled || !"POST".equals(request.getMethod()) || !LIMITED.contains(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        long now = System.nanoTime();
        if (windows.size() > MAX_TRACKED_KEYS) {
            windows.values().removeIf(w -> now - w.startNanos() >= windowNanos);
        }
        String key = req.getRemoteAddr() + "|" + req.getRequestURI();
        Window w = windows.compute(key, (k, old) -> old == null || now - old.startNanos() >= windowNanos
                ? new Window(now, 1) : new Window(old.startNanos(), old.count() + 1));
        if (w.count() > maxRequests) {
            long retryAfter = Math.max(1, Duration.ofNanos(windowNanos - (now - w.startNanos())).toSeconds() + 1);
            res.setHeader("Retry-After", String.valueOf(retryAfter));
            ProblemJson.write(res, HttpStatus.TOO_MANY_REQUESTS, "Demasiados intentos. Inténtalo más tarde.");
            return;
        }
        chain.doFilter(req, res);
    }
}
