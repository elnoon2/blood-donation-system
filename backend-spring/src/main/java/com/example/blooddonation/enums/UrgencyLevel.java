package com.example.blooddonation.enums;

import java.util.Set;

/**
 * Urgency levels for blood requests. Mirrors the V3 schema CHECK constraint.
 * Used as a validation whitelist; column type migration deferred (see
 * BloodType comment).
 */
public enum UrgencyLevel {
    NORMAL, URGENT, CRITICAL;

    public static final Set<String> LABELS = Set.of("NORMAL", "URGENT", "CRITICAL");

    public static boolean isValid(String label) {
        return label != null && LABELS.contains(label.trim().toUpperCase());
    }
}
