package com.example.blooddonation.entity;

import com.example.blooddonation.enums.RequestStatus;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Request {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "blood_type", nullable = false)
    private String bloodType;

    @Column(name = "quantity_needed", nullable = false)
    private Integer quantityNeeded;

    @Column(name = "governorate", nullable = false)
    private String governorate;

    @Column(name = "phone", nullable = false)
    private String phone;

    @Column(name = "requester_latitude")
    private Double requesterLatitude;

    @Column(name = "requester_longitude")
    private Double requesterLongitude;

    @Column(name = "requester_map_link", length = 500)
    private String requesterMapLink;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status;

    @Column(name = "donor_confirmed", nullable = false)
    @Builder.Default
    private Boolean donorConfirmed = false;

    @Column(name = "patient_confirmed", nullable = false)
    @Builder.Default
    private Boolean patientConfirmed = false;

    @Column(name = "request_date", nullable = false)
    private LocalDate requestDate;

    @Column(name = "verification_code", length = 6)
    private String verificationCode;

    @Column(name = "patient_name")
    private String patientName;

    @Column(name = "bags_needed", nullable = false)
    @Builder.Default
    private Integer bagsNeeded = 1;

    @Column(name = "urgency_level")
    private String urgencyLevel;

    @Column(name = "confirmed_donors")
    @Builder.Default
    private Integer confirmedDonors = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hospital_id")
    private Hospital hospital;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matched_donor_id")
    private User matchedDonor;

    /**
     * Soft-delete marker (Phase 12). NULL = active, non-NULL = soft-deleted
     * by the owning patient or matched donor. Hibernate ddl-auto=update
     * adds the column on first boot. Repository list queries filter
     * `deletedAt IS NULL`; admin hard-delete is unaffected.
     */
    @Column(name = "deleted_at")
    private java.time.LocalDateTime deletedAt;
}
