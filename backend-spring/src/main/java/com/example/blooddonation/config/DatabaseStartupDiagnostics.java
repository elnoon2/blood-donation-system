package com.example.blooddonation.config;

import jakarta.persistence.EntityManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Logs which Oracle instance Spring connected to and how many users exist.
 * Compare this count with SQL Developer (SELECT COUNT(*) FROM users).
 */
@Component
@Order(100)
public class DatabaseStartupDiagnostics implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseStartupDiagnostics.class);

    private final EntityManager entityManager;

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    public DatabaseStartupDiagnostics(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public void run(ApplicationArguments args) {
        Number total = (Number) entityManager.createNativeQuery("SELECT COUNT(*) FROM users")
                .getSingleResult();
        Number active = (Number) entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL").getSingleResult();

        log.info("Oracle JDBC URL: {}", datasourceUrl);
        log.info("users table: {} row(s) total, {} active (deleted_at IS NULL)", total, active);

        if (total.longValue() <= 5) {
            log.warn(
                    "Few users in this database. If SQL Developer shows more rows, your IDE uses a "
                            + "DIFFERENT connection. Set spring.profiles.active=legacy or match spring.datasource.url "
                            + "to SQL Developer (Service: XEPDB1 vs SID xe). See application-legacy-db.properties.");
        }
    }
}
