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
    List<DonorRequest> findByDonor(User donor);
    List<DonorRequest> findByRequest(Request request);
}
