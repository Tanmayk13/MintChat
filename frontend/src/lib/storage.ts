const TOKEN_KEY = "mintchat_token";
const USERNAME_KEY = "mintchat_username";

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function getUsername() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USERNAME_KEY);
}

export function setUsername(username: string) {
  window.localStorage.setItem(USERNAME_KEY, username);
}

export function clearUsername() {
  window.localStorage.removeItem(USERNAME_KEY);
}

export function signOut() {
  clearToken();
  clearUsername();
}

