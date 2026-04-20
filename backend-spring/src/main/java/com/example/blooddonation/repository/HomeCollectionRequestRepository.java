package com.example.blooddonation.repository;

import com.example.blooddonation.entity.HomeCollectionRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HomeCollectionRequestRepository extends JpaRepository<HomeCollectionRequest, Long> {
    List<HomeCollectionRequest> findByDonorIdOrderByCreatedAtDesc(Long donorId);
}
