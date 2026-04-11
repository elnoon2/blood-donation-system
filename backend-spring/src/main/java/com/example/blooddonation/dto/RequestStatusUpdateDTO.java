package com.example.blooddonation.dto;

import lombok.Data;

@Data
public class RequestStatusUpdateDTO {
    private String status;
    private Boolean donorConfirmed;
    private Boolean patientConfirmed;
}
