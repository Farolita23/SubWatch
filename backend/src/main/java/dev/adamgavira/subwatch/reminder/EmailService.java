package dev.adamgavira.subwatch.reminder;

/** Outgoing email port. Implementations must throw an unchecked exception on failure. */
public interface EmailService {

    void send(String to, String subject, String body);
}
