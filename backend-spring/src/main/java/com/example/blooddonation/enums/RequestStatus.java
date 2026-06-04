package com.example.blooddonation.enums;

public enum RequestStatus {
    PENDING,
    ACCEPTED,
    IN_PROGRESS,
    COMPLETED,
    REJECTED,
    CANCELLED,
    @Deprecated UNDER_REVIEW,
    @Deprecated HOSPITAL_CONFIRMED,
    @Deprecated MATCHED_DONOR,
    @Deprecated DONATION_COMPLETED
}
