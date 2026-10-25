package dev.adamgavira.subwatch.stats;

import dev.adamgavira.subwatch.stats.StatsService.CategorySpend;
import dev.adamgavira.subwatch.stats.StatsService.Summary;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService stats;

    StatsController(StatsService stats) {
        this.stats = stats;
    }

    @GetMapping("/summary")
    Summary summary(Authentication auth) {
        return stats.summary(Long.valueOf(auth.getName()));
    }

    @GetMapping("/by-category")
    List<CategorySpend> byCategory(Authentication auth) {
        return stats.byCategory(Long.valueOf(auth.getName()));
    }
}
