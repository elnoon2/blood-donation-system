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
    private String verificationCode;
    private Long hospitalId;
    private String hospitalName;
    private String patientName;
    private Integer bagsNeeded;
    private String urgencyLevel;
    private Integer confirmedDonors;

    public static RequestResponseDTO from(Request r, com.example.blooddonation.entity.User currentUser) {
        RequestResponseDTO dto = new RequestResponseDTO();
        dto.setId(r.getId());
        dto.setBloodType(r.getBloodType());
        dto.setQuantityNeeded(r.getQuantityNeeded());
        dto.setGovernorate(r.getGovernorate());
        dto.setStatus(r.getStatus() != null ? r.getStatus().name() : "PENDING");
        dto.setDonorConfirmed(Boolean.TRUE.equals(r.getDonorConfirmed()));
        dto.setPatientConfirmed(Boolean.TRUE.equals(r.getPatientConfirmed()));
        dto.setRequestDate(r.getRequestDate());
        dto.setPatientName(r.getPatientName());
        dto.setBagsNeeded(r.getBagsNeeded());
        dto.setUrgencyLevel(r.getUrgencyLevel());
        dto.setConfirmedDonors(r.getConfirmedDonors() != null ? r.getConfirmedDonors() : 0);
        
        boolean canSeeDetails = false;
        if (currentUser != null) {
            com.example.blooddonation.enums.Role role = currentUser.getRole();
            if (role == com.example.blooddonation.enums.Role.ADMIN || role == com.example.blooddonation.enums.Role.HOSPITAL) {
                canSeeDetails = true;
            } else if (r.getUser() != null && r.getUser().getId().equals(currentUser.getId())) {
                canSeeDetails = true;
            } else if (r.getStatus() == com.example.blooddonation.enums.RequestStatus.MATCHED_DONOR || r.getStatus() == com.example.blooddonation.enums.RequestStatus.DONATION_COMPLETED) {
                canSeeDetails = true; // allow donor to see details if matched
            }
        }

        if (canSeeDetails) {
            dto.setPhone(r.getPhone());
            dto.setRequesterLatitude(r.getRequesterLatitude());
            dto.setRequesterLongitude(r.getRequesterLongitude());
            dto.setRequesterMapLink(r.getRequesterMapLink());
            dto.setVerificationCode(r.getVerificationCode());
            if (r.getUser() != null) {
                dto.setUserId(r.getUser().getId());
                dto.setUserName(r.getUser().getName());
            }
        } else {
            // Mask details
            dto.setPhone("Hidden (Hospital Review)");
            if (r.getUser() != null) {
                dto.setUserName("Patient at " + (r.getHospital() != null ? r.getHospital().getName() : "Hospital"));
            }
        }

        if (r.getHospital() != null) {
            dto.setHospitalId(r.getHospital().getId());
            dto.setHospitalName(r.getHospital().getName());
        }
        return dto;
    }
}
