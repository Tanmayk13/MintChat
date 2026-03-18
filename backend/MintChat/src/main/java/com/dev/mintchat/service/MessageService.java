package com.dev.mintchat.service;

import com.dev.mintchat.entity.Message;
import com.dev.mintchat.entity.MessageStatus;
import com.dev.mintchat.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;

    public Message saveMessage(Long chatId, Long senderId, String content) {

        Message message = Message.builder()
                .chatId(chatId)
                .senderId(senderId)
                .content(content)
                .timestamp(LocalDateTime.now())
                .status(MessageStatus.SENT)
                .build();

        return messageRepository.save(message);
    }

    public Page<Message> getMessages(Long chatId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        return messageRepository.findByChatId(chatId, pageable);
    }
}
