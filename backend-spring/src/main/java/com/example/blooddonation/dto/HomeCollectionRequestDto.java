package com.example.blooddonation.dto;

import com.example.blooddonation.enums.CollectionRequestStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class HomeCollectionRequestDto {
    private Long id;
    private String fullAddress;
    private String governorate;
    private String city;
    private String phone;
    private LocalDate preferredDate;
    private String preferredTime;
    private String reasonForHomeCollection;
    private String medicalNotes;
    private CollectionRequestStatus status;
    private LocalDateTime createdAt;
}
