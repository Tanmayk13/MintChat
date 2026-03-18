import type { AuthResponse, Page, Message, User } from "@/lib/types";

import { API } from "@/lib/env";

function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function requestJson<T>(
  path: string,
  opts: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const url = `${API}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = new Headers(opts.headers);
  headers.set("Content-Type", "application/json");
  const token = opts.token ?? null;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, {
    ...opts,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");

    if (res.status === 401 || res.status === 403) {
      // Clear saved auth and force a reload to login
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("mintchat_token");
        window.localStorage.removeItem("mintchat_username");
        window.location.href = "/login";
      }
      throw new ApiError("Unauthorized", res.status);
    }

    throw new ApiError(text || `Request failed: ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

export const api = {
  baseUrl: API,

  health: () => fetch(`${API}/`, { cache: "no-store" }).then((r) => r.text()),

  register: (username: string, password: string) =>
    requestJson<string>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    requestJson<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  users: (token: string) =>
    requestJson<User[]>("/users", {
      method: "GET",
      token,
    }).then((users) =>
      users
        .map(({ id, username, status }) => ({ id, username, status }))
        .sort((a, b) => a.username.localeCompare(b.username)),
    ),

  createChat: (token: string, userA: number, userB: number) => {
    const qs = new URLSearchParams({ userA: String(userA), userB: String(userB) });
    return requestJson<{ id: number; user1Id: number; user2Id: number }>(
      `/chat/create?${qs.toString()}`,
      { method: "POST", token },
    );
  },

  messages: (token: string, chatId: number, page = 0, size = 50) => {
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    return requestJson<Page<Message>>(`/messages/${chatId}?${qs.toString()}`, {
      method: "GET",
      token,
    });
  },
};

