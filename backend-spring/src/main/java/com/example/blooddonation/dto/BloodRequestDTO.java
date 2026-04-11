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
}
