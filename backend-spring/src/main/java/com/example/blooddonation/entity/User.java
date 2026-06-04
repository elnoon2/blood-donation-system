package com.example.blooddonation.entity;

import com.example.blooddonation.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// Soft-delete temporarily reverted (was: extends SoftDeletable + @SQLDelete
// + @Where). It requires a `deleted_at` column on `users` that the existing
// pre-audit DB does not have. ddl-auto=update would add the column, but
// adding it AND enabling @Where in the same boot is fragile. Re-enable once
// Flyway V4 has been applied (manually for now: ALTER TABLE users ADD
// (deleted_at TIMESTAMP NULL); see audit/10-batch-execution-summary.md Batch 5).

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(nullable = false)
    private String password;

    @Column(name = "blood_type")
    private String bloodType;

    @Column(name = "governorate")
    private String governorate;

    @Column(name = "phone")
    private String phone;

    @Column(name = "medical_id", unique = true)
    private String medicalId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "is_approved", nullable = false)
    @Builder.Default
    private Boolean isApproved = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hospital_id")
    private Hospital hospital;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
