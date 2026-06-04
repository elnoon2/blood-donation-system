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

    Boolean existsByEmail(String email);

    @EntityGraph(attributePaths = {"hospital"})
    List<User> findByRole(Role role);

    long countByBloodType(String bloodType);

    @EntityGraph(attributePaths = {"hospital"})
    Optional<User> findByMedicalId(String medicalId);

    @Override
    @EntityGraph(attributePaths = {"hospital"})
    Optional<User> findById(Long id);
}
