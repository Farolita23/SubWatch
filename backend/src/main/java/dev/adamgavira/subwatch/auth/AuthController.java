package dev.adamgavira.subwatch.auth;

import dev.adamgavira.subwatch.auth.AuthDtos.AuthResponse;
import dev.adamgavira.subwatch.auth.AuthDtos.LoginRequest;
import dev.adamgavira.subwatch.auth.AuthDtos.LogoutRequest;
import dev.adamgavira.subwatch.auth.AuthDtos.RefreshRequest;
import dev.adamgavira.subwatch.auth.AuthDtos.RegisterRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return auth.register(req);
    }

    @PostMapping("/login")
    AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req);
    }

    @PostMapping("/refresh")
    AuthResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return auth.refresh(req.refreshToken());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(@RequestBody(required = false) LogoutRequest req) {
        auth.logout(req != null ? req.refreshToken() : null);
    }
}
