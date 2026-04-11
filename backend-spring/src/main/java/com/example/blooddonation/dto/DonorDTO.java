package com.example.blooddonation.dto;

import lombok.Data;

@Data
public class DonorDTO {
    private String governorate;
    private String phone;
    private String availabilityStatus;
    private String lastDonationDate;
}
