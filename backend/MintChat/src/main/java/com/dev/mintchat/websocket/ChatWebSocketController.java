package com.dev.mintchat.websocket;

import com.dev.mintchat.dto.ChatMessageDTO;
import com.dev.mintchat.dto.TypingDTO;
import com.dev.mintchat.entity.Message;
import com.dev.mintchat.repository.UserRepository;
import com.dev.mintchat.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final MessageService messageService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.send")
    public void sendMessage(ChatMessageDTO dto, SimpMessageHeaderAccessor headerAccessor) {

        String username = (String) headerAccessor.getSessionAttributes().get("username");
        if (username == null) {
            return; // unauthenticated; ignore
        }

        Long senderId = userRepository.findByUsername(username)
                .map(u -> u.getId())
                .orElse(null);

        if (senderId == null) {
            return;
        }

        Message saved = messageService.saveMessage(
                dto.getChatId(),
                senderId,
                dto.getContent()
        );

        messagingTemplate.convertAndSend(
                "/topic/chat/" + dto.getChatId(),
                saved
        );
    }

    @MessageMapping("/chat.typing")
    public void typing(TypingDTO dto, SimpMessageHeaderAccessor headerAccessor) {

        String username = (String) headerAccessor.getSessionAttributes().get("username");
        if (username == null) {
            return;
        }

        // Prefer the authenticated username; ignore client-provided value
        dto.setUsername(username);

        if (dto.getTyping() == null) {
            dto.setTyping(false);
        }

        messagingTemplate.convertAndSend(
                "/topic/typing/" + dto.getChatId(),
                dto
        );
    }
}

