package com.example.blooddonation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank
    @Size(min = 3, max = 50)
    private String name;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 6, max = 40)
    private String password;


    private String bloodType;

    @NotBlank
    private String governorate;

    @NotBlank
    private String phone;

    @NotBlank
    private String role; // "DONOR", "PATIENT", or "HOSPITAL"

    private Long hospitalId; // Required if role is HOSPITAL
}
