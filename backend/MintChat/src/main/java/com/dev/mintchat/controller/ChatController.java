package com.dev.mintchat.controller;

import com.dev.mintchat.entity.Chat;
import com.dev.mintchat.repository.UserRepository;
import com.dev.mintchat.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final UserRepository userRepository;

    @PostMapping("/create")
    public ResponseEntity<Chat> createChat(@RequestParam Long userA,
                                           @RequestParam Long userB) {

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long currentUserId = userRepository.findByUsername(username).map(u -> u.getId()).orElse(null);

        if (currentUserId == null || (currentUserId != userA && currentUserId != userB)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(chatService.createChat(userA, userB));
    }
}
