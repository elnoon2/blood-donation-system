package com.example.blooddonation.config;

import org.springframework.boot.diagnostics.AbstractFailureAnalyzer;
import org.springframework.boot.diagnostics.FailureAnalysis;

/**
 * Replace the cryptic stack trace that Spring prints when the DB password is
 * the placeholder value with a clear, actionable error that tells the operator
 * exactly which env var or local-config file to set.
 *
 * Registered via META-INF/spring/org.springframework.boot.diagnostics.FailureAnalyzer.imports
 * (Spring Boot 3 SPI).
 */
public class DataSourceFailureAnalyzer extends AbstractFailureAnalyzer<Throwable> {

    static final String PLACEHOLDER_MARKER = "CHANGE_ME_LOCAL_DEV_ONLY";

    @Override
    protected FailureAnalysis analyze(Throwable rootFailure, Throwable cause) {
        String message = collectMessages(rootFailure);
        boolean isOraInvalidLogin = message.contains("ORA-01017");
        boolean placeholderInPlay = message.contains(PLACEHOLDER_MARKER)
                || System.getProperty("spring.datasource.password", "").contains(PLACEHOLDER_MARKER)
                || isPasswordSetToPlaceholder();

        if (!isOraInvalidLogin && !placeholderInPlay) {
            return null;
        }

        String description;
        if (placeholderInPlay) {
            description = "The Oracle datasource password is still the CHANGE_ME placeholder. " +
                    "Phase 3 of the audit moved the password out of application.properties; the " +
                    "fallback value is a placeholder so misconfigurations fail visibly instead of " +
                    "silently using a leaked credential.";
        } else {
            description = "Oracle rejected the supplied datasource credentials (ORA-01017). " +
                    "The username/password combination supplied to Spring did not match what Oracle " +
                    "has stored for this account.";
        }

        String action = """
                Pick ONE of the following:

                A) Local development with a real Oracle XE on this machine:
                   1. Copy backend-spring/src/main/resources/application-local.properties.example
                      to backend-spring/src/main/resources/application-local.properties
                   2. Edit it to set spring.datasource.password to your local Oracle password.
                   3. Restart the backend. The file is gitignored so the password stays local.

                B) Run with environment variables (any environment):
                   Set the following before launching:
                     DB_URL=jdbc:oracle:thin:@<host>:1521:<sid>
                     DB_USERNAME=<user>
                     DB_PASSWORD=<password>
                     JWT_SECRET=<at-least-64-bytes>
                     CORS_ALLOWED_ORIGINS=<comma-separated-origins>

                C) Check that Oracle XE is actually running and that the 'system' account exists
                   and is unlocked:
                     sqlplus / as sysdba
                     SELECT username, account_status FROM dba_users WHERE username = 'SYSTEM';
                     ALTER USER system ACCOUNT UNLOCK;
                     ALTER USER system IDENTIFIED BY <new-password>;

                See audit/08-rca-ora-01017.md for the full root-cause walkthrough.
                """;

        return new FailureAnalysis(description, action, rootFailure);
    }

    private boolean isPasswordSetToPlaceholder() {
        String env = System.getenv("DB_PASSWORD");
        return env != null && env.contains(PLACEHOLDER_MARKER);
    }

    private String collectMessages(Throwable t) {
        StringBuilder sb = new StringBuilder();
        Throwable current = t;
        int guard = 0;
        while (current != null && guard++ < 20) {
            if (current.getMessage() != null) {
                sb.append(current.getMessage()).append('\n');
            }
            current = current.getCause();
        }
        return sb.toString();
    }
}
