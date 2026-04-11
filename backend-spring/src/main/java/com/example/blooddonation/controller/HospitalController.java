package com.example.blooddonation.controller;

import com.example.blooddonation.dto.HospitalDTO;
import com.example.blooddonation.dto.MessageResponse;
import com.example.blooddonation.entity.Hospital;
import com.example.blooddonation.exception.ResourceNotFoundException;
import com.example.blooddonation.repository.HospitalRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hospitals")
public class HospitalController {

    @Autowired
    HospitalRepository hospitalRepository;

    @GetMapping
    public List<Hospital> getAllHospitals(@RequestParam(required = false) String governorate) {
        if (governorate != null && !governorate.isEmpty()) {
            return hospitalRepository.findByGovernorate(governorate);
        }
        return hospitalRepository.findAll();
    }

    @GetMapping("/{id}")
    public Hospital getHospital(@PathVariable Long id) {
        return hospitalRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Hospital not found"));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createHospital(@Valid @RequestBody HospitalDTO dto) {
        Hospital hospital = Hospital.builder()
            .name(dto.getName())
            .location(dto.getLocation())
            .governorate(dto.getGovernorate())
            .phone(dto.getPhone())
            .email(dto.getEmail())
            .build();
        hospitalRepository.save(hospital);
        return ResponseEntity.ok(new MessageResponse("Hospital created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateHospital(@PathVariable Long id, @Valid @RequestBody HospitalDTO dto) {
        Hospital hospital = hospitalRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Hospital not found"));
        hospital.setName(dto.getName());
        hospital.setLocation(dto.getLocation());
        hospital.setGovernorate(dto.getGovernorate());
        hospital.setPhone(dto.getPhone());
        hospital.setEmail(dto.getEmail());
        hospitalRepository.save(hospital);
        return ResponseEntity.ok(new MessageResponse("Hospital updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteHospital(@PathVariable Long id) {
        Hospital hospital = hospitalRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Hospital not found"));
        hospitalRepository.delete(hospital);
        return ResponseEntity.ok(new MessageResponse("Hospital deleted"));
    }
}
