import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — Royal Chess" },
      { name: "description", content: "Sign in to Royal Chess to play rated games online with friends." },
      { property: "og:title", content: "Sign in — Royal Chess" },
      { property: "og:description", content: "Sign in to play rated online chess." },
    ],
  }),
  component: AuthPage,
});

function safePath(p?: string) {
  if (!p) return "/online";
  try {
    const u = new URL(p, window.location.origin);
    if (u.origin !== window.location.origin) return "/online";
    return u.pathname + u.search;
  } catch { return "/online"; }
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (redirect) sessionStorage.setItem("rc-after-auth", safePath(redirect));
    const go = () => {
      const to = sessionStorage.getItem("rc-after-auth") || "/online";
      sessionStorage.removeItem("rc-after-auth");
      navigate({ to, replace: true });
    };
    supabase.auth.getUser().then(({ data }) => { if (data.user) go(); });
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) go(); });
    return () => data.subscription.unsubscribe();
  }, [redirect, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/auth", data: { display_name: name || email.split("@")[0] } },
        });
        if (error) throw error;
        if (!data.session) setSent(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally { setBusy(false); }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Google sign-in failed");
  };

  return (
    <AppShell>
      <div className="glass animate-pop-in mx-auto max-w-sm rounded-2xl p-6">
        <h1 className="text-3xl font-bold text-gold-gradient">{mode === "in" ? "Welcome back" : "Join the court"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to play rated games online.</p>
        {sent ? (
          <p className="mt-6 rounded-lg bg-gold-soft p-4 text-sm">Check your email and tap the confirmation link to finish creating your account.</p>
        ) : (
          <>
            <Button variant="secondary" className="mt-6 w-full" onClick={google}>Continue with Google</Button>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>
            <form onSubmit={submit} className="space-y-3">
              {mode === "up" && (
                <div><Label htmlFor="name">Display name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} /></div>
              )}
              <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
              <div><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} /></div>
              <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</Button>
            </form>
            <button className="mt-4 w-full text-center text-sm text-gold" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </AppShell>
  );
}
