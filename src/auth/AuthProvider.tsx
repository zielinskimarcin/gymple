import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";

import { clearSupabaseAuthStorage, supabase } from "../lib/supabase";
import { revenueCatLogIn, revenueCatLogOut } from "../premium/revenuecat";
import { applyPendingProfileOnce, setPendingProfile } from "../storage/pendingProfile";

WebBrowser.maybeCompleteAuthSession();

type AuthCtx = {
  session: Session | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<{ error?: string }>;
  signUp(email: string, password: string): Promise<{ error?: string }>;
  signOut(): Promise<void>;
  signInWithGoogle(): Promise<{ error?: string }>;
  signInWithApple(): Promise<{ error?: string }>;
  googleSignIn?(): Promise<{ error?: string }>;
  appleSignIn?(): Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthCtx>({
  session: null,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  signInWithGoogle: async () => ({}),
  signInWithApple: async () => ({}),
  googleSignIn: async () => ({}),
  appleSignIn: async () => ({}),
});

export const useAuth = () => useContext(AuthContext);

function isInvalidRefreshTokenError(error: unknown) {
  const message = String((error as any)?.message ?? "");
  const code = String((error as any)?.code ?? "");
  return (
    message.includes("Invalid Refresh Token") ||
    message.includes("Refresh Token Not Found") ||
    code.includes("refresh_token")
  );
}

function getAppleDisplayName(fullName: AppleAuthentication.AppleAuthenticationFullName | null) {
  if (!fullName) return "";
  return [
    fullName.givenName,
    fullName.middleName,
    fullName.familyName,
  ]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .map((part) => part!.trim())
    .join(" ");
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error && isInvalidRefreshTokenError(error)) {
        await clearSupabaseAuthStorage();
      }

      const s = error ? null : data.session ?? null;
      setSession(s);
      setLoading(false);

      const uid = s?.user?.id;
      if (uid) await revenueCatLogIn(uid);
      else await revenueCatLogOut();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s ?? null);

      if (event === "SIGNED_IN" && s) {
        const uid = s.user?.id;
        if (uid) await revenueCatLogIn(uid);

        try {
          await applyPendingProfileOnce();
        } catch {
        }
      }

      if (event === "SIGNED_OUT") {
        await revenueCatLogOut();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

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

  async function signInWithApple(): Promise<{ error?: string }> {
    try {
      if (Platform.OS !== "ios") return { error: "Apple Sign-In is only available on iOS." };

      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) return { error: "Apple Sign-In isn’t available on this device." };

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const token = credential.identityToken;
      if (!token) return { error: "No identity token returned from Apple." };

      const appleName = getAppleDisplayName(credential.fullName);
      if (appleName) {
        await setPendingProfile({ display_name: appleName });
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token,
      });

      return error ? { error: error.message } : {};
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") return { error: "Canceled" };
      return { error: e?.message || "Apple Sign-In error" };
    }
  }

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      loading,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      signInWithApple,
      googleSignIn: signInWithGoogle,
      appleSignIn: signInWithApple,
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
