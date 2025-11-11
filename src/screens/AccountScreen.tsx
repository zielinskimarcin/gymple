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
  workouts_per_week: number | null;
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
  const { signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState<string>("");
  const [color, setColor] = useState<string>("#ff6b6b");
  const [weeklyGoal, setWeeklyGoal] = useState<number>(3);

  const [editName, setEditName] = useState(false);
  const [editPwd, setEditPwd] = useState(false);
  const [weeklyExpanded, setWeeklyExpanded] = useState(false);

  const [tmpName, setTmpName] = useState("");
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");

  const initial = useMemo(() => {
    const n = (name || "").trim();
    return n ? n.charAt(0).toUpperCase() : (email || "?").charAt(0).toUpperCase();
  }, [name, email]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // sesja
        const { data: sess } = await supabase.auth.getSession();
        const user = sess.session?.user || null;
        setEmail(user?.email || "");

        // profil
        if (user?.id) {
          const { data: prof, error } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_color, workouts_per_week")
            .eq("id", user.id)
            .maybeSingle<ProfileRow>();

          if (!error && prof) {
            setName(prof.display_name || "");
            setColor(prof.avatar_color || "#ff6b6b");
            setWeeklyGoal(
              typeof prof.workouts_per_week === "number" && prof.workouts_per_week > 0
                ? prof.workouts_per_week
                : 3
            );
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveName() {
    setBusy(true);
    try {
      const { data: usr } = await supabase.auth.getUser();
      const userId = usr.user?.id;
      if (!userId) {
        Alert.alert("Error", "You must be signed in.");
        return;
      }
      const newName = tmpName.trim();
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, display_name: newName }, { onConflict: "id" });
      if (error) throw error;

      setName(newName);
      setEditName(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save name.");
    } finally {
      setBusy(false);
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
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd1 });
      if (error) throw error;
      setEditPwd(false);
      setPwd1("");
      setPwd2("");
      Alert.alert("Success", "Password has been changed.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not change password.");
    } finally {
      setBusy(false);
    }
  }

  async function saveColor(newColor: string) {
    setBusy(true);
    try {
      const { data: usr } = await supabase.auth.getUser();
      const userId = usr.user?.id;
      if (!userId) {
        Alert.alert("Error", "You must be signed in.");
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, avatar_color: newColor }, { onConflict: "id" });
      if (error) throw error;

      setColor(newColor);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save color.");
    } finally {
      setBusy(false);
    }
  }

  async function saveWorkoutsPerWeek(n: number) {
    setBusy(true);
    try {
      const { data: usr } = await supabase.auth.getUser();
      const userId = usr.user?.id;
      if (!userId) {
        Alert.alert("Error", "You must be signed in.");
        return;
      }
      const clamped = Math.max(1, Math.min(7, Math.floor(n)));
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, workouts_per_week: clamped }, { onConflict: "id" });
      if (error) throw error;

      setWeeklyGoal(clamped);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save weekly goal.");
    } finally {
      setBusy(false);
    }
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

          {/* Personal info */}
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

            {/* Email — read-only */}
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Email</Text>
                <Text style={s.rowValue}>{email || "—"}</Text>
              </View>
            </View>
          </View>

          {/* Weekly goal (collapsible) */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Training</Text>

            <TouchableOpacity
              style={s.row}
              activeOpacity={0.8}
              onPress={() => setWeeklyExpanded((v) => !v)}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Weekly goal</Text>
                <Text style={s.rowValue}>
                  {weeklyGoal} {weeklyGoal === 1 ? "workout" : "workouts"} / week
                </Text>
              </View>
              <Ionicons
                name={weeklyExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.subtext}
              />
            </TouchableOpacity>

            {weeklyExpanded && (
              <View style={s.weeklyWrap}>
                <TouchableOpacity
                  onPress={() => saveWorkoutsPerWeek(Math.max(1, weeklyGoal - 1))}
                  style={s.counterBtn}
                >
                  <Ionicons name="remove" size={18} color={colors.text} />
                </TouchableOpacity>
                <Text style={s.weeklyValue}>{weeklyGoal}</Text>
                <TouchableOpacity
                  onPress={() => saveWorkoutsPerWeek(Math.min(7, weeklyGoal + 1))}
                  style={s.counterBtn}
                >
                  <Ionicons name="add" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Security */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Security</Text>

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
  },
  avatarTxt: { color: "#fff", fontWeight: "800", fontSize: 40, letterSpacing: 1 },

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

  // weekly goal
  weeklyWrap: {
    marginTop: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  counterBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weeklyValue: { color: colors.text, fontSize: 24, fontWeight: "800", minWidth: 28, textAlign: "center" },

  // logout
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