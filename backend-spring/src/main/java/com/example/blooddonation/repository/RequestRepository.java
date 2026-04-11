package com.example.blooddonation.repository;

import com.example.blooddonation.entity.Request;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RequestRepository extends JpaRepository<Request, Long> {
    List<Request> findByGovernorate(String governorate);
    List<Request> findByBloodType(String bloodType);
    List<Request> findByStatus(String status);
    List<Request> findByGovernorateAndBloodType(String governorate, String bloodType);
}
