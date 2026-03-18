package com.dev.mintchat.websocket;

import com.dev.mintchat.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtUtil jwtUtil;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {

        String query = request.getURI().getQuery(); // e.g. token=xxx&transport=websocket

        if (query != null) {
            // parse `token` query param robustly (SockJS adds extra params)
            for (String part : query.split("&")) {
                if (part.startsWith("token=")) {
                    String token = part.substring("token=".length());
                    try {
                        String username = jwtUtil.extractUsername(token);
                        attributes.put("username", username);
                    } catch (Exception ignored) {
                        // ignore invalid/expired tokens; allow WS connection for debug/dev
                    }
                    return true;
                }
            }
        }

        // allow handshake even if no token is provided (useful for simple client demos)
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
    }
}
