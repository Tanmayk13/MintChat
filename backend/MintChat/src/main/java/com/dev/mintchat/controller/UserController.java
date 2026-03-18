package com.dev.mintchat.controller;

import com.dev.mintchat.dto.UserDto;
import com.dev.mintchat.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserDto>> getUsers() {
        return ResponseEntity.ok(
                userService.getAllUsers().stream()
                        .map(u -> new UserDto(u.getId(), u.getUsername(), u.getStatus()))
                        .collect(Collectors.toList())
        );
    }
}
