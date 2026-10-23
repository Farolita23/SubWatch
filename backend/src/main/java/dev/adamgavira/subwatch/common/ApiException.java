package dev.adamgavira.subwatch.common;

import java.util.Map;
import org.springframework.http.HttpStatus;

/** Business error mapped to an RFC 7807 response by {@link GlobalExceptionHandler}. */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final Map<String, String> errors;

    public ApiException(HttpStatus status, String message) {
        this(status, message, null);
    }

    public ApiException(HttpStatus status, String message, Map<String, String> errors) {
        super(message);
        this.status = status;
        this.errors = errors;
    }

    public Map<String, String> getErrors() {
        return errors;
    }

    public static ApiException invalidField(String field, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "Hay errores de validación", Map.of(field, message));
    }

    public HttpStatus getStatus() {
        return status;
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, message);
    }

    public static ApiException conflict(String message) {
        return new ApiException(HttpStatus.CONFLICT, message);
    }

    public static ApiException unauthorized(String message) {
        return new ApiException(HttpStatus.UNAUTHORIZED, message);
    }
}
