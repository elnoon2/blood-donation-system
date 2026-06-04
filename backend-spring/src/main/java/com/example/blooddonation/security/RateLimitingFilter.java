package com.example.blooddonation.security;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory per-IP rate limiter. Single-instance only (no Redis) so good for
 * MVP / small deployments. Limits per the Phase 9 / security audit
 * recommendation.
 *
 * Buckets are keyed by (route, IP). The route map is checked in order and the
 * first match wins, so put the most specific paths first.
 *
 * Production replacement plan: swap the in-memory map for a Bucket4j Redis
 * proxy when horizontal scaling is enabled.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final AntPathMatcher MATCHER = new AntPathMatcher();
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    /** (HTTP method, AntPath pattern, capacity, refill window). */
    private static final List<Rule> RULES = List.of(
        new Rule("POST", "/api/auth/login", 5, Duration.ofMinutes(1)),
        new Rule("POST", "/api/auth/register", 5, Duration.ofMinutes(10)),
        new Rule(null,   "/api/verify-donation/validate", 20, Duration.ofMinutes(1)),
        new Rule("POST", "/api/verify-donation/submit", 20, Duration.ofMinutes(1)),
        new Rule("POST", "/api/requests", 10, Duration.ofMinutes(1)),
        new Rule("POST", "/api/whatsapp/send", 30, Duration.ofMinutes(1))
    );

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        Rule rule = matchRule(req);
        if (rule == null) {
            chain.doFilter(req, res);
            return;
        }
        Bucket bucket = bucketFor(rule, clientIp(req));
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        res.setHeader("X-RateLimit-Limit", String.valueOf(rule.capacity));
        res.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, probe.getRemainingTokens())));
        if (!probe.isConsumed()) {
            long retryAfterSec = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000L);
            res.setStatus(429);
            res.setHeader("Retry-After", String.valueOf(retryAfterSec));
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            res.getWriter().write("{\"error\":\"rate_limited\",\"retryAfterSeconds\":" + retryAfterSec + "}");
            return;
        }
        chain.doFilter(req, res);
    }

    private Bucket bucketFor(Rule rule, String ip) {
        return buckets.computeIfAbsent(rule.pattern + "|" + ip,
            k -> Bucket.builder()
                .addLimit(limit -> limit.capacity(rule.capacity).refillGreedy(rule.capacity, rule.refillWindow))
                .build());
    }

    private Rule matchRule(HttpServletRequest req) {
        String path = req.getServletPath();
        String method = req.getMethod();
        for (Rule r : RULES) {
            if (r.method != null && !r.method.equalsIgnoreCase(method)) continue;
            if (MATCHER.match(r.pattern, path)) return r;
        }
        return null;
    }

    private String clientIp(HttpServletRequest req) {
        String forwarded = req.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // Take the leftmost (original client)
            int comma = forwarded.indexOf(',');
            return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        return req.getRemoteAddr();
    }

    private record Rule(String method, String pattern, long capacity, Duration refillWindow) {}
}
