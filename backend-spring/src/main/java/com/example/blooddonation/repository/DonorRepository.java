package com.example.blooddonation.repository;

import com.example.blooddonation.entity.Donor;
import com.example.blooddonation.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DonorRepository extends JpaRepository<Donor, Long> {
    Optional<Donor> findByUser(User user);
    Optional<Donor> findByUserId(Long userId);
    List<Donor> findByUserBloodTypeInAndUserGovernorateIgnoreCase(List<String> bloodTypes, String governorate);
    List<Donor> findByUserBloodTypeIn(List<String> bloodTypes);
    List<Donor> findByUserBloodTypeAndUserGovernorateIgnoreCase(String bloodType, String governorate);
    List<Donor> findByUserBloodType(String bloodType);
    List<Donor> findByUserGovernorateIgnoreCase(String governorate);
    List<Donor> findByAvailabilityStatus(String status);
}
