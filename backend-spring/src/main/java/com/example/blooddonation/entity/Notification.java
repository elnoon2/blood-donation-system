package com.example.blooddonation.entity;

import com.example.blooddonation.enums.NotificationType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @JsonProperty("time")
    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @JsonProperty("isRead")
    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    /**
     * Soft-clear marker (Phase 12). NULL = visible in the user's panel;
     * non-NULL = "cleared" (hidden from list but kept in DB for history).
     * Hibernate ddl-auto=update adds the column on first boot.
     */
    @Column(name = "cleared_at")
    private LocalDateTime clearedAt;

    @PrePersist
    protected void onSend() {
        if(sentAt == null) sentAt = LocalDateTime.now();
        if (isRead == null) isRead = false;
    }
}
