package com.example.blooddonation.repository;

import com.example.blooddonation.entity.DonorRequest;
import com.example.blooddonation.entity.Request;
import com.example.blooddonation.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DonorRequestRepository extends JpaRepository<DonorRequest, Long> {
    boolean existsByDonorAndRequest(User donor, Request request);
    boolean existsByDonorIdAndRequestId(Long donorId, Long requestId);
    List<DonorRequest> findByDonor(User donor);
    List<DonorRequest> findByDonorId(Long donorId);
    List<DonorRequest> findByRequest(Request request);
    java.util.Optional<DonorRequest> findByDonorIdAndRequestId(Long donorId, Long requestId);
}
