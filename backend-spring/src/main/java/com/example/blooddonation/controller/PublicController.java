package com.example.blooddonation.controller;

import com.example.blooddonation.dto.PublicStatsDTO;
import com.example.blooddonation.repository.DonationRepository;
import com.example.blooddonation.repository.DonorRepository;
import com.example.blooddonation.repository.HospitalRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private static final Logger log = LoggerFactory.getLogger(PublicController.class);

    @Autowired DonorRepository donorRepository;
    @Autowired HospitalRepository hospitalRepository;
    @Autowired DonationRepository donationRepository;

    /**
     * Phase 13.1: frontend port used to compose the recommended QR base URL.
     * Defaults to 5173 (Vite dev server). Override via FRONTEND_PORT env var
     * if the SPA is served from a non-default port.
     */
    @Value("${app.frontend.port:5173}")
    private int frontendPort;

    /**
     * Phase 13.1: optional explicit override. If set, returned verbatim as the
     * recommended QR base URL. Use this in production to point at the real
     * domain (e.g. https://lifeflow.example.com).
     */
    @Value("${app.frontend.public-url:}")
    private String configuredPublicUrl;

    @GetMapping("/stats")
    public ResponseEntity<PublicStatsDTO> getPublicStats() {
        long totalDonors = donorRepository.count();
        long totalHospitals = hospitalRepository.count();
        long totalDonations = donationRepository.count();
        long totalLivesSaved = totalDonations * 3;

        PublicStatsDTO stats = PublicStatsDTO.builder()
                .totalDonors(totalDonors)
                .totalHospitals(totalHospitals)
                .totalLivesSaved(totalLivesSaved)
                .build();

        return ResponseEntity.ok(stats);
    }

    /**
     * Phase 13.1: server-info endpoint. Returns the recommended public base
     * URL that QRs should embed. The frontend's `publicBaseUrl()` calls this
     * as a third-priority fallback when (a) `VITE_PUBLIC_BASE_URL` is unset
     * AND (b) the browser is on localhost — both common dev defaults that
     * would otherwise produce a QR no phone can scan.
     *
     * Priority:
     *   1. `app.frontend.public-url` (operator-configured prod domain)
     *   2. First non-loopback IPv4 of the backend host, paired with
     *      `app.frontend.port` (works for the standard dev setup where
     *      Vite is on the same machine as the backend)
     *   3. Fallback: empty `publicBaseUrl` — caller keeps using localhost.
     *
     * Intentionally lives under `/api/public/**` so it's reachable without
     * authentication. Returns ONLY the public URL — no internal hostnames,
     * no MAC, no private network details.
     */
    @GetMapping("/server-info")
    public ResponseEntity<Map<String, Object>> getServerInfo() {
        Map<String, Object> body = new HashMap<>();
        if (configuredPublicUrl != null && !configuredPublicUrl.isBlank()) {
            body.put("publicBaseUrl", stripTrailingSlash(configuredPublicUrl.trim()));
            body.put("source", "configured");
            body.put("interfaceName", "");
            body.put("interfaceDisplayName", "");
            return ResponseEntity.ok(body);
        }
        DetectedAddress detected = detectPrimaryLanIp();
        if (detected != null) {
            body.put("publicBaseUrl", "http://" + detected.ip + ":" + frontendPort);
            body.put("source", "auto-detected");
            body.put("interfaceName", detected.interfaceName);
            body.put("interfaceDisplayName", detected.interfaceDisplayName);
            return ResponseEntity.ok(body);
        }
        body.put("publicBaseUrl", "");
        body.put("source", "unknown");
        body.put("interfaceName", "");
        body.put("interfaceDisplayName", "");
        return ResponseEntity.ok(body);
    }

    /**
     * Phase 13.2: smarter NIC selection. The previous implementation grabbed
     * the first non-loopback IPv4 it found, which on a Windows machine with
     * Docker Desktop installed picks `vEthernet (WSL)` → 172.19.0.1 — a
     * virtual adapter the phone cannot route to. We now:
     *
     *   1. Skip interfaces whose name/displayName matches known virtual
     *      adapter patterns (vEthernet, Docker, WSL, VMware, etc).
     *   2. Score remaining IPv4 candidates by likelihood of being a real
     *      reachable address: 192.168.x.x (100), 10.x.x.x (80), public (60),
     *      172.16-31.x.x (20).
     *   3. Tiebreak by display-name match against "Wi-Fi" / "Wireless" / "WLAN".
     *   4. Return the highest-scoring address, or null if every interface
     *      was virtual / nothing scored.
     */
    private DetectedAddress detectPrimaryLanIp() {
        DetectedAddress best = null;
        int bestScore = -1;
        boolean bestIsWireless = false;
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface iface = interfaces.nextElement();
                if (!iface.isUp() || iface.isLoopback()) continue;

                String name = iface.getName() == null ? "" : iface.getName();
                String displayName = iface.getDisplayName() == null ? "" : iface.getDisplayName();
                if (isVirtualInterfaceName(name) || isVirtualInterfaceName(displayName)) {
                    continue;
                }
                boolean wireless = isWirelessInterfaceName(name) || isWirelessInterfaceName(displayName);

                Enumeration<InetAddress> addrs = iface.getInetAddresses();
                while (addrs.hasMoreElements()) {
                    InetAddress addr = addrs.nextElement();
                    if (addr.isLoopbackAddress() || addr.isLinkLocalAddress()) continue;
                    String host = addr.getHostAddress();
                    if (host == null || host.contains(":")) continue; // IPv4 only

                    int score = scoreIpv4(host);
                    if (score < 0) continue;

                    boolean replace = false;
                    if (score > bestScore) {
                        replace = true;
                    } else if (score == bestScore) {
                        // Tiebreaker: prefer wireless
                        if (wireless && !bestIsWireless) replace = true;
                    }
                    if (replace) {
                        bestScore = score;
                        bestIsWireless = wireless;
                        best = new DetectedAddress(host, name, displayName);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not enumerate network interfaces: {}", e.getMessage());
        }
        if (best != null) {
            log.info("LAN-IP autodetect picked {} on '{}' (score {}, wireless={})",
                    best.ip, best.interfaceDisplayName, bestScore, bestIsWireless);
        } else {
            log.info("LAN-IP autodetect found no scoreable non-virtual interface");
        }
        return best;
    }

    private static final String[] VIRTUAL_INTERFACE_PATTERNS = {
        "vEthernet", "Docker", "WSL", "VirtualBox", "VMware", "Hyper-V",
        "vmnet", "vboxnet", "tap", "tun", "bridge", "Default Switch", "Loopback"
    };

    private static boolean isVirtualInterfaceName(String s) {
        if (s == null || s.isEmpty()) return false;
        String lower = s.toLowerCase(java.util.Locale.ROOT);
        for (String pattern : VIRTUAL_INTERFACE_PATTERNS) {
            if (lower.contains(pattern.toLowerCase(java.util.Locale.ROOT))) return true;
        }
        return false;
    }

    private static final String[] WIRELESS_INTERFACE_PATTERNS = {
        "wi-fi", "wifi", "wireless", "wlan"
    };

    private static boolean isWirelessInterfaceName(String s) {
        if (s == null || s.isEmpty()) return false;
        String lower = s.toLowerCase(java.util.Locale.ROOT);
        for (String pattern : WIRELESS_INTERFACE_PATTERNS) {
            if (lower.contains(pattern)) return true;
        }
        return false;
    }

    /**
     * Score an IPv4 address by likelihood of being the right one to embed
     * in a QR code that a phone on the same Wi-Fi will scan.
     *  - 192.168.x.x  → 100 (home Wi-Fi default)
     *  - 10.x.x.x     → 80  (corporate/shared LAN)
     *  - public IPv4  → 60  (real internet-facing)
     *  - 172.16-31.x  → 20  (Docker default range; deprioritise)
     *  - anything else (shouldn't happen) → -1 (excluded)
     */
    private static int scoreIpv4(String ip) {
        if (ip == null) return -1;
        String[] parts = ip.split("\\.");
        if (parts.length != 4) return -1;
        try {
            int a = Integer.parseInt(parts[0]);
            int b = Integer.parseInt(parts[1]);
            if (a == 192 && b == 168) return 100;
            if (a == 10) return 80;
            if (a == 172 && b >= 16 && b <= 31) return 20;
            // Not RFC1918 → assume public IPv4
            if (a >= 1 && a <= 223 && a != 127) return 60;
        } catch (NumberFormatException ignore) {
            // fall through
        }
        return -1;
    }

    private static String stripTrailingSlash(String s) {
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }

    /** Tuple struct for the detection result. */
    private static final class DetectedAddress {
        final String ip;
        final String interfaceName;
        final String interfaceDisplayName;
        DetectedAddress(String ip, String name, String displayName) {
            this.ip = ip;
            this.interfaceName = name;
            this.interfaceDisplayName = displayName;
        }
    }
}
