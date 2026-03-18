# MintChat

MintChat is a full-stack realtime chat application demonstrating modern full-stack architecture and real-time communication.

- **Frontend:** Next.js (React + TypeScript)
- **Backend:** Spring Boot (Java 21) + WebSocket/STOMP + JWT auth
- **Database:** PostgreSQL (via Spring Data JPA)

## ✅ Features

- JWT-based authentication (login + registration)
- Realtime chat using **WebSocket + STOMP** (SockJS fallback)
- Typing indicator (WhatsApp-style 3 dots)
- Message history persistence in Postgres
- Users can create chats with other users
- Secure: only chat participants can read messages
- Resilient: auto-reconnect, connection-status UI, 401 redirect

---

## 🚀 Running Locally (dev)

### 1) Start the backend

From `backend/MintChat`:

```bash
./mvnw spring-boot:run
```

Default: **http://localhost:8080**.

> ⚠️ Ensure PostgreSQL is running and the `mintchat` database exists.

### 2) Start the frontend

From `backend/MintChat/frontend`:

```bash
npm install
npm run dev
```

Runs on **http://localhost:3000**.

---

## 🔧 Configuration

### Backend (Spring Boot)

Config is in `src/main/resources/application.yaml`.

Important settings:

- `spring.datasource.url` (Postgres connection)
- `jwt.secret` (JWT signing key; must be >= 32 bytes)
- `jwt.expiration` (token validity in ms)

> Tip: For production, override these via environment variables.

### Frontend

- `NEXT_PUBLIC_API_BASE_URL` controls which backend the frontend talks to.

Use a `.env.local` (not committed) like:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

---

## 📡 API (Backend Endpoints)

### Authentication

| Method | Path | Auth | Body | Response |
|-------|------|------|------|----------|
| POST | `/auth/register` | ❌ | `{ username, password }` | `200 OK` (text)
| POST | `/auth/login` | ❌ | `{ username, password }` | `{ token }`


### Users

| Method | Path | Auth | Response |
|-------|------|------|----------|
| GET | `/users` | ✅ (Bearer) | `[ { id, username, status } ]` |


### Chats

| Method | Path | Auth | Query / Body | Response |
|-------|------|------|-------------|----------|
| POST | `/chat/create` | ✅ | `?userA={id}&userB={id}` | `{ id, user1Id, user2Id }` |


### Messages

| Method | Path | Auth | Query | Response |
|-------|------|------|-------|----------|
| GET | `/messages/{chatId}` | ✅ | `?page=&size=` | `Page<Message>` |


### WebSocket (Realtime)

- Connect to: `ws://<backend>/ws?token=<JWT>`
- Subscribe:
  - `/topic/chat/{chatId}` — new messages
  - `/topic/typing/{chatId}` — typing indicator
- Publish:
  - `/app/chat.send` — body: `{ chatId, senderId, content }` (server overwrites `senderId` based on auth)
  - `/app/chat.typing` — body: `{ chatId, username, typing }` (server overwrites `username` based on auth)

---

## � Backend flow (end-to-end)

### 1) User registration / login
- `POST /auth/register` creates a `User` in the database (password hashed with Bcrypt).
- `POST /auth/login` validates credentials and returns a JWT token (`/auth/login` uses `JwtUtil.generateToken`).

### 2) Authentication middleware (JWT filter)
- Every API request (except `/auth/**` and `/ws/**`) is checked by `JwtFilter`.
- The filter reads `Authorization: Bearer <token>`, validates it, and sets the Spring `SecurityContext`.

### 3) WebSocket handshake + STOMP setup
- Client connects to `/ws?token=<JWT>` using SockJS.
- `JwtHandshakeInterceptor` extracts `token` from the query string, validates it, and stores the username in the WebSocket session.
- WebSocket STOMP endpoints are enabled by `WebSocketConfig`.

### 4) Sending messages (WebSocket)
- Client publishes to `/app/chat.send`.
- `ChatWebSocketController.sendMessage`:
  1. Reads username from session attributes.
  2. Resolves `senderId` from the database.
  3. Persists the message via `MessageService`.
  4. Broadcasts saved message to `/topic/chat/{chatId}`.

### 5) Typing indicator (WebSocket)
- Client publishes to `/app/chat.typing`.
- `ChatWebSocketController.typing`:
  1. Reads username from session attributes.
  2. Normalizes payload to `{ chatId, username, typing }`.
  3. Broadcasts to `/topic/typing/{chatId}`.

### 6) Retrieving chat history (REST)
- Client calls `GET /messages/{chatId}` with pagination.
- `MessageController` checks that the requester is a participant in the chat (`ChatService.isParticipant`).
- If authorized, returns paged messages via `MessageService`.

---

## �🧠 Notes / Improvements

- Backend ensures only chat participants can read messages.
- Typing indicator is currently supported in the frontend UI.
- Frontend auto-logs out on 401/403 and redirects to login.

---

## 🧪 Tests

### Backend

```bash
./mvnw test
```

### Frontend

```bash
npm run build
```

---

## 📄 License

MIT
