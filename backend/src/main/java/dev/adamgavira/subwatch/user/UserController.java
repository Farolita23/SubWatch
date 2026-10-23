package dev.adamgavira.subwatch.user;

import dev.adamgavira.subwatch.common.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository users;

    UserController(UserRepository users) {
        this.users = users;
    }

    @GetMapping("/me")
    UserDto me(Authentication auth) {
        return users.findById(Long.valueOf(auth.getName()))
                .map(UserDto::from)
                .orElseThrow(() -> ApiException.notFound("Usuario no encontrado"));
    }
}
