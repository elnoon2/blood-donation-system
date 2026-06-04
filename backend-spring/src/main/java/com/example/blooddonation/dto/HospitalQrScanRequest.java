package com.example.blooddonation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class HospitalQrScanRequest {
    @NotBlank(message = "secureSignedToken is required")
    private String secureSignedToken;
}
