package com.example.blooddonation.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.*;

class BloodCompatibilityUtilTest {

    @ParameterizedTest(name = "{0} -> {1} = {2}")
    @CsvSource({
        // Every cell of the 8x8 ABO/Rh compatibility matrix.
        // Donor, Receiver, expected (can donor give to receiver?)
        "O-,O-,true",  "O-,O+,true",  "O-,A-,true",  "O-,A+,true",  "O-,B-,true",  "O-,B+,true",  "O-,AB-,true", "O-,AB+,true",
        "O+,O-,false", "O+,O+,true",  "O+,A-,false", "O+,A+,true",  "O+,B-,false", "O+,B+,true",  "O+,AB-,false","O+,AB+,true",
        "A-,O-,false", "A-,O+,false", "A-,A-,true",  "A-,A+,true",  "A-,B-,false", "A-,B+,false", "A-,AB-,true", "A-,AB+,true",
        "A+,O-,false", "A+,O+,false", "A+,A-,false", "A+,A+,true",  "A+,B-,false", "A+,B+,false", "A+,AB-,false","A+,AB+,true",
        "B-,O-,false", "B-,O+,false", "B-,A-,false", "B-,A+,false", "B-,B-,true",  "B-,B+,true",  "B-,AB-,true", "B-,AB+,true",
        "B+,O-,false", "B+,O+,false", "B+,A-,false", "B+,A+,false", "B+,B-,false", "B+,B+,true",  "B+,AB-,false","B+,AB+,true",
        "AB-,O-,false","AB-,O+,false","AB-,A-,false","AB-,A+,false","AB-,B-,false","AB-,B+,false","AB-,AB-,true","AB-,AB+,true",
        "AB+,O-,false","AB+,O+,false","AB+,A-,false","AB+,A+,false","AB+,B-,false","AB+,B+,false","AB+,AB-,false","AB+,AB+,true"
    })
    void canDonateMatrix(String donor, String receiver, boolean expected) {
        assertEquals(expected, BloodCompatibilityUtil.canDonate(donor, receiver),
            donor + " -> " + receiver);
    }

    @Test
    void compatibleDonorTypesForUniversalRecipient() {
        assertEquals(8, BloodCompatibilityUtil.getCompatibleDonorTypes("AB+").size(),
            "AB+ is universal recipient and should accept all 8 ABO/Rh types");
    }

    @Test
    void compatibleDonorTypesForUniversalDonor() {
        // O- can only RECEIVE from O-.
        assertEquals(java.util.List.of("O-"), BloodCompatibilityUtil.getCompatibleDonorTypes("O-"));
    }

    @Test
    void normalisesCaseAndWhitespace() {
        assertTrue(BloodCompatibilityUtil.canDonate(" o- ", "ab+"));
    }

    @Test
    void nullsAndBlanksReturnFalse() {
        assertFalse(BloodCompatibilityUtil.canDonate(null, "A+"));
        assertFalse(BloodCompatibilityUtil.canDonate("A+", null));
        assertFalse(BloodCompatibilityUtil.canDonate("", "A+"));
        assertTrue(BloodCompatibilityUtil.getCompatibleDonorTypes("").isEmpty());
    }
}
