package dev.adamgavira.subwatch.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import dev.adamgavira.subwatch.ApiTestSupport;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class RefreshConcurrencyTest extends ApiTestSupport {

    @Test
    void concurrentRefreshesWithTheSameTokenYieldExactlyOneSuccess() throws Exception {
        String refresh = register(uniqueEmail())[1];
        int threads = 6;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            Callable<Integer> call = () -> {
                start.await();
                return mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                                .content("{\"refreshToken\":\"" + refresh + "\"}"))
                        .andReturn().getResponse().getStatus();
            };
            results.add(pool.submit(call));
        }
        start.countDown();
        int ok = 0;
        for (Future<Integer> f : results) {
            int status = f.get();
            assertThat(status).isIn(200, 401);
            if (status == 200) {
                ok++;
            }
        }
        pool.shutdown();
        assertThat(ok).isEqualTo(1);
    }
}
