package com.example.blooddonation.controller;

import com.example.blooddonation.dto.MessageResponse;
import com.example.blooddonation.entity.BloodInventory;
import com.example.blooddonation.exception.ResourceNotFoundException;
import com.example.blooddonation.repository.BloodInventoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {
    
    @Autowired
    BloodInventoryRepository inventoryRepository;

    @GetMapping
    public List<BloodInventory> getAllInventory() {
        return inventoryRepository.findAll();
    }

    @GetMapping("/hospital/{hospitalId}")
    public List<BloodInventory> getByHospital(@PathVariable Long hospitalId) {
        return inventoryRepository.findByHospitalId(hospitalId);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateInventory(@PathVariable Long id, @RequestParam Integer units) {
        BloodInventory inventory = inventoryRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Inventory not found"));
        inventory.setUnitsAvailable(units);
        inventoryRepository.save(inventory);
        return ResponseEntity.ok(new MessageResponse("Inventory updated"));
    }
}
