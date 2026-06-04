package com.example.blooddonation.repository;

import com.example.blooddonation.entity.WhatsAppDeliveryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WhatsAppDeliveryLogRepository extends JpaRepository<WhatsAppDeliveryLog, Long> {
}
