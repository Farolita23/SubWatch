package dev.adamgavira.subwatch.auth;

import dev.adamgavira.subwatch.user.UserDto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank(message = "El email es obligatorio") @Email(message = "Email no válido")
            @Size(max = 255, message = "Máximo 255 caracteres") String email,
            @NotBlank(message = "La contraseña es obligatoria")
            @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres") String password,
            @NotBlank(message = "El nombre es obligatorio")
            @Size(max = 100, message = "Máximo 100 caracteres") String name) {
    }

    public record LoginRequest(
            @NotBlank(message = "El email es obligatorio") String email,
            @NotBlank(message = "La contraseña es obligatoria") String password) {
    }

    public record RefreshRequest(@NotBlank(message = "El refresh token es obligatorio") String refreshToken) {
    }

    /** Logout is idempotent and never fails: an unknown or missing token is simply ignored. */
    public record LogoutRequest(String refreshToken) {
    }

    public record AuthResponse(String accessToken, String refreshToken, String tokenType, long expiresIn, UserDto user) {
    }
}
