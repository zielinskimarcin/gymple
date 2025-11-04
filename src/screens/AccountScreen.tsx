// src/screens/AccountScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_color: string | null;
  created_at?: string;
};

const COLOR_CHOICES = [
  "#ff6b6b",
  "#fca311",
  "#2dd4bf",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#f59e0b",
  "#34d399",
];

export const AccountScreen = () => {
  const nav = useNavigation();
  const { session, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState<string>("");
  const [color, setColor] = useState<string>("#ff6b6b");

  const [editName, setEditName] = useState(false);
  const [editEmail, setEditEmail] = useState(false);
  const [editPwd, setEditPwd] = useState(false);

  const [tmpName, setTmpName] = useState("");
  const [tmpEmail, setTmpEmail] = useState("");
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");

  const initial = useMemo(() => {
    const n = (name || "").trim();
    return n ? n.charAt(0).toUpperCase() : (email || "?").charAt(0).toUpperCase();
  }, [name, email]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user || null;
      setEmail(user?.email || "");

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_color")
        .eq("id", user?.id || "")
        .maybeSingle();

      if (!error && prof) {
        setName(prof.display_name || "");
        setColor(prof.avatar_color || "#ff6b6b");
      }
      setLoading(false);
    })();
  }, []);

  async function saveName() {
    setBusy(true);
    const newName = tmpName.trim();
    const { data: usr } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: newName })
      .eq("id", usr.user?.id || "");
    setBusy(false);
    if (error) Alert.alert("Error", error.message);
    else {
      setName(newName);
      setEditName(false);
    }
  }

  async function saveEmail() {
    setBusy(true);
    const newEmail = tmpEmail.trim();
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setBusy(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setEmail(newEmail);
      setEditEmail(false);
      Alert.alert(
        "Email updated",
        "If email confirmation is enabled, please check your inbox."
      );
    }
  }

  async function savePassword() {
    if (!pwd1 || pwd1.length < 6) {
      Alert.alert("Password", "Password must be at least 6 characters.");
      return;
    }
    if (pwd1 !== pwd2) {
      Alert.alert("Password", "Passwords must match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd1 });
    setBusy(false);
    if (error) Alert.alert("Error", error.message);
    else {
      setEditPwd(false);
      setPwd1("");
      setPwd2("");
      Alert.alert("Success", "Password has been changed.");
    }
  }

  async function saveColor(newColor: string) {
    setColor(newColor);
    const { data: usr } = await supabase.auth.getUser();
    await supabase.from("profiles").update({ avatar_color: newColor }).eq("id", usr.user?.id || "");
  }

  async function onDeleteAccount() {
    Alert.alert(
      "Delete account",
      "This action is irreversible. Are you sure you want to delete your account and all data (exercises, workouts, templates)?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            const { error } = await supabase.rpc("delete_current_user");
            setBusy(false);
            if (error) {
              Alert.alert("Error", error.message);
            } else {
              await signOut();
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Profile</Text>
          <TouchableOpacity
            onPress={() => nav.goBack()}
            style={s.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: spacing(4) }}>
          {/* Avatar */}
          <View style={{ alignItems: "center", marginTop: spacing(1) }}>
            <View style={[s.avatar, { borderColor: color, backgroundColor: "#121418" }]}>
              <Text style={s.avatarTxt}>{initial}</Text>
              <TouchableOpacity onPress={() => {}} activeOpacity={0.8} style={s.camBadge}>
                <Ionicons name="camera" size={14} color="#0E0E10" />
              </TouchableOpacity>
            </View>
            <Text style={s.nameMain}>{name || "User"}</Text>
            <Text style={s.emailMain}>{email}</Text>
          </View>

          {/* Avatar color */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Avatar color</Text>
            <View style={s.colorsRow}>
              {COLOR_CHOICES.map((c) => {
                const active = c.toLowerCase() === color.toLowerCase();
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => saveColor(c)}
                    style={[s.colorDot, { backgroundColor: c }, active && s.colorDotActive]}
                  />
                );
              })}
            </View>
          </View>

          {/* Personal data */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Personal info</Text>

            {/* Name */}
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Name</Text>
                {!editName ? (
                  <Text style={s.rowValue}>{name || "—"}</Text>
                ) : (
                  <TextInput
                    value={tmpName}
                    onChangeText={setTmpName}
                    placeholder="Your name"
                    placeholderTextColor={colors.subtext}
                    style={s.input}
                    autoCapitalize="words"
                  />
                )}
              </View>
              {!editName ? (
                <TouchableOpacity onPress={() => { setTmpName(name); setEditName(true); }}>
                  <Text style={s.editLink}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.editBtns}>
                  <TouchableOpacity onPress={() => setEditName(false)}><Text style={s.cancelLink}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity onPress={saveName} disabled={busy}><Text style={s.saveLink}>Save</Text></TouchableOpacity>
                </View>
              )}
            </View>

            {/* Email */}
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Email</Text>
                {!editEmail ? (
                  <Text style={s.rowValue}>{email || "—"}</Text>
                ) : (
                  <TextInput
                    value={tmpEmail}
                    onChangeText={setTmpEmail}
                    placeholder="email@example.com"
                    placeholderTextColor={colors.subtext}
                    style={s.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                )}
              </View>
              {!editEmail ? (
                <TouchableOpacity onPress={() => { setTmpEmail(email); setEditEmail(true); }}>
                  <Text style={s.editLink}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.editBtns}>
                  <TouchableOpacity onPress={() => setEditEmail(false)}><Text style={s.cancelLink}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity onPress={saveEmail} disabled={busy}><Text style={s.saveLink}>Save</Text></TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Security */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Security</Text>

            {/* Password */}
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Change password</Text>
                {!editPwd ? (
                  <Text style={[s.rowValue, { color: colors.subtext }]}>••••••••</Text>
                ) : (
                  <>
                    <TextInput
                      value={pwd1}
                      onChangeText={setPwd1}
                      placeholder="New password"
                      placeholderTextColor={colors.subtext}
                      style={s.input}
                      secureTextEntry
                    />
                    <TextInput
                      value={pwd2}
                      onChangeText={setPwd2}
                      placeholder="Repeat password"
                      placeholderTextColor={colors.subtext}
                      style={[s.input, { marginTop: 8 }]}
                      secureTextEntry
                    />
                  </>
                )}
              </View>
              {!editPwd ? (
                <TouchableOpacity onPress={() => setEditPwd(true)}>
                  <Text style={s.editLink}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.editBtns}>
                  <TouchableOpacity onPress={() => { setEditPwd(false); setPwd1(""); setPwd2(""); }}>
                    <Text style={s.cancelLink}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={savePassword} disabled={busy}>
                    <Text style={s.saveLink}>Save</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Account actions */}
          <View style={s.card}>
            <TouchableOpacity style={s.logoutBtn} onPress={signOut}>
              <Ionicons name="log-out-outline" size={16} color="#0E0E10" />
              <Text style={s.logoutTxt}>Log out</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ alignSelf: "center", marginTop: 10 }} onPress={onDeleteAccount}>
              <Text style={{ color: "#ff6b6b", fontWeight: "700" }}>Delete account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {busy ? (
          <View style={s.busyOverlay}>
            <ActivityIndicator />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing(2),
  },
  headerTitle: { color: colors.text, fontWeight: "800", fontSize: 20 },
  headerBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  avatar: {
    width: 140,
    height: 140,
    borderRadius: 999,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarTxt: { color: "#fff", fontWeight: "800", fontSize: 40, letterSpacing: 1 },
  camBadge: {
    position: "absolute",
    right: 10,
    bottom: 12,
    backgroundColor: colors.accent,
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  nameMain: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 12 },
  emailMain: { color: colors.subtext, marginTop: 4 },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing(2),
  },
  cardTitle: { color: colors.text, fontWeight: "800", marginBottom: 10 },

  colorsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorDot: { width: 28, height: 28, borderRadius: 999, borderWidth: 2, borderColor: "transparent" },
  colorDotActive: { borderColor: "#ffffffaa" },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabel: { color: colors.subtext, marginBottom: 4 },
  rowValue: { color: colors.text, fontSize: 16, fontWeight: "600" },

  input: {
    backgroundColor: colors.muted,
    color: colors.text,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  editLink: { color: colors.accent, fontWeight: "700" },
  editBtns: { gap: 8, alignItems: "flex-end" },
  cancelLink: { color: colors.subtext },
  saveLink: { color: colors.accent, fontWeight: "800" },

  logoutBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing(1.5),
    flexDirection: "row",
    gap: 8,
  },
  logoutTxt: { color: "#0E0E10", fontWeight: "800" },

  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default AccountScreen;