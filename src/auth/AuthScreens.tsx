import React, { useCallback, useState } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing } from "../theme";
import { useAuth } from "./AuthProvider";
import AppLogo from "../components/AppLogo";
import { useI18n } from "../i18n";

const AuthHeader: React.FC<{ title: string; subtitle: string }> = ({
  title,
  subtitle,
}) => (
  <View
    style={{
      alignItems: "center",
      marginBottom: spacing(2.5),
      marginTop: spacing(2),
    }}
  >
    <AppLogo size={50} />
    <View style={{ height: spacing(1.9) }} />
    <Text style={s.title}>{title}</Text>
    <Text style={s.sub}>{subtitle}</Text>
  </View>
);

function isUserCancelledAuth(error?: string) {
  return error === "Canceled";
}

export const SignInScreen = ({ navigation }: any) => {
  const { signIn, signInWithGoogle, signInWithApple } = useAuth() as any;

  const i = useI18n();
  const t = useCallback((key: string) => i.t(key), [i]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyGoogle, setBusyGoogle] = useState(false);
  const [busyApple, setBusyApple] = useState(false);

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
      setErr(t("auth.google_unavailable"));
      return;
    }
    setBusyGoogle(true);
    const { error } = await signInWithGoogle();
    setBusyGoogle(false);
    if (isUserCancelledAuth(error)) return;
    if (error) setErr(error);
  }

  async function onApple() {
    setErr(null);
    if (!signInWithApple) {
      setErr(t("auth.apple_unavailable"));
      return;
    }
    setBusyApple(true);
    const { error } = await signInWithApple();
    setBusyApple(false);
    if (isUserCancelledAuth(error)) return;
    if (error) setErr(error);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <View style={s.container}>
        <AuthHeader
          title={t("auth.signin_title")}
          subtitle={t("auth.signin_subtitle")}
        />

        <TextInput
          placeholder={t("auth.email_placeholder")}
          placeholderTextColor={colors.subtext}
          autoCapitalize="none"
          keyboardType="email-address"
          style={s.input}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder={t("auth.password_placeholder")}
          placeholderTextColor={colors.subtext}
          secureTextEntry
          style={s.input}
          value={password}
          onChangeText={setPassword}
        />

        {err ? <Text style={s.err}>{err}</Text> : null}

        <TouchableOpacity
          style={s.primaryBtn}
          onPress={onSubmit}
          disabled={busy}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={["#ff7a18", "#e52e71"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.primaryBtnBg}
          >
            <Text style={s.primaryBtnTxt}>
              {busy ? t("auth.signin_busy") : t("auth.signin_cta")}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={s.dividerRow}>
          <View style={s.divider} />
          <Text style={s.dividerTxt}>{t("auth.or")}</Text>
          <View style={s.divider} />
        </View>

        {Platform.OS === "ios" ? (
          <TouchableOpacity
            style={[s.appleBtn, busyApple && { opacity: 0.7 }]}
            onPress={onApple}
            disabled={busyApple}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-apple" size={18} color="#000" />
            <Text style={s.appleTxt}>
              {busyApple ? t("auth.oauth_busy") : t("auth.apple_cta")}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[s.googleBtn, busyGoogle && { opacity: 0.7 }]}
          onPress={onGoogle}
          disabled={busyGoogle}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-google" size={18} color="#fff" />
          <Text style={s.googleTxt}>
            {busyGoogle ? t("auth.oauth_busy") : t("auth.google_cta")}
          </Text>
        </TouchableOpacity>

        <Text style={s.syncNote}>{t("auth.sync_note")}</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate("SignUp")}
          style={{ marginTop: spacing(2), alignSelf: "center" }}
        >
          <Text style={s.switchLine}>
            {t("auth.no_account")}{" "}
            <Text style={s.switchLink}>{t("auth.signup_link")}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export const SignUpScreen = ({ navigation }: any) => {
  const { signUp, signInWithGoogle, signInWithApple } = useAuth() as any;

  const i = useI18n();
  const t = useCallback((key: string) => i.t(key), [i]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyGoogle, setBusyGoogle] = useState(false);
  const [busyApple, setBusyApple] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setErr(null);
    setOk(false);

    const { error } = await signUp(email.trim(), password);
    setBusy(false);

    if (error) setErr(error);
    else setOk(true);
  }

  async function onGoogle() {
    setErr(null);
    if (!signInWithGoogle) {
      setErr(t("auth.google_unavailable"));
      return;
    }
    setBusyGoogle(true);
    const { error } = await signInWithGoogle();
    setBusyGoogle(false);
    if (isUserCancelledAuth(error)) return;
    if (error) setErr(error);
  }

  async function onApple() {
    setErr(null);
    if (!signInWithApple) {
      setErr(t("auth.apple_unavailable"));
      return;
    }
    setBusyApple(true);
    const { error } = await signInWithApple();
    setBusyApple(false);
    if (isUserCancelledAuth(error)) return;
    if (error) setErr(error);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <View style={s.container}>
        <AuthHeader
          title={t("auth.signup_title")}
          subtitle={t("auth.signup_subtitle")}
        />

        <TextInput
          placeholder={t("auth.email_placeholder")}
          placeholderTextColor={colors.subtext}
          autoCapitalize="none"
          keyboardType="email-address"
          style={s.input}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder={t("auth.password_placeholder")}
          placeholderTextColor={colors.subtext}
          secureTextEntry
          style={s.input}
          value={password}
          onChangeText={setPassword}
        />

        {err ? <Text style={s.err}>{err}</Text> : null}
        {ok ? <Text style={s.info}>{t("auth.signup_ok_hint")}</Text> : null}

        <TouchableOpacity
          style={s.primaryBtn}
          onPress={onSubmit}
          disabled={busy}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={["#ff7a18", "#e52e71"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.primaryBtnBg}
          >
            <Text style={s.primaryBtnTxt}>
              {busy ? t("auth.signup_busy") : t("auth.signup_cta")}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={s.dividerRow}>
          <View style={s.divider} />
          <Text style={s.dividerTxt}>{t("auth.or")}</Text>
          <View style={s.divider} />
        </View>

        {Platform.OS === "ios" ? (
          <TouchableOpacity
            style={[s.appleBtn, busyApple && { opacity: 0.7 }]}
            onPress={onApple}
            disabled={busyApple}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-apple" size={18} color="#000" />
            <Text style={s.appleTxt}>
              {busyApple ? t("auth.oauth_busy") : t("auth.apple_cta")}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[s.googleBtn, busyGoogle && { opacity: 0.7 }]}
          onPress={onGoogle}
          disabled={busyGoogle}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-google" size={18} color="#fff" />
          <Text style={s.googleTxt}>
            {busyGoogle ? t("auth.oauth_busy") : t("auth.google_cta")}
          </Text>
        </TouchableOpacity>

        <Text style={s.syncNote}>{t("auth.sync_note")}</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate("SignIn")}
          style={{ marginTop: spacing(2), alignSelf: "center" }}
        >
          <Text style={s.switchLine}>
            {t("auth.have_account")}{" "}
            <Text style={s.switchLink}>{t("auth.signin_link")}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, padding: spacing(2), justifyContent: "center" },

  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
  },
  sub: {
    color: colors.subtext,
    textAlign: "center",
    marginTop: 10,
    marginBottom: spacing(2.6),
  },

  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },

  primaryBtn: { borderRadius: 16, overflow: "hidden", marginTop: spacing(0.5) },
  primaryBtnBg: {
    paddingVertical: spacing(2.2),
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnTxt: { color: "#0E0E10", fontWeight: "800" },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: spacing(1.8),
  },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerTxt: { color: colors.subtext, fontWeight: "600" },

  appleBtn: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: spacing(1.9),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  appleTxt: { color: "#000", fontWeight: "700" },

  googleBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: spacing(1.9),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  googleTxt: { color: colors.text, fontWeight: "700" },

  err: { color: "#ff6b6b", textAlign: "center", marginBottom: 8 },
  info: { color: colors.subtext, textAlign: "center", marginBottom: 8 },
  syncNote: { color: colors.subtext, textAlign: "center", marginTop: spacing(1.6) },
  switchLine: { color: colors.subtext, textAlign: "center" },
  switchLink: { color: colors.accent, fontWeight: "700" },
});
