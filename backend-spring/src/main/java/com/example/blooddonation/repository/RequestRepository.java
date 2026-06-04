package com.example.blooddonation.repository;

import com.example.blooddonation.entity.Request;
import com.example.blooddonation.enums.RequestStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RequestRepository extends JpaRepository<Request, Long> {

    /**
     * Pessimistic SELECT ... FOR UPDATE on the request row. Used by
     * DonationService.acceptRequest to serialise concurrent donor accept-clicks
     * on the same PENDING request (audit Batch 1 / security V11-1).
     *
     * Intentionally does NOT filter `deletedAt IS NULL` -- internal/admin code
     * may need to load soft-deleted rows.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Request r WHERE r.id = :id")
    Optional<Request> findByIdForUpdate(@Param("id") Long id);

    // -----------------------------------------------------------------------
    // Phase 12 (soft-delete): every list query now filters `deletedAt IS NULL`
    // via explicit @Query. We use explicit JPQL rather than Hibernate
    // @SQLDelete/@Where because the latter caused issues on the User entity
    // earlier (audit/09-rca-followup.md). Explicit is safer and easier to
    // override (admin endpoints can use findAllIncludingDeleted if needed).
    // -----------------------------------------------------------------------

    @EntityGraph(attributePaths = {"user", "hospital", "matchedDonor"})
    @Query("SELECT r FROM Request r WHERE r.governorate = :governorate AND r.deletedAt IS NULL")
    List<Request> findByGovernorate(@Param("governorate") String governorate);

    @EntityGraph(attributePaths = {"user", "hospital", "matchedDonor"})
    @Query("SELECT r FROM Request r WHERE r.bloodType = :bloodType AND r.deletedAt IS NULL")
    List<Request> findByBloodType(@Param("bloodType") String bloodType);

    @EntityGraph(attributePaths = {"user", "hospital", "matchedDonor"})
    @Query("SELECT r FROM Request r WHERE r.status = :status AND r.deletedAt IS NULL")
    List<Request> findByStatus(@Param("status") RequestStatus status);

    @EntityGraph(attributePaths = {"user", "hospital", "matchedDonor"})
    @Query("SELECT r FROM Request r WHERE r.governorate = :governorate AND r.bloodType = :bloodType AND r.deletedAt IS NULL")
    List<Request> findByGovernorateAndBloodType(@Param("governorate") String governorate, @Param("bloodType") String bloodType);

    @EntityGraph(attributePaths = {"user", "hospital", "matchedDonor"})
    @Query("SELECT r FROM Request r WHERE r.user.id = :userId AND r.deletedAt IS NULL ORDER BY r.requestDate DESC")
    List<Request> findByUserIdOrderByRequestDateDesc(@Param("userId") Long userId);

    @EntityGraph(attributePaths = {"user", "hospital", "matchedDonor"})
    @Query("SELECT r FROM Request r WHERE r.hospital.id = :hospitalId AND r.deletedAt IS NULL ORDER BY r.requestDate DESC")
    List<Request> findByHospitalIdOrderByRequestDateDesc(@Param("hospitalId") Long hospitalId);

    @EntityGraph(attributePaths = {"user", "hospital", "matchedDonor"})
    @Query("SELECT r FROM Request r WHERE r.matchedDonor.id = :matchedDonorId AND r.deletedAt IS NULL ORDER BY r.requestDate DESC")
    List<Request> findByMatchedDonorIdOrderByRequestDateDesc(@Param("matchedDonorId") Long matchedDonorId);

    @EntityGraph(attributePaths = {"user", "hospital", "matchedDonor"})
    @Query("SELECT r FROM Request r WHERE r.status IN :statuses AND r.deletedAt IS NULL ORDER BY r.requestDate DESC")
    List<Request> findByStatusInOrderByRequestDateDesc(@Param("statuses") List<RequestStatus> statuses);

    @EntityGraph(attributePaths = {"user", "hospital", "matchedDonor"})
    @Query("SELECT r FROM Request r WHERE r.bloodType IN :bloodTypes AND r.status IN :statuses AND r.deletedAt IS NULL ORDER BY r.requestDate DESC")
    List<Request> findByBloodTypeInAndStatusInOrderByRequestDateDesc(@Param("bloodTypes") List<String> bloodTypes, @Param("statuses") List<RequestStatus> statuses);

    @Query("SELECT (COUNT(r) > 0) FROM Request r WHERE r.user.id = :userId AND r.status IN :statuses AND r.deletedAt IS NULL")
    boolean existsByUserIdAndStatusIn(@Param("userId") Long userId, @Param("statuses") List<RequestStatus> statuses);

    // findAll inherited from JpaRepository would emit N+1 once entities are
    // LAZY; this override forces the eager graph for admin dashboard calls
    // AND filters out soft-deleted rows. Admins who need to see soft-deleted
    // rows use findAllIncludingDeleted below.
    @Override
    @EntityGraph(attributePaths = {"user", "hospital", "matchedDonor"})
    @Query("SELECT r FROM Request r WHERE r.deletedAt IS NULL")
    List<Request> findAll();

    /** Admin-only: returns rows regardless of soft-delete state. */
    @EntityGraph(attributePaths = {"user", "hospital", "matchedDonor"})
    @Query("SELECT r FROM Request r")
    List<Request> findAllIncludingDeleted();
}
