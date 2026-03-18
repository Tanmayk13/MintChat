package com.dev.mintchat.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "chat", uniqueConstraints = {@UniqueConstraint(columnNames = {"user1_id", "user2_id"})})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Chat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user1_id", nullable = false)
    private Long user1Id;

    @Column(name = "user2_id", nullable = false)
    private Long user2Id;
}