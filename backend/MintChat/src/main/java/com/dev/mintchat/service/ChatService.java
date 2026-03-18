package com.dev.mintchat.service;

import com.dev.mintchat.entity.Chat;
import com.dev.mintchat.repository.ChatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRepository chatRepository;

    public Chat createChat(Long userA, Long userB) {

        Long user1 = Math.min(userA, userB);
        Long user2 = Math.max(userA, userB);

        return chatRepository
                .findByUser1IdAndUser2Id(user1, user2)
                .orElseGet(() -> {
                    Chat chat = Chat.builder()
                            .user1Id(user1)
                            .user2Id(user2)
                            .build();
                    return chatRepository.save(chat);
                });
    }

    public boolean isParticipant(Long chatId, Long userId) {
        return chatRepository.findById(chatId)
                .map(chat -> chat.getUser1Id().equals(userId) || chat.getUser2Id().equals(userId))
                .orElse(false);
    }
}
