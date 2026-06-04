package com.example.blooddonation.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Audit log for every WhatsApp send attempt (Phase 13). Persisted regardless
 * of outcome so an operator can verify delivery without polling the Node
 * microservice. Hibernate `ddl-auto=update` creates the table on first boot;
 * if Oracle 21c refuses the auto-create, run manually:
 *
 *   CREATE TABLE whatsapp_delivery_log (
 *     id              NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 *     phone_last4     VARCHAR2(8),
 *     context_summary VARCHAR2(255),
 *     status          VARCHAR2(16) NOT NULL,
 *     error_code      VARCHAR2(64),
 *     error_message   VARCHAR2(500),
 *     created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
 *   );
 *
 * PII discipline: only the last 4 digits of the recipient phone are stored.
 */
@Entity
@Table(name = "whatsapp_delivery_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhatsAppDeliveryLog {

    public enum Status { SENT, SKIPPED, FAILED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Last 4 digits only — never persist full phone numbers. */
    @Column(name = "phone_last4", length = 8)
    private String phoneLast4;

    /** Short tag like "NEW_REQUEST:req=42" so an operator can grep for related deliveries. */
    @Column(name = "context_summary", length = 255)
    private String contextSummary;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private Status status;

    /** HTTP status code as a string, or e.g. "DISABLED", "NO_PHONE", "CONNECT_REFUSED". */
    @Column(name = "error_code", length = 64)
    private String errorCode;

    /** Truncated to 500 chars by the caller. */
    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onPersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
