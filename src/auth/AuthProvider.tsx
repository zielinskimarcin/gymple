// src/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../lib/supabase";
import { applyPendingProfileOnce } from "../storage/pendingProfile";

WebBrowser.maybeCompleteAuthSession();

/* ===== Typ kontekstu ===== */
type AuthCtx = {
  session: Session | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<{ error?: string }>;
  signUp(email: string, password: string): Promise<{ error?: string }>;
  signOut(): Promise<void>;
  signInWithGoogle(): Promise<{ error?: string }>;
  googleSignIn?(): Promise<{ error?: string }>;
};

/* ===== Domyślny kontekst ===== */
const AuthContext = createContext<AuthCtx>({
  session: null,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  signInWithGoogle: async () => ({}),
  googleSignIn: async () => ({}),
});

export const useAuth = () => useContext(AuthContext);

/* ===== Provider ===== */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  /** ===== Inicjalizacja sesji ===== */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setLoading(false);
    })();

    // subskrypcja zmian sesji
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s ?? null);

      // 🔑 Po zalogowaniu (dowolna metoda) — wgraj dane z pendingProfile (jeśli są)
      if (event === "SIGNED_IN" && s) {
        try {
          await applyPendingProfileOnce();
        } catch (e: any) {
          console.warn("[AuthProvider] applyPendingProfileOnce error:", e.message);
        }
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  /** ===== Auth Email/Password ===== */
  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    return error ? { error: error.message } : {};
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  /** ===== Google OAuth ===== */
  async function signInWithGoogle(): Promise<{ error?: string }> {
    try {
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: "gymtracker", // <- dopasuj do app.json
        path: "auth/callback",
        preferLocalhost: true,
      });

      if (Platform.OS === "web") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo, queryParams: { prompt: "select_account" } },
        });
        return error ? { error: error.message } : {};
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: { prompt: "select_account" },
        },
      });

      if (error) return { error: error.message };
      if (!data?.url) return { error: "No OAuth URL returned" };

      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type !== "success" || !res.url) {
        return { error: res.type === "cancel" ? "Canceled" : "Auth flow failed" };
      }

      // parsuj code z URL-a
      let code: string | null = null;
      try {
        const u = new URL(res.url);
        code = u.searchParams.get("code");
        if (!code && u.hash) {
          const hashParams = new URLSearchParams(u.hash.replace(/^#/, ""));
          code = hashParams.get("code");
        }
      } catch {}
      if (!code) return { error: "No authorization code returned" };

      const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
      return exErr ? { error: exErr.message } : {};
    } catch (e: any) {
      return { error: e?.message || "OAuth error" };
    }
  }

  /** ===== Context Value ===== */
  const value = useMemo<AuthCtx>(
    () => ({
      session,
      loading,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      googleSignIn: signInWithGoogle,
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};