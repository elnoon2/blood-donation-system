package com.example.blooddonation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class BloodRequestDTO {
    @NotNull
    @Positive
    private Integer quantityNeeded;

    @NotBlank
    private String bloodType;

    @NotBlank
    private String governorate;

    @NotBlank
    private String phone;

    private Double requesterLatitude;

    private Double requesterLongitude;

    private String requesterMapLink;

    private Long hospitalId;

    @NotBlank(message = "Patient name is required")
    private String patientName;

    @NotBlank(message = "Urgency level is required")
    private String urgencyLevel;

    @NotNull(message = "Bags needed is required")
    @Positive(message = "Bags needed must be greater than zero")
    private Integer bagsNeeded;
}
