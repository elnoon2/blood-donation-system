package com.example.blooddonation.repository;

import com.example.blooddonation.entity.QRVerificationToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface QRVerificationTokenRepository extends JpaRepository<QRVerificationToken, Long> {
    Optional<QRVerificationToken> findByToken(String token);

    /**
     * Pessimistic SELECT ... FOR UPDATE on the token row. Used by
     * QRService.validateAndConsumeToken to serialise concurrent submit-clicks
     * on the same QR token (audit Batch 1 / security V11-2).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM QRVerificationToken t WHERE t.token = :token")
    Optional<QRVerificationToken> findByTokenForUpdate(@Param("token") String token);

    Optional<QRVerificationToken> findByTokenAndRequestIdAndDonorIdAndPatientId(String token, Long requestId, Long donorId, Long patientId);
    Optional<QRVerificationToken> findFirstByRequestIdAndDonorIdAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
            Long requestId,
            Long donorId,
            LocalDateTime now
    );
    List<QRVerificationToken> findByRequestIdAndDonorIdAndIsUsedFalse(Long requestId, Long donorId);
}
