package dev.adamgavira.subwatch.auth;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("subwatch.jwt")
public record JwtProperties(String secret, Duration accessTtl, Duration refreshTtl) {
}
