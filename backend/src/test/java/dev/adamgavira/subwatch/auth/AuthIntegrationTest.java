package dev.adamgavira.subwatch.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import dev.adamgavira.subwatch.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class AuthIntegrationTest extends ApiTestSupport {

    private String credentials(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\",\"name\":\"Tester\"}";
    }

    private String refreshBody(String token) {
        return "{\"refreshToken\":\"" + token + "\"}";
    }

    @Test
    void registerThenLoginAndReadProfile() throws Exception {
        String email = uniqueEmail();
        register(email);
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(email.toUpperCase(), "Password1!")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        String access = JsonPath.read(body, "$.accessToken");
        mvc.perform(get("/api/users/me").header("Authorization", bearer(access)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    void duplicateEmailReturns409AsProblemJson() throws Exception {
        String email = uniqueEmail();
        register(email);
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(email, "Password1!")))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void validationErrorsAreReportedPerField() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(credentials("not-an-email", "short")))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    void wrongPasswordAndUnknownEmailLookIdentical() throws Exception {
        String email = uniqueEmail();
        register(email);
        String wrongPassword = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(email, "WrongPass1!")))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();
        String unknownEmail = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(uniqueEmail(), "WrongPass1!")))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();
        assertThat(wrongPassword).isEqualTo(unknownEmail);
    }

    @Test
    void protectedRouteWithoutOrWithBadTokenReturns401ProblemJson() throws Exception {
        mvc.perform(get("/api/subscriptions"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        mvc.perform(get("/api/subscriptions").header("Authorization", bearer("garbage")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshRotatesTokenAndReuseRevokesTheFamily() throws Exception {
        String[] tokens = register(uniqueEmail());
        String body = mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content(refreshBody(tokens[1])))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String newRefresh = JsonPath.read(body, "$.refreshToken");

        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(refreshBody(tokens[1])))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(refreshBody(newRefresh)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutIsPublicIdempotentAndRevokesRefreshToken() throws Exception {
        String[] tokens = register(uniqueEmail());
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON).content(refreshBody(tokens[1])))
                    .andExpect(status().isNoContent());
        }
        mvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON).content(refreshBody("unknown")))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/logout")).andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(refreshBody(tokens[1])))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void healthIsPublic() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk())
                .andExpect(content().string(containsString("UP")));
    }
}
