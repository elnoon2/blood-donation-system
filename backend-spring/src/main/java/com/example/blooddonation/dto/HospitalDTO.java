package com.example.blooddonation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class HospitalDTO {
    @NotBlank
    private String name;

    @NotBlank
    private String location;

    private String governorate;

    private String phone;

    @Email
    private String email;
}
