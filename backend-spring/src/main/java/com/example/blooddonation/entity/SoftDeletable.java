package com.example.blooddonation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Soft-delete column carrier. Entities that should be soft-deletable extend
 * this and apply `@SQLDelete("UPDATE ... SET deleted_at = SYSTIMESTAMP WHERE id = ?")`
 * + `@Where("deleted_at IS NULL")` themselves so the table name is correct.
 *
 * Audit Batch 5 / database finding 2.2. Currently applied only to {@link User}
 * as a proof-of-concept. The remaining entities (Donor, Request, Hospital,
 * Donation, DonationHistory, DonationVerification, QRVerificationToken,
 * BloodInventory, Notification, AdminAction, Message, DonationForm,
 * DonorHealthAssessment, HomeCollectionRequest, DonorRequest) follow the same
 * pattern -- see audit/10-batch-execution-summary.md for the recipe.
 *
 * Hard-delete is still available via the admin `/api/admin/purge` endpoint
 * (planned) after a retention window has passed.
 */
@MappedSuperclass
@Getter
@Setter
public abstract class SoftDeletable {

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
