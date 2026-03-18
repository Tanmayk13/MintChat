function readViteEnv(name: string): string | undefined {
  // `import.meta.env` exists in Vite; in Next.js it will be undefined.
  const meta = import.meta as unknown as { env?: Record<string, string | undefined> } | undefined;
  return meta?.env?.[name];
}

function stripTrailingSlash(v: string) {
  return v.replace(/\/$/, "");
}

const configuredApi =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  readViteEnv("VITE_API_URL");

const devDefaultApi = "http://localhost:8080";

function isLocalhostHost() {
  return (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  );
}

function resolveApiBaseUrl(): string {
  if (configuredApi) return configuredApi;
  if (isLocalhostHost()) return devDefaultApi;

  // In production we *must* be explicit. Falling back to the frontend origin
  // makes requests like `/auth/register` hit Next.js and return a 404 HTML page.
  throw new Error(
    "MintChat misconfigured: set NEXT_PUBLIC_API_BASE_URL (or NEXT_PUBLIC_API_URL) to your backend URL.",
  );
}

export const API = stripTrailingSlash(resolveApiBaseUrl());

export const WS = stripTrailingSlash(
  process.env.NEXT_PUBLIC_WS_URL ??
    readViteEnv("VITE_WS_URL") ??
    // Default to the API origin if no dedicated WS base is configured
    API,
);

