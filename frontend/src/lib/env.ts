function readViteEnv(name: string): string | undefined {
  // `import.meta.env` exists in Vite; in Next.js it will be undefined.
  const meta = import.meta as unknown as { env?: Record<string, string | undefined> } | undefined;
  return meta?.env?.[name];
}

function stripTrailingSlash(v: string) {
  return v.replace(/\/$/, "");
}

export const API = stripTrailingSlash(
  process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    readViteEnv("VITE_API_URL") ??
    "http://localhost:8080",
);

export const WS = stripTrailingSlash(
  process.env.NEXT_PUBLIC_WS_URL ??
    readViteEnv("VITE_WS_URL") ??
    // Default to the API origin if no dedicated WS base is configured
    API,
);

