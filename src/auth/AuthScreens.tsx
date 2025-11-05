// src/auth/AuthScreens.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";
import { useAuth } from "./AuthProvider";

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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.container}>
        <Text style={s.title}>Welcome</Text>
        <Text style={s.sub}>Sign in to continue</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor={colors.subtext}
          autoCapitalize="none"
          keyboardType="email-address"
          style={s.input}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.subtext}
          secureTextEntry
          style={s.input}
          value={password}
          onChangeText={setPassword}
        />

        {err ? <Text style={s.err}>{err}</Text> : null}

        <TouchableOpacity style={s.cta} onPress={onSubmit} disabled={busy}>
          <Text style={s.ctaTxt}>{busy ? "Signing in..." : "Sign in"}</Text>
        </TouchableOpacity>

        {/* separator */}
        <Text style={s.or}>or</Text>

        {/* Google */}
        <TouchableOpacity style={s.oauthBtn} onPress={onGoogle} disabled={busyGoogle}>
          <Ionicons name="logo-google" size={16} color={colors.text} />
          <Text style={s.oauthTxt}>{busyGoogle ? "Connecting…" : "Continue with Google"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("SignUp")} style={{ marginTop: 12, alignSelf: "center" }}>
          <Text style={{ color: colors.subtext }}>
            No account? <Text style={{ color: colors.accent, fontWeight: "700" }}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export const SignUpScreen = ({ navigation }: any) => {
  const { signUp, signInWithGoogle } = useAuth() as any;

  const [firstName, setFirstName] = useState("");
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
    // 3rd arg is optional metadata — your AuthProvider can ignore it safely.
    const { error } = await signUp(email.trim(), password, { firstName: firstName.trim() });
    setBusy(false);
    if (error) setErr(error);
    else setOk(true);
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.container}>
        <Text style={s.title}>Create account</Text>
        <Text style={s.sub}>Use your email</Text>

        <TextInput
          placeholder="First name"
          placeholderTextColor={colors.subtext}
          style={s.input}
          value={firstName}
          onChangeText={setFirstName}
        />

        <TextInput
          placeholder="Email"
          placeholderTextColor={colors.subtext}
          autoCapitalize="none"
          keyboardType="email-address"
          style={s.input}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.subtext}
          secureTextEntry
          style={s.input}
          value={password}
          onChangeText={setPassword}
        />

        {err ? <Text style={s.err}>{err}</Text> : null}
        {ok ? <Text style={{ color: colors.subtext, alignSelf: "center", marginBottom: 8 }}>Check your email if confirmation is on.</Text> : null}

        <TouchableOpacity style={s.cta} onPress={onSubmit} disabled={busy}>
          <Text style={s.ctaTxt}>{busy ? "Signing up..." : "Sign up"}</Text>
        </TouchableOpacity>

        {/* separator */}
        <Text style={s.or}>or</Text>

        {/* Google */}
        <TouchableOpacity style={s.oauthBtn} onPress={onGoogle} disabled={busyGoogle}>
          <Ionicons name="logo-google" size={16} color={colors.text} />
          <Text style={s.oauthTxt}>{busyGoogle ? "Connecting…" : "Continue with Google"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12, alignSelf: "center" }}>
          <Text style={{ color: colors.subtext }}>
            Have an account? <Text style={{ color: colors.accent, fontWeight: "700" }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, padding: spacing(2), justifyContent: "center" },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", textAlign: "center" },
  sub: { color: colors.subtext, textAlign: "center", marginBottom: spacing(2) },

  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },

  cta: { backgroundColor: colors.accent, borderRadius: 14, alignItems: "center", paddingVertical: spacing(2) },
  ctaTxt: { color: "#0E0E10", fontWeight: "800" },

  or: {
    color: colors.subtext,
    textAlign: "center",
    marginVertical: spacing(1.5),
    fontWeight: "600",
  },

  oauthBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing(1.8),
    flexDirection: "row",
    gap: 8,
  },
  oauthTxt: { color: colors.text, fontWeight: "700" },

  err: { color: "#ff6b6b", textAlign: "center", marginBottom: 8 },
});