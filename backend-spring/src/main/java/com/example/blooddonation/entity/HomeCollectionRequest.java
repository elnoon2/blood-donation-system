package com.example.blooddonation.entity;

import com.example.blooddonation.enums.CollectionRequestStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "home_collection_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HomeCollectionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "donor_id", nullable = false)
    private Donor donor;

    @Column(nullable = false)
    private String fullAddress;

    @Column(nullable = false)
    private String governorate;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false)
    private LocalDate preferredDate;

    @Column(nullable = false)
    private String preferredTime;

    private String reasonForHomeCollection;
    private String medicalNotes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CollectionRequestStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = CollectionRequestStatus.PENDING_REVIEW;
        }
    }
}
