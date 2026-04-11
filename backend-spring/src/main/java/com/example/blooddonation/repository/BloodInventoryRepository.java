package com.example.blooddonation.repository;

import com.example.blooddonation.entity.BloodInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BloodInventoryRepository extends JpaRepository<BloodInventory, Long> {
    List<BloodInventory> findByHospitalId(Long hospitalId);
    Optional<BloodInventory> findByHospitalIdAndBloodType(Long hospitalId, String bloodType);
}
