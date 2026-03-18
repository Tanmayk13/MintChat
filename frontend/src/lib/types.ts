export type AuthResponse = { token: string };

export type User = {
  id: number;
  username: string;
  // backend currently also returns password + status; we ignore them in UI
  status?: "ONLINE" | "OFFLINE";
};

export type Message = {
  id: number;
  chatId: number;
  senderId: number;
  content: string;
  timestamp: string; // ISO-ish string from backend
  status?: "SENT" | "DELIVERED" | "READ";
};

export type Page<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
};

export type ChatMessageDTO = {
  chatId: number;
  senderId: number;
  content: string;
};

export type TypingDTO = {
  chatId: number;
  username: string;
  typing: boolean;
};
