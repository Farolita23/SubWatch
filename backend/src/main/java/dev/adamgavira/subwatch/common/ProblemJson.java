package dev.adamgavira.subwatch.common;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;

/** Writes an RFC 7807 body from servlet filters, where @RestControllerAdvice does not apply. */
public final class ProblemJson {

    private ProblemJson() {
    }

    public static void write(HttpServletResponse res, HttpStatus status, String detail) throws IOException {
        res.setStatus(status.value());
        res.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        res.getWriter().write("{\"type\":\"about:blank\",\"title\":\"" + status.getReasonPhrase()
                + "\",\"status\":" + status.value() + ",\"detail\":\"" + detail + "\"}");
    }
}
