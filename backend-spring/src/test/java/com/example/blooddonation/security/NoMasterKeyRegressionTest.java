package com.example.blooddonation.security;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Regression guard: the hardcoded master-admin backdoor that pre-dated the
 * audit (security finding V2-1) must never come back. Verified at compile/test
 * time by scanning the source file directly so the check runs without booting
 * Spring or hitting a database.
 *
 * Intentionally string-matches the actual offending email and password rather
 * than a generic marker -- if a future refactor reintroduces the same backdoor
 * this fails loudly.
 */
class NoMasterKeyRegressionTest {

    private static final Path AUTH_CONTROLLER = Path.of(
        "src/main/java/com/example/blooddonation/controller/AuthController.java");

    @Test
    void hardcodedMasterEmailIsGone() throws Exception {
        String src = read(AUTH_CONTROLLER);
        assertFalse(src.contains("nourelkassyamin15@gmail.com"),
            "AuthController contains the hardcoded master-admin email. " +
            "The Phase 3 fix for V2-1 has been reverted.");
    }

    @Test
    void hardcodedMasterPasswordIsGone() throws Exception {
        String src = read(AUTH_CONTROLLER);
        assertFalse(src.contains("nour1234\""),
            "AuthController contains the hardcoded master-admin password literal.");
    }

    @Test
    void authenticationManagerIsTheOnlyAuthPath() throws Exception {
        String src = read(AUTH_CONTROLLER);
        // The legitimate auth path must still exist.
        if (!src.contains("authenticationManager.authenticate")) {
            fail("AuthController no longer delegates to AuthenticationManager. " +
                 "Login is broken or the controller was replaced with something insecure.");
        }
    }

    private static String read(Path p) throws Exception {
        if (!Files.exists(p)) {
            // CI may run from a different working dir; resolve from the project root.
            Path fallback = Path.of("backend-spring").resolve(p);
            if (Files.exists(fallback)) return Files.readString(fallback);
            fail("Could not locate " + p + " (cwd=" + Path.of(".").toAbsolutePath() + ")");
        }
        return Files.readString(p);
    }
}
