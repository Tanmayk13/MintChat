package com.dev.mintchat.repository;

import com.dev.mintchat.entity.Chat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ChatRepository extends JpaRepository<Chat, Long> {
    Optional<Chat> findByUser1IdAndUser2Id(Long u1, Long u2);
}
