package com.example.blooddonation.repository;

import com.example.blooddonation.entity.QRVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface QRVerificationTokenRepository extends JpaRepository<QRVerificationToken, Long> {
    Optional<QRVerificationToken> findByToken(String token);
    Optional<QRVerificationToken> findByTokenAndRequestIdAndDonorIdAndPatientId(String token, Long requestId, Long donorId, Long patientId);
}
