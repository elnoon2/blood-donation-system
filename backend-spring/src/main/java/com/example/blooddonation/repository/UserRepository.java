package com.example.blooddonation.repository;

import com.example.blooddonation.entity.User;
import com.example.blooddonation.enums.Role;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // User.hospital is LAZY (audit Batch 8). The login + /me + most controller
    // paths read user.hospital while serializing, so default to fetching it.
    @EntityGraph(attributePaths = {"hospital"})
    Optional<User> findByEmail(String email);

    /**
     * Phase 14: case-insensitive email lookup. Used wherever a human types an
     * email into a form on a touch device — phone keyboards autocap the first
     * letter, which would otherwise miss a lowercase-stored email and trigger
     * a misleading "Invalid staff credentials" error. Used by both the login
     * path (UserDetailsServiceImpl) and the QR submit path
     * (QRVerificationController) so behavior is uniform.
     */
    @EntityGraph(attributePaths = {"hospital"})
    Optional<User> findByEmailIgnoreCase(String email);

    Boolean existsByEmail(String email);
    Boolean existsByEmailIgnoreCase(String email);

    // Phase 17: enforce unique phone numbers as part of the first-login phone
    // capture flow. DB-level partial unique index (Postgres V2) provides the
    // hard guarantee; this method is the cheap pre-check in the API path.
    Boolean existsByPhone(String phone);

    @EntityGraph(attributePaths = {"hospital"})
    List<User> findByRole(Role role);

    long countByBloodType(String bloodType);

    @EntityGraph(attributePaths = {"hospital"})
    Optional<User> findByMedicalId(String medicalId);

    @Override
    @EntityGraph(attributePaths = {"hospital"})
    Optional<User> findById(Long id);
}
