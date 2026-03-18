package com.dev.mintchat.controller;

import com.dev.mintchat.entity.Message;
import com.dev.mintchat.repository.UserRepository;
import com.dev.mintchat.service.ChatService;
import com.dev.mintchat.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final ChatService chatService;
    private final UserRepository userRepository;

    @GetMapping("/{chatId}")
    public ResponseEntity<Page<Message>> getMessages(
            @PathVariable Long chatId,
            @RequestParam int page,
            @RequestParam int size
    ) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userRepository.findByUsername(username).map(u -> u.getId()).orElse(null);

        if (userId == null || !chatService.isParticipant(chatId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(messageService.getMessages(chatId, page, size));
    }
}
