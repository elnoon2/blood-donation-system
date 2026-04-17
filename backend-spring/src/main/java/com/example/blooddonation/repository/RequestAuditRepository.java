package com.example.blooddonation.repository;

import com.example.blooddonation.entity.RequestAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RequestAuditRepository extends JpaRepository<RequestAudit, Long> {
    List<RequestAudit> findByRequestIdOrderByChangedAtDesc(Long requestId);
}
