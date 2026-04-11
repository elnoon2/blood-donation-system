package com.example.blooddonation.dto;

import com.example.blooddonation.entity.Request;
import lombok.Data;

import java.time.LocalDate;

@Data
public class RequestResponseDTO {
    private Long id;
    private String bloodType;
    private Integer quantityNeeded;
    private String governorate;
    private String phone;
    private Double requesterLatitude;
    private Double requesterLongitude;
    private String requesterMapLink;
    private String status;
    private Boolean donorConfirmed;
    private Boolean patientConfirmed;
    private LocalDate requestDate;
    private Long userId;
    private String userName;

    public static RequestResponseDTO from(Request r) {
        RequestResponseDTO dto = new RequestResponseDTO();
        dto.setId(r.getId());
        dto.setBloodType(r.getBloodType());
        dto.setQuantityNeeded(r.getQuantityNeeded());
        dto.setGovernorate(r.getGovernorate());
        dto.setPhone(r.getPhone());
        dto.setRequesterLatitude(r.getRequesterLatitude());
        dto.setRequesterLongitude(r.getRequesterLongitude());
        dto.setRequesterMapLink(r.getRequesterMapLink());
        dto.setStatus(r.getStatus().name());
        dto.setDonorConfirmed(Boolean.TRUE.equals(r.getDonorConfirmed()));
        dto.setPatientConfirmed(Boolean.TRUE.equals(r.getPatientConfirmed()));
        dto.setRequestDate(r.getRequestDate());
        if (r.getUser() != null) {
            dto.setUserId(r.getUser().getId());
            dto.setUserName(r.getUser().getName());
        }
        return dto;
    }
}
