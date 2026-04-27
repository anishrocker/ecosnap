"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [urlError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const err = new URLSearchParams(window.location.search).get("error");
    return err ? decodeURIComponent(err) : null;
  });

  async function sendLink() {
    setMsg(null);
    const url = getSupabaseUrl();
    const key = getSupabasePublishableKey();
    if (!url || !key) {
      setMsg("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local");
      return;
    }
    const supabase = createBrowserClient(url, key);
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) setMsg(error.message);
    else setMsg("Check your email for the magic link.");
  }

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: 24, background: "#fff", borderRadius: 12 }}>
      <h1>EcoSnap Admin</h1>
      <p style={{ color: "#555" }}>Sign in with Supabase Auth (magic link).</p>
      <label style={{ display: "block", marginTop: 16 }}>
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", marginTop: 6, padding: 10, fontSize: 16 }}
        />
      </label>
      <button type="button" onClick={sendLink} style={{ marginTop: 16, padding: "10px 16px", fontSize: 16 }}>
        Send magic link
      </button>
      {urlError ? (
        <p style={{ marginTop: 12, color: "#b00" }} role="alert">
          {urlError}
        </p>
      ) : null}
      {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}
    </div>
  );
}
