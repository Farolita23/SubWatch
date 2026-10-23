package dev.adamgavira.subwatch.common;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class AppConfig {

    @Bean
    Clock clock(@Value("${subwatch.timezone}") String zone) {
        return Clock.system(ZoneId.of(zone));
    }
}
