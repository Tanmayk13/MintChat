"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { api } from "@/lib/api";
import { WS } from "@/lib/env";
import type { ChatMessageDTO, Message, TypingDTO, User } from "@/lib/types";
import { getToken, getUsername, signOut } from "@/lib/storage";
import { Button, Card, Container, Input } from "@/components/ui";
import { useRouter } from "next/navigation";

type ChatState = {
  chatId: number | null;
  peer: User | null;
};

function formatTime(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [meUsername, setMeUsername] = useState<string | null>(null);
  const [meId, setMeId] = useState<number | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [{ chatId, peer }, setChat] = useState<ChatState>({ chatId: null, peer: null });
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [draft, setDraft] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("disconnected");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const stompRef = useRef<Client | null>(null);
  const typingTimer = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const subscriptionsRef = useRef<Array<{ unsubscribe: () => void }>>([]);

  useEffect(() => {
    const t = getToken();
    const u = getUsername();
    setToken(t);
    setMeUsername(u);
    if (!t || !u) router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (!token || !meUsername) return;
    let canceled = false;
    setLoadingUsers(true);
    setUsersError(null);
    api
      .users(token)
      .then((list) => {
        if (canceled) return;
        setUsers(list);
        const me = list.find((x) => x.username === meUsername) ?? null;
        setMeId(me?.id ?? null);
      })
      .catch((e) => {
        if (canceled) return;
        setUsersError(e instanceof Error ? e.message : "Failed to load users");
      })
      .finally(() => {
        if (canceled) return;
        setLoadingUsers(false);
      });
    return () => {
      canceled = true;
    };
  }, [token, meUsername]);

  async function openChatWith(u: User) {
    if (!token || !meId) return;
    const chat = await api.createChat(token, meId, u.id);
    setChat({ chatId: chat.id, peer: u });
  }

  useEffect(() => {
    if (!token) return;

    setConnectionStatus("connecting");
    setConnectionError(null);

    const wsUrl = `${WS}/ws?token=${encodeURIComponent(token)}`;
    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 1500,
      debug: (msg) => console.log("[STOMP]", msg),
      onConnect: () => {
        setConnectionStatus("connected");
        setConnectionError(null);
      },
      onDisconnect: () => setConnectionStatus("disconnected"),
      onStompError: (frame) => {
        setConnectionStatus("error");
        setConnectionError(frame.body || "STOMP error");
        console.error("STOMP error", frame);
      },
      onWebSocketError: (evt) => {
        setConnectionStatus("error");
        setConnectionError(String(evt));
        console.error("WebSocket error", evt);
      },
    });

    client.activate();
    stompRef.current = client;

    return () => {
      stompRef.current = null;
      client.deactivate();
    };
  }, [token]);

  useEffect(() => {
    if (!token || !chatId) return;
    let canceled = false;

    setLoadingMessages(true);
    api
      .messages(token, chatId, 0, 50)
      .then((p) => {
        if (canceled) return;
        // backend returns DESC order; display ascending
        setMessages([...p.content].reverse());
      })
      .finally(() => {
        if (canceled) return;
        setLoadingMessages(false);
      });

    return () => {
      canceled = true;
    };
  }, [token, chatId]);

  useEffect(() => {
    const client = stompRef.current;
    if (!client) return;

    const peerUsername = peer?.username;

    const clearSubscriptions = () => {
      subscriptionsRef.current.forEach((s) => s.unsubscribe());
      subscriptionsRef.current = [];
    };

    const subscribeToChat = () => {
      clearSubscriptions();
      if (!chatId) return;

      subscriptionsRef.current.push(
        client.subscribe(`/topic/chat/${chatId}`, (frame) => {
          try {
            const msg = JSON.parse(frame.body) as Message;
            setMessages((prev) => [...prev, msg]);
          } catch {
            // ignore malformed messages
          }
        }),
      );

      subscriptionsRef.current.push(
        client.subscribe(`/topic/typing/${chatId}`, (frame) => {
          try {
            const raw = JSON.parse(frame.body) as Record<string, unknown>;
            const t: { chatId?: number; username?: string; typing?: boolean; type?: string; userId?: number } = {
              chatId: typeof raw.chatId === "number" ? raw.chatId : undefined,
              username: typeof raw.username === "string" ? raw.username : undefined,
              typing: typeof raw.typing === "boolean" ? raw.typing : undefined,
              type: typeof raw.type === "string" ? raw.type : undefined,
              userId: typeof raw.userId === "number" ? raw.userId : undefined,
            };

            // Backwards/from-legacy support for older DTO schema
            if (t.username == null && t.userId != null) {
              t.username = `user-${t.userId}`;
            }
            if (t.typing == null && t.type != null) {
              t.typing = t.type === "TYPING_START";
            }

            console.log("[typing event]", t);

            // Ignore our own typing events (we already know we're typing)
            if (t.username === meUsername) return;

            if (peerUsername && t.username === peerUsername && t.typing) {
              setTypingUser(t.username);
            } else {
              setTypingUser((prev) => (prev === t.username ? null : prev));
            }
          } catch {
            // ignore malformed typing frames
          }
        }),
      );
    };

    if (client.connected) {
      subscribeToChat();
    }

    const prevOnConnect = client.onConnect;
    client.onConnect = (f) => {
      prevOnConnect?.(f);
      subscribeToChat();
    };

    return () => {
      clearSubscriptions();
      client.onConnect = prevOnConnect;
    };
  }, [chatId, peer?.username, meUsername]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, chatId]);

  function sendTyping(typing: boolean) {
    if (!chatId || !meUsername) return;
    const client = stompRef.current;
    if (!client || !client.connected) return;

    const dto: TypingDTO = { chatId, username: meUsername, typing };
    console.log("[typing send]", dto);
    client.publish({ destination: "/app/chat.typing", body: JSON.stringify(dto) });
  }

  function onDraftChange(v: string) {
    setDraft(v);
    sendTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => sendTyping(false), 700);
  }

  function onSend() {
    if (!chatId || !meId) return;
    const text = draft.trim();
    if (!text) return;
    const client = stompRef.current;
    if (!client || !client.connected) return;

    const dto: ChatMessageDTO = { chatId, senderId: meId, content: text };
    client.publish({ destination: "/app/chat.send", body: JSON.stringify(dto) });
    setDraft("");
    sendTyping(false);
  }

  const meLabel = useMemo(() => (meUsername ? `@${meUsername}` : "—"), [meUsername]);
  const sidebarUsers = useMemo(
    () => users.filter((u) => u.username !== meUsername),
    [users, meUsername],
  );

  return (
    <div className="min-h-screen bg-grid">
      <style jsx global>{`
        .typing-dots .dot {
          width: 5px;
          height: 5px;
          border-radius: 9999px;
          background: currentColor;
          opacity: 0.4;
          animation: typing-dot 1s infinite;
        }

        .typing-dots .dot:nth-child(1) {
          animation-delay: 0s;
        }
        .typing-dots .dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-dots .dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing-dot {
          0%, 20%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-200/40 via-violet-200/25 to-rose-200/25 dark:from-emerald-400/10 dark:via-violet-400/10 dark:to-rose-400/10" />
      <Container className="py-6">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--muted)]">MintChat</div>
            <div className="text-2xl font-semibold tracking-tight">Chat</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden rounded-full border border-[color:var(--border)] bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:bg-slate-950/40 dark:text-slate-200 sm:inline-flex">
              {meLabel}
            </div>
            {connectionStatus !== "connected" ? (
              <div
                className="hidden rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 sm:inline-flex"
                title={connectionError ?? connectionStatus}
              >
                {connectionStatus === "connecting" ? "Connecting…" : connectionError ? "WS error" : "Disconnected"}
              </div>
            ) : null}
            <Button
              variant="ghost"
              onClick={() => {
                signOut();
                router.replace("/login");
              }}
            >
              Sign out
            </Button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">People</div>
              <div className="text-xs text-[color:var(--muted)]">
                {loadingUsers ? "Loading…" : `${sidebarUsers.length} users`}
              </div>
            </div>

            {usersError ? (
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">
                {usersError}
              </div>
            ) : null}

            <div className="mt-3 space-y-2">
              {sidebarUsers.map((u) => {
                const active = peer?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => openChatWith(u)}
                    className={[
                      "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition",
                      active
                        ? "border-transparent bg-slate-900 text-white shadow-sm"
                        : "border-[color:var(--border)] bg-white/40 hover:bg-white/70 dark:bg-slate-950/30 dark:hover:bg-slate-950/50",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{u.username}</div>
                      <div
                        className={[
                          "text-xs",
                          active ? "text-white/80" : "text-[color:var(--muted)]",
                        ].join(" ")}
                      >
                        Click to chat
                      </div>
                    </div>
                    <div
                      className={[
                        "ml-3 h-2.5 w-2.5 rounded-full",
                        active ? "bg-[color:var(--accent2)]" : "bg-[color:var(--accent)]",
                      ].join(" ")}
                    />
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="flex min-h-[70vh] flex-col overflow-hidden">
            <div className="border-b border-[color:var(--border)] p-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {peer ? `Chat with ${peer.username}` : "Pick someone to start"}
                  </div>
                  <div className="mt-0.5 text-xs text-[color:var(--muted)]">
                    {chatId ? `chatId: ${chatId}` : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!chatId ? (
                <div className="grid place-items-center py-24 text-center">
                  <div className="max-w-sm">
                    <div className="mx-auto mb-3 h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-violet-500" />
                    <div className="text-lg font-semibold">Start a conversation</div>
                    <div className="mt-1 text-sm text-[color:var(--muted)]">
                      Choose a person on the left. We’ll create a chat automatically.
                    </div>
                  </div>
                </div>
              ) : loadingMessages ? (
                <div className="py-6 text-sm text-[color:var(--muted)]">Loading messages…</div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => {
                    const mine = meId != null && m.senderId === meId;
                    return (
                      <div
                        key={m.id ?? `${m.timestamp}-${m.senderId}`}
                        className={['flex', mine ? 'justify-end' : 'justify-start'].join(' ')}
                      >
                        <div
                          className={[
                            'max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                            mine
                              ? 'bg-slate-900 text-white'
                              : 'border border-[color:var(--border)] bg-white/70 dark:bg-slate-950/40',
                          ].join(' ')}
                        >
                          <div className="whitespace-pre-wrap break-words">{m.content}</div>
                          <div
                            className={[
                              'mt-1 text-[11px]',
                              mine ? 'text-white/70' : 'text-[color:var(--muted)]',
                            ].join(' ')}
                          >
                            {formatTime(m.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {typingUser ? (
                    <div className="flex items-center gap-2 text-[12px] text-[color:var(--muted)]">
                      <span className="font-semibold">{typingUser}</span>
                      <span className="typing-dots inline-flex items-center gap-1">
                        <span className="dot" />
                        <span className="dot" />
                        <span className="dot" />
                      </span>
                    </div>
                  ) : null}

                  <div ref={bottomRef} />
                </div>
              )}
            </div>


            <div className="border-t border-[color:var(--border)] bg-white/40 p-3 dark:bg-slate-950/25">
              <div className="flex items-end gap-2">
                <Input
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  placeholder={chatId ? "Write a message…" : "Pick a chat first"}
                  disabled={!chatId}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                />
                <Button onClick={onSend} disabled={!chatId || !draft.trim() || connectionStatus !== "connected"}>
                  Send
                </Button>
              </div>
              <div className="mt-2 text-xs text-[color:var(--muted)]">
                Enter to send • Shift+Enter for newline
              </div>
            </div>
          </Card>
        </div>
      </Container>
    </div>
  );
}

