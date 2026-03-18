"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setToken, setUsername } from "@/lib/storage";
import { Button, Card, Container, Input, Label, NavLink } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(
    () => username.trim().length >= 2 && password.length >= 4 && !busy,
    [username, password, busy],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.login(username.trim(), password);
      setToken(res.token);
      setUsername(username.trim());
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-grid">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-200/40 via-white to-white dark:from-emerald-400/10 dark:via-slate-950 dark:to-slate-950" />
      <Container className="flex min-h-screen items-center justify-center py-10">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:bg-slate-950/40 dark:text-slate-200">
              <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" />
              MintChat
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Sign in to start chatting in real time.
            </p>
          </div>

          <Card className="p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>Username</Label>
                <Input value={username} onChange={(e) => setU(e.target.value)} autoFocus />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  value={password}
                  onChange={(e) => setP(e.target.value)}
                  type="password"
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">
                  {error}
                </div>
              ) : null}

              <Button className="w-full" disabled={!canSubmit} type="submit">
                {busy ? "Signing in…" : "Sign in"}
              </Button>

              <div className="text-center text-sm text-[color:var(--muted)]">
                New here? <NavLink href="/register">Create an account</NavLink>
              </div>
            </form>
          </Card>

          <div className="mt-6 text-center text-xs text-[color:var(--muted)]">
            API: <span className="font-mono">{api.baseUrl}</span>
          </div>
        </div>
      </Container>
    </div>
  );
}

