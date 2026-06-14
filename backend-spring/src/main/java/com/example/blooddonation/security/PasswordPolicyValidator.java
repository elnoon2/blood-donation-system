package com.example.blooddonation.security;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.util.Set;

/**
 * NIST SP 800-63B-aligned password policy.
 *
 * Allows long passphrases without composition rules; rejects passwords below
 * the minimum length, common dictionary patterns, and the few values that have
 * actually been used as defaults inside this codebase.
 *
 * Use as a jakarta.validation constraint on the RegisterRequest.password field.
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PasswordPolicyValidator.Impl.class)
public @interface PasswordPolicyValidator {

    String message() default "Password must be at least 8 characters and not a common / leaked value.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};

    // Phase 16: relaxed from 12 → 8 chars. The original (pre-audit) project
    // allowed 6 chars; Phase 9 jumped to 12 (NIST 800-63B recommendation) but
    // that broke registration for everyone with shorter existing passwords.
    // 8 is a compromise: still meaningfully secure against trivial guessing
    // (>200 trillion combinations for alphanumeric+symbols), still allows
    // common values like "nour1234". Denylist + repeated-char check still
    // active. Production hardening (HIBP API, optional 12-char minimum via
    // env) is a future task.
    int MIN_LENGTH = 8;
    int MAX_LENGTH = 128;

    /** Tiny embedded denylist. A production deploy should add HIBP API check. */
    Set<String> DENYLIST = Set.of(
        "password", "password123", "password1234", "qwerty12345", "111111111111",
        "123456789012", "letmein12345", "admin1234567", "nour12345", "nour123456",
        "blood1234567", "donation1234"
    );

    class Impl implements ConstraintValidator<PasswordPolicyValidator, String> {
        @Override
        public boolean isValid(String value, ConstraintValidatorContext ctx) {
            if (value == null) return false;
            if (value.length() < MIN_LENGTH) {
                fail(ctx, "Password must be at least " + MIN_LENGTH + " characters.");
                return false;
            }
            if (value.length() > MAX_LENGTH) {
                fail(ctx, "Password must not exceed " + MAX_LENGTH + " characters.");
                return false;
            }
            String lower = value.toLowerCase();
            if (DENYLIST.contains(lower)) {
                fail(ctx, "This password is in the common-passwords denylist.");
                return false;
            }
            // Reject sequences like aaaaaaaaaaaaa or 111111111111
            if (lower.matches("^(.)\\1{" + (MIN_LENGTH - 1) + ",}$")) {
                fail(ctx, "Password cannot be a single repeated character.");
                return false;
            }
            return true;
        }

        private void fail(ConstraintValidatorContext ctx, String msg) {
            ctx.disableDefaultConstraintViolation();
            ctx.buildConstraintViolationWithTemplate(msg).addConstraintViolation();
        }
    }
}
