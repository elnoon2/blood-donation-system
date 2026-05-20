package com.example.blooddonation.util;

import java.util.*;

public class BloodCompatibilityUtil {

    private static final Map<String, List<String>> COMPATIBILITY_MAP = new HashMap<>();

    static {
        // Key is the Patient (Recipient) Blood Type
        // Value is the List of compatible Donor Blood Types
        COMPATIBILITY_MAP.put("A+", Arrays.asList("A+", "A-", "O+", "O-"));
        COMPATIBILITY_MAP.put("A-", Arrays.asList("A-", "O-"));
        COMPATIBILITY_MAP.put("B+", Arrays.asList("B+", "B-", "O+", "O-"));
        COMPATIBILITY_MAP.put("B-", Arrays.asList("B-", "O-"));
        COMPATIBILITY_MAP.put("AB+", Arrays.asList("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")); // Universal Recipient
        COMPATIBILITY_MAP.put("AB-", Arrays.asList("AB-", "A-", "B-", "O-"));
        COMPATIBILITY_MAP.put("O+", Arrays.asList("O+", "O-"));
        COMPATIBILITY_MAP.put("O-", Arrays.asList("O-")); // Universal Donor (can give to anyone, but only receive from O-)
    }

    public static List<String> getCompatibleDonorTypes(String recipientType) {
        if (recipientType == null || recipientType.isBlank()) {
            return Collections.emptyList();
        }
        return COMPATIBILITY_MAP.getOrDefault(recipientType.toUpperCase().trim(), Collections.singletonList(recipientType));
    }

    public static boolean canDonate(String donorBloodType, String receiverBloodType) {
        if (donorBloodType == null || receiverBloodType == null || donorBloodType.isBlank() || receiverBloodType.isBlank()) {
            return false;
        }
        List<String> compatibleDonors = getCompatibleDonorTypes(receiverBloodType);
        return compatibleDonors.contains(donorBloodType.toUpperCase().trim());
    }
}
