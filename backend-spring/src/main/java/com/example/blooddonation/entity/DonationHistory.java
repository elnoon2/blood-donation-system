package com.example.blooddonation.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "donation_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DonationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private Request request;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "donor_id", nullable = false)
    private User donor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hospital_id", nullable = false)
    private Hospital hospital;

    @Column(name = "blood_type", nullable = false, length = 20)
    private String bloodType;

    @Column(name = "bags_count", nullable = false)
    private Integer bagsCount;

    @Column(name = "qr_token", nullable = false, length = 512)
    private String qrToken;

    @Column(name = "verified_at", nullable = false)
    @Builder.Default
    private LocalDateTime verifiedAt = LocalDateTime.now();

    @Column(name = "verified_by_user_id")
    private Long verifiedByUserId;
}
