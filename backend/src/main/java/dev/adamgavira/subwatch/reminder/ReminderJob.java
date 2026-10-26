package dev.adamgavira.subwatch.reminder;

import java.time.Clock;
import java.time.LocalDate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class ReminderJob {

    private final ReminderService service;
    private final Clock clock;
    private final boolean runOnStartup;

    ReminderJob(ReminderService service, Clock clock,
            @Value("${subwatch.reminder.run-on-startup:true}") boolean runOnStartup) {
        this.runOnStartup = runOnStartup;
        this.service = service;
        this.clock = clock;
    }

    /** Catches up when the app was down at 08:00; idempotent thanks to the reminder table. */
    @EventListener(ApplicationReadyEvent.class)
    void runOnStartup() {
        if (runOnStartup) {
            run();
        }
    }

    @Scheduled(cron = "${subwatch.reminder.cron}", zone = "${subwatch.timezone}")
    void run() {
        service.runDaily(LocalDate.now(clock));
    }
}
