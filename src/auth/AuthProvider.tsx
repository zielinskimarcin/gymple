// src/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../lib/supabase";
import { takeOnbDraft } from "../storage/onboarding";

WebBrowser.maybeCompleteAuthSession();

type AuthCtx = {
  session: Session | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<{ error?: string }>;
  signUp(email: string, password: string, meta?: { firstName?: string }): Promise<{ error?: string }>;
  signOut(): Promise<void>;
  signInWithGoogle(): Promise<{ error?: string }>;
  googleSignIn?(): Promise<{ error?: string }>;
};

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  /** ⬇️ po utworzeniu konta / zalogowaniu: przenieś dane z onboarding draft */
  async function applyOnboardingDraftToProfile() {
    try {
      const draft = await takeOnbDraft();
      if (!draft) return;

      const { data: usr } = await supabase.auth.getUser();
      const userId = usr.user?.id;
      if (!userId) return;

      const payload: Record<string, any> = {};
      if (draft.name) payload.display_name = draft.name;
      if (typeof draft.workoutsPerWeek === "number") payload.workouts_per_week = draft.workoutsPerWeek;
      if (draft.focus) payload.focus = draft.focus;

      if (Object.keys(payload).length === 0) return;

      const { error } = await supabase.from("profiles").upsert({ id: userId, ...payload }, { onConflict: "id" });

      if (error && error.message.includes("column") && error.message.includes("does not exist")) {
        console.warn("Some profile columns missing, skipping...");
        return;
      }
      if (error) console.warn("Profile upsert error:", error.message);
    } catch (e) {
      console.warn("[applyOnboardingDraftToProfile] failed:", e);
    }
  }

  /** Inicjalizacja sesji + subskrypcja zmian */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setLoading(false);
      if (data.session) await applyOnboardingDraftToProfile();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s ?? null);
      if (s) await applyOnboardingDraftToProfile();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // --- email + hasło
  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }

  async function signUp(email: string, password: string, meta?: { firstName?: string }) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta?.firstName ? { first_name: meta.firstName } : undefined },
    });
    return error ? { error: error.message } : {};
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // --- Google OAuth
  async function signInWithGoogle(): Promise<{ error?: string }> {
    try {
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: "gymtracker",
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
        options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: "select_account" } },
      });
      if (error) return { error: error.message };
      if (!data?.url) return { error: "No OAuth URL returned" };

      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type !== "success" || !res.url) return { error: res.type === "cancel" ? "Canceled" : "Auth flow failed" };

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

  const value = useMemo<AuthCtx>(
    () => ({ session, loading, signIn, signUp, signOut, signInWithGoogle, googleSignIn: signInWithGoogle }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};