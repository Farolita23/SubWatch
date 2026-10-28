package dev.adamgavira.subwatch.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import dev.adamgavira.subwatch.ApiTestSupport;
import java.time.Clock;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

class SubscriptionIntegrationTest extends ApiTestSupport {

    @Autowired
    Clock clock;

    private String json(String name, String amount, String cycle, LocalDate next, String category) {
        return "{\"name\":\"" + name + "\",\"amount\":" + amount + ",\"billingCycle\":\"" + cycle
                + "\",\"nextBillingDate\":\"" + next + "\",\"category\":\"" + category + "\"}";
    }

    private long create(String token, String body) throws Exception {
        String res = mvc.perform(post("/api/subscriptions").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(res, "$.id")).longValue();
    }

    private void setStatus(String token, long id, String status) throws Exception {
        mvc.perform(patch("/api/subscriptions/" + id + "/status").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"" + status + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void crudLifecycle() throws Exception {
        String token = register(uniqueEmail())[0];
        LocalDate next = LocalDate.now(clock).plusDays(10);
        long id = create(token, json("Netflix", "13.99", "MONTHLY", next, "ENTERTAINMENT"));

        mvc.perform(get("/api/subscriptions/" + id).header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Netflix"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.currency").value("EUR"));

        mvc.perform(put("/api/subscriptions/" + id).header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("Netflix 4K", "17.99", "MONTHLY", next, "ENTERTAINMENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Netflix 4K"))
                .andExpect(jsonPath("$.amount").value(17.99));

        setStatus(token, id, "PAUSED");

        mvc.perform(get("/api/subscriptions?status=PAUSED&q=netflix").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/subscriptions?status=ACTIVE").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.totalElements").value(0));

        mvc.perform(delete("/api/subscriptions/" + id).header("Authorization", bearer(token)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/subscriptions/" + id).header("Authorization", bearer(token)))
                .andExpect(status().isNotFound());
    }

    @Test
    void validationErrorsPerField() throws Exception {
        String token = register(uniqueEmail())[0];
        mvc.perform(post("/api/subscriptions").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"amount\":0,\"url\":\"ftp://x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.amount").exists())
                .andExpect(jsonPath("$.errors.billingCycle").exists())
                .andExpect(jsonPath("$.errors.nextBillingDate").exists())
                .andExpect(jsonPath("$.errors.url").exists());
    }

    @Test
    void usersCannotSeeOrModifyEachOthersSubscriptions() throws Exception {
        String alice = register(uniqueEmail())[0];
        String bob = register(uniqueEmail())[0];
        LocalDate next = LocalDate.now(clock).plusDays(5);
        long aliceSub = create(alice, json("Alice sub", "9.99", "MONTHLY", next, "OTHER"));

        mvc.perform(get("/api/subscriptions/" + aliceSub).header("Authorization", bearer(bob)))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/subscriptions/" + aliceSub).header("Authorization", bearer(bob))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("Hacked", "1.00", "MONTHLY", next, "OTHER")))
                .andExpect(status().isNotFound());
        mvc.perform(patch("/api/subscriptions/" + aliceSub + "/status").header("Authorization", bearer(bob))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CANCELLED\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/subscriptions/" + aliceSub).header("Authorization", bearer(bob)))
                .andExpect(status().isNotFound());

        mvc.perform(get("/api/subscriptions").header("Authorization", bearer(bob)))
                .andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/subscriptions/upcoming").header("Authorization", bearer(bob)))
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/stats/summary").header("Authorization", bearer(bob)))
                .andExpect(jsonPath("$.monthlySpend").value(0.0));

        mvc.perform(get("/api/subscriptions/" + aliceSub).header("Authorization", bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alice sub"));
    }

    @Test
    void statsCountOnlyActiveAndCategoriesMatchTotal() throws Exception {
        String token = register(uniqueEmail())[0];
        LocalDate next = LocalDate.now(clock).plusDays(7);
        create(token, json("Monthly", "10.00", "MONTHLY", next, "SOFTWARE"));
        create(token, json("Yearly", "120.00", "YEARLY", next, "ENTERTAINMENT"));
        long paused = create(token, json("Paused", "99.00", "MONTHLY", next, "OTHER"));
        setStatus(token, paused, "PAUSED");

        mvc.perform(get("/api/stats/summary").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.monthlySpend").value(20.0))
                .andExpect(jsonPath("$.yearlySpend").value(240.0))
                .andExpect(jsonPath("$.activeSubscriptions").value(2));
        mvc.perform(get("/api/stats/by-category").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/subscriptions/upcoming?days=30").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].daysUntil").value(7));
    }

    @Test
    void resumingWithPastDateAdvancesToNextCycle() throws Exception {
        String token = register(uniqueEmail())[0];
        LocalDate today = LocalDate.now(clock);
        long id = create(token, json("Old", "5.00", "MONTHLY", today.minusMonths(3).minusDays(1), "OTHER"));
        setStatus(token, id, "PAUSED");
        setStatus(token, id, "ACTIVE");
        String res = mvc.perform(get("/api/subscriptions/" + id).header("Authorization", bearer(token)))
                .andReturn().getResponse().getContentAsString();
        LocalDate date = LocalDate.parse(JsonPath.read(res, "$.nextBillingDate"));
        assertThat(date).isAfterOrEqualTo(today).isBefore(today.plusMonths(1).plusDays(1));
    }

    @Test
    void invalidFilterValueReturns400() throws Exception {
        String token = register(uniqueEmail())[0];
        mvc.perform(get("/api/subscriptions?status=NOPE").header("Authorization", bearer(token)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void yearlySpendMatchesRealYearlyChargeAndCategoryBreakdown() throws Exception {
        String token = register(uniqueEmail())[0];
        LocalDate next = LocalDate.now(clock).plusDays(7);
        create(token, json("Seguro", "412.50", "YEARLY", next, "INSURANCE"));

        mvc.perform(get("/api/stats/summary").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.monthlySpend").value(34.38))
                .andExpect(jsonPath("$.yearlySpend").value(412.5));
        mvc.perform(get("/api/stats/by-category").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$[0].yearlySpend").value(412.5));
    }

    @Test
    void pastDateOnActiveSubscriptionIsRolledAndExtremeDatesAreRejected() throws Exception {
        String token = register(uniqueEmail())[0];
        LocalDate today = LocalDate.now(clock);
        long id = create(token, json("Past", "5.00", "MONTHLY", today.minusDays(40), "OTHER"));
        String res = mvc.perform(get("/api/subscriptions/" + id).header("Authorization", bearer(token)))
                .andReturn().getResponse().getContentAsString();
        assertThat(LocalDate.parse(JsonPath.read(res, "$.nextBillingDate"))).isAfterOrEqualTo(today);

        mvc.perform(post("/api/subscriptions").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("Far", "5.00", "MONTHLY", LocalDate.of(9999, 1, 1), "OTHER")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.nextBillingDate").exists());
    }
}
