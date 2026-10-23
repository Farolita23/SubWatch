package dev.adamgavira.subwatch.user;

import java.time.Instant;

public record UserDto(Long id, String email, String name, Instant createdAt) {

    public static UserDto from(User u) {
        return new UserDto(u.getId(), u.getEmail(), u.getName(), u.getCreatedAt());
    }
}
