package com.example.blooddonation.repository;

import com.example.blooddonation.entity.Notification;
import com.example.blooddonation.enums.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Phase 12: list queries filter cleared_at IS NULL so soft-cleared
    // notifications stay in DB but disappear from the user's panel.
    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId AND n.clearedAt IS NULL ORDER BY n.sentAt DESC")
    List<Notification> findByUserIdOrderBySentAtDesc(@Param("userId") Long userId);

    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId AND n.clearedAt IS NULL ORDER BY n.sentAt DESC")
    List<Notification> findByUserIdOrderBySentAtDesc(@Param("userId") Long userId, Pageable pageable);

    @Modifying
    @Query("update Notification n set n.isRead = true where n.user.id = :userId and n.isRead = false and n.clearedAt is null")
    int markAllReadByUserId(@Param("userId") Long userId);

    /**
     * Phase 12: soft-clear all of a user's currently-visible notifications.
     * The rows stay in the DB; only `cleared_at` is set so list queries hide
     * them. Returns the number of rows updated.
     */
    @Modifying
    @Query("update Notification n set n.clearedAt = :now where n.user.id = :userId and n.clearedAt is null")
    int softClearByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /** Legacy hard-delete -- kept for admin / data-retention jobs. Not used by clearAll anymore. */
    long deleteByUserId(Long userId);

    // Dedupe MUST see all rows (including cleared) so the same alert isn't
    // re-issued five minutes after a user clears it.
    @Query("SELECT count(n.id) > 0 FROM Notification n WHERE n.user.id = :userId AND n.message LIKE :message AND n.type = :type AND n.sentAt > :sentAt")
    boolean existsDuplicateNotification(@Param("userId") Long userId,
                                        @Param("message") String message,
                                        @Param("type") NotificationType type,
                                        @Param("sentAt") LocalDateTime sentAt);
}
