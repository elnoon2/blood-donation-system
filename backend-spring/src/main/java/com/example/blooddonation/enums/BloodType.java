package com.example.blooddonation.enums;

import java.util.Set;

/**
 * The eight ABO/Rh blood types. Used as a validation whitelist; the database
 * column remains VARCHAR2 (string) so the existing rows are not invalidated by
 * a type change. Migrate the entity columns to @Enumerated(EnumType.STRING)
 * once the schema-level CHECK constraint (V3) has been verified clean against
 * production data.
 */
public enum BloodType {
    O_POS("O+"), O_NEG("O-"),
    A_POS("A+"), A_NEG("A-"),
    B_POS("B+"), B_NEG("B-"),
    AB_POS("AB+"), AB_NEG("AB-");

    private final String label;
    public static final Set<String> LABELS = Set.of(
        "O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"
    );

    BloodType(String label) { this.label = label; }
    public String label() { return label; }

    public static boolean isValid(String label) {
        return label != null && LABELS.contains(label.trim().toUpperCase());
    }

    public static BloodType fromLabel(String label) {
        if (label == null) return null;
        String norm = label.trim().toUpperCase();
        for (BloodType b : values()) {
            if (b.label.equals(norm)) return b;
        }
        throw new IllegalArgumentException("Unknown blood type: " + label);
    }
}
