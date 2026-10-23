package dev.adamgavira.subwatch.auth;

import dev.adamgavira.subwatch.auth.AuthDtos.AuthResponse;
import dev.adamgavira.subwatch.auth.AuthDtos.LoginRequest;
import dev.adamgavira.subwatch.auth.AuthDtos.RegisterRequest;
import dev.adamgavira.subwatch.common.ApiException;
import dev.adamgavira.subwatch.user.User;
import dev.adamgavira.subwatch.user.UserDto;
import dev.adamgavira.subwatch.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final String BAD_CREDENTIALS = "Credenciales incorrectas";
    private static final String INVALID_REFRESH = "Refresh token no válido";

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final JwtProperties props;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();
    /** Lets login spend the same hashing time when the email does not exist. */
    private final String dummyHash;

    AuthService(UserRepository users, RefreshTokenRepository refreshTokens, PasswordEncoder encoder,
            JwtService jwt, JwtProperties props, Clock clock) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.encoder = encoder;
        this.jwt = jwt;
        this.props = props;
        this.clock = clock;
        this.dummyHash = encoder.encode("dummy-password");
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = normalize(req.email());
        if (users.existsByEmail(email)) {
            throw ApiException.conflict("Ya existe una cuenta con ese email");
        }
        try {
            User user = users.saveAndFlush(new User(email, encoder.encode(req.password()), req.name().trim()));
            return issueTokens(user);
        } catch (DataIntegrityViolationException e) {
            throw ApiException.conflict("Ya existe una cuenta con ese email");
        }
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        User user = users.findByEmail(normalize(req.email())).orElse(null);
        boolean matches = encoder.matches(req.password(), user != null ? user.getPasswordHash() : dummyHash);
        if (user == null || !matches) {
            throw ApiException.unauthorized(BAD_CREDENTIALS);
        }
        return issueTokens(user);
    }

    /** Rotating refresh: the presented token is revoked; reusing a revoked one revokes all of the user's tokens. */
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse refresh(String rawToken) {
        RefreshToken stored = refreshTokens.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> ApiException.unauthorized(INVALID_REFRESH));
        if (stored.isRevoked()) {
            refreshTokens.revokeAllByUserId(stored.getUserId());
            throw ApiException.unauthorized(INVALID_REFRESH);
        }
        if (stored.getExpiresAt().isBefore(clock.instant())) {
            throw ApiException.unauthorized(INVALID_REFRESH);
        }
        if (refreshTokens.revokeIfActive(stored.getId()) == 0) {
            // Lost a concurrent rotation of the same token: treat it as reuse.
            refreshTokens.revokeAllByUserId(stored.getUserId());
            throw ApiException.unauthorized(INVALID_REFRESH);
        }
        User user = users.findById(stored.getUserId())
                .orElseThrow(() -> ApiException.unauthorized(INVALID_REFRESH));
        return issueTokens(user);
    }

    @Transactional
    public void logout(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        refreshTokens.findByTokenHash(hash(rawToken))
                .ifPresent(t -> refreshTokens.revokeIfActive(t.getId()));
    }

    private AuthResponse issueTokens(User user) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        refreshTokens.save(new RefreshToken(user.getId(), hash(raw), clock.instant().plus(props.refreshTtl())));
        return new AuthResponse(jwt.issueAccessToken(user.getId()), raw, "Bearer",
                jwt.accessTtlSeconds(), UserDto.from(user));
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String hash(String raw) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
