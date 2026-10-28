package dev.adamgavira.subwatch;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class ApiTestSupport {

    @Autowired
    protected MockMvc mvc;

    protected static String uniqueEmail() {
        return "user-" + UUID.randomUUID() + "@test.dev";
    }

    /** Registers a user and returns {accessToken, refreshToken}. */
    protected String[] register(String email) throws Exception {
        String body = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Password1!\",\"name\":\"Tester\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return new String[] {JsonPath.read(body, "$.accessToken"), JsonPath.read(body, "$.refreshToken")};
    }

    protected static String bearer(String token) {
        return "Bearer " + token;
    }
}
