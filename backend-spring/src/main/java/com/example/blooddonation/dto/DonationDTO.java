package com.example.blooddonation.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DonationDTO {

    @NotNull
    private Long hospitalId;

    @NotNull
    private Integer quantity;
}
