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

const browserDefaultApi =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}`
    : undefined;

const devDefaultApi = "http://localhost:8080";

export const API = stripTrailingSlash(
  configuredApi ??
    (typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? devDefaultApi
      : browserDefaultApi ?? devDefaultApi),
);

export const WS = stripTrailingSlash(
  process.env.NEXT_PUBLIC_WS_URL ??
    readViteEnv("VITE_WS_URL") ??
    // Default to the API origin if no dedicated WS base is configured
    API,
);

