package com.example.blooddonation.config;

import com.example.blooddonation.entity.Donor;
import com.example.blooddonation.entity.Hospital;
import com.example.blooddonation.entity.User;
import com.example.blooddonation.enums.Role;
import com.example.blooddonation.repository.DonorRepository;
import com.example.blooddonation.repository.HospitalRepository;
import com.example.blooddonation.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Component
@ConditionalOnProperty(name = "app.seed-demo.enabled", havingValue = "true")
public class DevDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    private final UserRepository userRepository;
    private final DonorRepository donorRepository;
    private final HospitalRepository hospitalRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed-demo.password:nour1234}")
    private String demoPassword;

    public DevDataSeeder(
            UserRepository userRepository,
            DonorRepository donorRepository,
            HospitalRepository hospitalRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.donorRepository = donorRepository;
        this.hospitalRepository = hospitalRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedHospitals();
        seedUser("Admin User", "nourelkassyamin15@gmail.com", Role.ADMIN, "O+", "Cairo", "0123456789", "ADM-001", true, false);
        User donorUser = seedUser("John Donor", "donor@example.com", Role.DONOR, "A+", "Alexandria", "0111111111", null, true, true);
        seedUser("Sarah Patient", "patient@example.com", Role.PATIENT, "B-", "Giza", "0122222222", null, true, false);
        if (donorUser != null) {
            seedDonorProfile(donorUser);
        }
    }

    private void seedHospitals() {
        if (hospitalRepository.count() > 0) {
            return;
        }
        hospitalRepository.save(Hospital.builder()
                .name("Kasr Al-Ainy").location("Garden City").governorate("Cairo")
                .phone("02-1234567").email("info@kasralainy.edu.eg").build());
        hospitalRepository.save(Hospital.builder()
                .name("Ain Shams University Hospital").location("Abbassia").governorate("Cairo")
                .phone("02-7654321").email("contact@asu.edu.eg").build());
        hospitalRepository.save(Hospital.builder()
                .name("Maadi Military Hospital").location("Maadi").governorate("Cairo")
                .phone("02-1111111").email("maadi@mil.eg").build());
        log.info("Seeded {} demo hospitals", hospitalRepository.count());
    }

    private User seedUser(String name, String email, Role role, String bloodType,
            String governorate, String phone, String medicalId, boolean approved, boolean logCreated) {
        if (userRepository.existsByEmail(email)) {
            return userRepository.findByEmail(email).orElse(null);
        }
        User saved = userRepository.save(User.builder()
                .name(name).email(email).password(passwordEncoder.encode(demoPassword))
                .bloodType(bloodType).governorate(governorate).phone(phone)
                .medicalId(medicalId).role(role).isApproved(approved).build());
        if (logCreated) {
            log.info("Seeded demo {} account for email={}", role, email);
        }
        return saved;
    }

    private void seedDonorProfile(User donorUser) {
        if (donorRepository.findByUserId(donorUser.getId()).isPresent()) {
            return;
        }
        donorRepository.save(Donor.builder()
                .user(donorUser).lastDonationDate(LocalDate.of(2026, 1, 1))
                .availabilityStatus("AVAILABLE").latitude(31.2001).longitude(29.9187)
                .totalDonations(5).weight(75.0).age(30).active(true).suspended(false).build());
        log.info("Seeded donor profile for email={}", donorUser.getEmail());
    }
}
