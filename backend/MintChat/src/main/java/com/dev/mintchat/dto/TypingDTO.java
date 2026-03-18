package com.dev.mintchat.dto;

import lombok.Data;

@Data
public class TypingDTO {
    private Long chatId;
    private String username;
    private Boolean typing;
}
