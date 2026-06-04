package com.example.blooddonation.service;

import com.example.blooddonation.entity.WhatsAppDeliveryLog;
import com.example.blooddonation.entity.WhatsAppDeliveryLog.Status;
import com.example.blooddonation.repository.WhatsAppDeliveryLogRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Posts messages to the WhatsApp Node microservice. Best-effort: this class
 * NEVER throws to its callers — failures are logged + persisted to
 * `whatsapp_delivery_log` so donation transactions can complete even if
 * WhatsApp is offline.
 *
 * Phase 13 / audit/13-whatsapp-and-autofill.md.
 *
 * Configuration (override via env):
 *   app.whatsapp.enabled  (default true)   — kill switch
 *   app.whatsapp.url      (default http://127.0.0.1:3001)
 *   app.whatsapp.token    (default empty)  — sent as X-Internal-Token header
 */
@Service
public class WhatsAppClient {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppClient.class);
    private static final int MAX_ERROR_LEN = 500;

    @Value("${app.whatsapp.enabled:true}")
    private boolean enabled;

    @Value("${app.whatsapp.url:http://127.0.0.1:3001}")
    private String serviceUrl;

    @Value("${app.whatsapp.token:}")
    private String internalToken;

    @Autowired
    private WhatsAppDeliveryLogRepository deliveryLogRepository;

    private RestTemplate restTemplate;

    @PostConstruct
    void buildRestTemplate() {
        // Short timeouts so a stuck microservice cannot block donation
        // transactions for more than a few seconds.
        org.springframework.http.client.SimpleClientHttpRequestFactory rf =
                new org.springframework.http.client.SimpleClientHttpRequestFactory();
        rf.setConnectTimeout((int) Duration.ofSeconds(2).toMillis());
        rf.setReadTimeout((int) Duration.ofSeconds(5).toMillis());
        this.restTemplate = new RestTemplate(rf);
        log.info("WhatsAppClient configured (enabled={}, url={})", enabled, serviceUrl);
    }

    /**
     * Send a WhatsApp message. Always returns the persisted log entry; never
     * throws. The caller is expected to fire-and-forget; do not chain DB writes
     * onto the result.
     */
    public WhatsAppDeliveryLog send(String phone, String message, String contextSummary) {
        String last4 = phoneTail(phone);
        WhatsAppDeliveryLog logRow = WhatsAppDeliveryLog.builder()
                .phoneLast4(last4)
                .contextSummary(truncate(contextSummary, 255))
                .build();

        if (!enabled) {
            return persist(logRow, Status.SKIPPED, "DISABLED", "app.whatsapp.enabled=false");
        }
        if (phone == null || phone.isBlank()) {
            return persist(logRow, Status.SKIPPED, "NO_PHONE", "Recipient has no phone number");
        }
        if (message == null || message.isBlank()) {
            return persist(logRow, Status.SKIPPED, "NO_MESSAGE", "Empty message body");
        }

        Map<String, String> body = new HashMap<>();
        body.put("phone", phone);
        body.put("message", message);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (internalToken != null && !internalToken.isBlank()) {
            headers.add("X-Internal-Token", internalToken);
        }
        HttpEntity<Map<String, String>> req = new HttpEntity<>(body, headers);

        String url = serviceUrl.replaceAll("/+$", "") + "/api/whatsapp/send";
        try {
            ResponseEntity<String> resp = restTemplate.postForEntity(url, req, String.class);
            if (resp.getStatusCode().is2xxSuccessful()) {
                return persist(logRow, Status.SENT, null, null);
            }
            // Non-2xx but not exception: defensive branch (RestTemplate normally throws)
            return persist(logRow, Status.FAILED, "HTTP_" + resp.getStatusCode().value(), resp.getBody());
        } catch (HttpStatusCodeException httpErr) {
            // 4xx/5xx from the microservice
            String responseBody = httpErr.getResponseBodyAsString();
            log.warn("WhatsApp send failed ({}): {}", httpErr.getStatusCode(), responseBody);
            return persist(logRow, Status.FAILED, "HTTP_" + httpErr.getStatusCode().value(), responseBody);
        } catch (ResourceAccessException networkErr) {
            // Connect refused, timeout, DNS, etc.
            log.warn("WhatsApp service unreachable at {}: {}", url, networkErr.getMessage());
            return persist(logRow, Status.FAILED, "CONNECT_REFUSED", networkErr.getMessage());
        } catch (Exception unexpected) {
            log.warn("Unexpected WhatsApp send error", unexpected);
            return persist(logRow, Status.FAILED, "EXCEPTION",
                    unexpected.getClass().getSimpleName() + ": " + unexpected.getMessage());
        }
    }

    // ------------------- helpers -------------------

    private WhatsAppDeliveryLog persist(WhatsAppDeliveryLog row, Status status, String code, String msg) {
        row.setStatus(status);
        row.setErrorCode(code);
        row.setErrorMessage(truncate(msg, MAX_ERROR_LEN));
        try {
            return deliveryLogRepository.save(row);
        } catch (Exception persistErr) {
            // Log persistence itself should never break a caller. Log and move on.
            log.warn("Could not persist WhatsApp delivery log row: {}", persistErr.getMessage());
            return row;
        }
    }

    private static String phoneTail(String phone) {
        if (phone == null) return null;
        String digits = phone.replaceAll("\\D", "");
        return digits.length() <= 4 ? digits : digits.substring(digits.length() - 4);
    }

    private static String truncate(String s, int maxLen) {
        if (s == null) return null;
        return s.length() <= maxLen ? s : s.substring(0, maxLen);
    }
}
