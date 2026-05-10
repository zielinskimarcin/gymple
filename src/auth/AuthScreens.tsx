import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing } from "../theme";
import { useAuth } from "./AuthProvider";
// ⛔ removed: import { setAfterSignupNeeded } from "../storage/onboarding";
// ⛔ removed: import { supabase } from "../lib/supabase";

/* ---------- header (UI only) ---------- */
const AuthHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <View style={{ alignItems: "center", marginBottom: spacing(3.5) }}>
    <LinearGradient colors={["#ff7a18", "#e52e71"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.logoTile}>
      <Ionicons name="barbell-outline" size={28} color="#fff" />
    </LinearGradient>
    <Text style={s.title}>{title}</Text>
    <Text style={s.sub}>{subtitle}</Text>
  </View>
);

/* ==================== SIGN IN ==================== */
export const SignInScreen = ({ navigation }: any) => {
  const { signIn, signInWithGoogle } = useAuth() as any;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyGoogle, setBusyGoogle] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setErr(null);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) setErr(error);
  }

  async function onGoogle() {
    setErr(null);
    if (!signInWithGoogle) {
      setErr("Google Sign-In isn’t available in this build.");
      return;
    }
    setBusyGoogle(true);
    const { error } = await signInWithGoogle();
    setBusyGoogle(false);
    if (error) setErr(error);
  }

  function onApple() { /* UI only */ }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.container}>
        <AuthHeader title="Welcome back" subtitle="Sign in to continue" />

        <TextInput placeholder="Email" placeholderTextColor={colors.subtext} autoCapitalize="none" keyboardType="email-address" style={s.input} value={email} onChangeText={setEmail} />
        <TextInput placeholder="Password" placeholderTextColor={colors.subtext} secureTextEntry style={s.input} value={password} onChangeText={setPassword} />

        {err ? <Text style={s.err}>{err}</Text> : null}

        <TouchableOpacity style={s.primaryBtn} onPress={onSubmit} disabled={busy} activeOpacity={0.9}>
          <LinearGradient colors={["#ff7a18", "#e52e71"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtnBg}>
            <Text style={s.primaryBtnTxt}>{busy ? "Signing in..." : "Sign in"}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={s.dividerRow}><View style={s.divider}/><Text style={s.dividerTxt}>or</Text><View style={s.divider}/></View>

        <TouchableOpacity style={s.appleBtn} onPress={onApple} activeOpacity={0.85}>
          <Ionicons name="logo-apple" size={18} color="#000" /><Text style={s.appleTxt}>Continue with Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.googleBtn} onPress={onGoogle} disabled={busyGoogle} activeOpacity={0.85}>
          <Ionicons name="logo-google" size={18} color="#fff" /><Text style={s.googleTxt}>{busyGoogle ? "Connecting…" : "Continue with Google"}</Text>
        </TouchableOpacity>

        <Text style={s.syncNote}>Your progress will sync across devices</Text>

        <TouchableOpacity onPress={() => navigation.navigate("SignUp")} style={{ marginTop: spacing(2), alignSelf: "center" }}>
          <Text style={s.switchLine}>No account? <Text style={s.switchLink}>Sign up</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

/* ==================== SIGN UP ==================== */
export const SignUpScreen = ({ navigation }: any) => {
  const { signUp, signInWithGoogle } = useAuth() as any;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyGoogle, setBusyGoogle] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setErr(null);
    setOk(false);

    const { error } = await signUp(email.trim(), password);
    setBusy(false);

    if (error) {
      setErr(error);
    } else {
      setOk(true); // account created; any confirmation info stays here
      // ⛔ removed: setAfterSignupNeeded(true)
    }
  }

  async function onGoogle() {
    setErr(null);
    if (!signInWithGoogle) {
      setErr("Google Sign-In isn’t available in this build.");
      return;
    }
    setBusyGoogle(true);
    const { error } = await signInWithGoogle();
    setBusyGoogle(false);
    if (error) setErr(error);
    // ⛔ removed: onboarding checks/flags for Google
  }

  function onApple() { /* UI only */ }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.container}>
        <AuthHeader title="Get started" subtitle="Set up an account to personalize your workouts" />

        <TextInput placeholder="Email" placeholderTextColor={colors.subtext} autoCapitalize="none" keyboardType="email-address" style={s.input} value={email} onChangeText={setEmail} />
        <TextInput placeholder="Password" placeholderTextColor={colors.subtext} secureTextEntry style={s.input} value={password} onChangeText={setPassword} />

        {err ? <Text style={s.err}>{err}</Text> : null}
        {ok ? <Text style={s.info}>Check your email if confirmation is on.</Text> : null}

        <TouchableOpacity style={s.primaryBtn} onPress={onSubmit} disabled={busy} activeOpacity={0.9}>
          <LinearGradient colors={["#ff7a18", "#e52e71"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtnBg}>
            <Text style={s.primaryBtnTxt}>{busy ? "Signing up..." : "Sign up"}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={s.dividerRow}><View style={s.divider}/><Text style={s.dividerTxt}>or</Text><View style={s.divider}/></View>

        <TouchableOpacity style={s.appleBtn} onPress={onApple} activeOpacity={0.85}>
          <Ionicons name="logo-apple" size={18} color="#000" /><Text style={s.appleTxt}>Continue with Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.googleBtn} onPress={onGoogle} disabled={busyGoogle} activeOpacity={0.85}>
          <Ionicons name="logo-google" size={18} color="#fff" /><Text style={s.googleTxt}>{busyGoogle ? "Connecting…" : "Continue with Google"}</Text>
        </TouchableOpacity>

        <Text style={s.syncNote}>Your progress will sync across devices</Text>

        <TouchableOpacity onPress={() => navigation.navigate("SignIn")} style={{ marginTop: spacing(2), alignSelf: "center" }}>
          <Text style={s.switchLine}>Have an account? <Text style={s.switchLink}>Sign in</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

/* ---------- styles ---------- */
const s = StyleSheet.create({
  container: { flex: 1, padding: spacing(2), justifyContent: "center" },

  logoTile: {
    width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center",
    marginBottom: spacing(1.8), shadowColor: "#ff7a18", shadowOpacity: 0.35, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  title: { color: colors.text, fontSize: 32, fontWeight: "800", textAlign: "center" },
  sub: { color: colors.subtext, textAlign: "center", marginTop: 10, marginBottom: spacing(2.6) },

  input: {
    backgroundColor: colors.card, color: colors.text, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },

  primaryBtn: { borderRadius: 16, overflow: "hidden", marginTop: spacing(0.5) },
  primaryBtnBg: { paddingVertical: spacing(2.2), alignItems: "center", justifyContent: "center" },
  primaryBtnTxt: { color: "#0E0E10", fontWeight: "800" },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: spacing(1.8) },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerTxt: { color: colors.subtext, fontWeight: "600" },

  appleBtn: {
    backgroundColor: "#fff", borderRadius: 14, paddingVertical: spacing(1.9),
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginBottom: 10,
  },
  appleTxt: { color: "#000", fontWeight: "700" },

  googleBtn: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, paddingVertical: spacing(1.9), alignItems: "center",
    justifyContent: "center", flexDirection: "row", gap: 8,
  },
  googleTxt: { color: colors.text, fontWeight: "700" },

  err: { color: "#ff6b6b", textAlign: "center", marginBottom: 8 },
  info: { color: colors.subtext, textAlign: "center", marginBottom: 8 },
  syncNote: { color: colors.subtext, textAlign: "center", marginTop: spacing(1.6) },
  switchLine: { color: colors.subtext, textAlign: "center" },
  switchLink: { color: colors.accent, fontWeight: "700" },
});