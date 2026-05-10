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
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../i18n";
import { usePremium } from "../premium/PremiumProvider";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

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
  const nav = useNavigation<Nav>();
  const { signOut } = useAuth();
  const { isPremium } = usePremium();

  const i = useI18n();
  const t = (key: string) => i?.t(key) ?? key;

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
        const { data: sess } = await supabase.auth.getSession();
        const user = sess.session?.user || null;
        setEmail(user?.email || "");

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
      if (!userId) return Alert.alert(t("common.error"), t("account.must_be_signed_in"));
      const newName = tmpName.trim();
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, display_name: newName }, { onConflict: "id" });
      if (error) throw error;
      setName(newName);
      setEditName(false);
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? t("account.save_name_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function savePassword() {
    if (!pwd1 || pwd1.length < 6)
      return Alert.alert(t("account.password"), t("account.password_min_length"));
    if (pwd1 !== pwd2)
      return Alert.alert(t("account.password"), t("account.passwords_must_match"));
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd1 });
      if (error) throw error;
      setEditPwd(false);
      setPwd1("");
      setPwd2("");
      Alert.alert(t("common.success"), t("account.password_changed"));
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? t("account.change_pwd_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function saveColor(newColor: string) {
    setBusy(true);
    try {
      const { data: usr } = await supabase.auth.getUser();
      const userId = usr.user?.id;
      if (!userId) return Alert.alert(t("common.error"), t("account.must_be_signed_in"));
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, avatar_color: newColor }, { onConflict: "id" });
      if (error) throw error;
      setColor(newColor);
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? t("account.save_color_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function saveWorkoutsPerWeek(n: number) {
    setBusy(true);
    try {
      const { data: usr } = await supabase.auth.getUser();
      const userId = usr.user?.id;
      if (!userId) return Alert.alert(t("common.error"), t("account.must_be_signed_in"));
      const clamped = Math.max(1, Math.min(7, Math.floor(n)));
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, workouts_per_week: clamped }, { onConflict: "id" });
      if (error) throw error;
      setWeeklyGoal(clamped);
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? t("account.save_goal_failed"));
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

  const workoutLabel = (n: number) =>
    t(n === 1 ? "account.workout_singular" : "account.workout_plural");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={s.header}>
          <Text style={s.headerTitle}>{t("account.profile_title")}</Text>
          <TouchableOpacity
            onPress={() => nav.goBack()}
            style={s.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: spacing(4) }}>
          <View style={{ alignItems: "center", marginTop: spacing(1) }}>
            <View style={[s.avatar, { borderColor: color, backgroundColor: "#121418" }]}>
              <Text style={s.avatarTxt}>{initial}</Text>
            </View>
            <Text style={s.nameMain}>{name || t("account.default_user")}</Text>
            <Text style={s.emailMain}>{email}</Text>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>{t("account.avatar_color")}</Text>
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

          <View style={s.card}>
            <Text style={s.cardTitle}>{t("account.personal_info")}</Text>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{t("account.name")}</Text>
                {!editName ? (
                  <Text style={s.rowValue}>{name || t("account.placeholder_none")}</Text>
                ) : (
                  <TextInput
                    value={tmpName}
                    onChangeText={setTmpName}
                    placeholder={t("account.placeholder_your_name")}
                    placeholderTextColor={colors.subtext}
                    style={s.input}
                    autoCapitalize="words"
                  />
                )}
              </View>
              {!editName ? (
                <TouchableOpacity onPress={() => { setTmpName(name); setEditName(true); }}>
                  <Text style={s.editLink}>{t("account.edit")}</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.editBtns}>
                  <TouchableOpacity onPress={() => setEditName(false)}>
                    <Text style={s.cancelLink}>{t("common.cancel")}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={saveName} disabled={busy} style={s.saveBtnSpacing}>
                    <Text style={s.saveLink}>{t("account.save")}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{t("account.email")}</Text>
                <Text style={s.rowValue}>{email || t("account.placeholder_none")}</Text>
              </View>
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>{t("account.training")}</Text>

            <TouchableOpacity
              style={s.row}
              activeOpacity={0.8}
              onPress={() => setWeeklyExpanded((v) => !v)}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{t("account.weekly_goal")}</Text>
                <Text style={s.rowValue}>
                  {weeklyGoal} {workoutLabel(weeklyGoal)} / {t("account.week")}
                </Text>
              </View>
              <Ionicons
                name={weeklyExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.subtext}
              />
            </TouchableOpacity>

            {weeklyExpanded && (
              <View style={s.freqCard}>
                <View style={s.freqRow}>
                  <TouchableOpacity
                    onPress={() => saveWorkoutsPerWeek(weeklyGoal - 1)}
                    activeOpacity={0.8}
                    style={s.freqBtn}
                  >
                    <Ionicons name="remove" size={18} color={colors.text} />
                  </TouchableOpacity>

                  <View style={{ alignItems: "center" }}>
                    <Text style={s.freqNumber}>{weeklyGoal}</Text>
                    <Text style={s.freqCaption}>
                      {weeklyGoal} {workoutLabel(weeklyGoal)} / {t("account.week")}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => saveWorkoutsPerWeek(weeklyGoal + 1)}
                    activeOpacity={0.8}
                    style={s.freqBtn}
                  >
                    <Ionicons name="add" size={18} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={s.freqBarsRow}>
                  {Array.from({ length: 7 }).map((_, idx) => {
                    const active = idx < weeklyGoal;
                    return <View key={idx} style={[s.freqBar, active && s.freqBarActive]} />;
                  })}
                </View>
              </View>
            )}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>{t("account.premium")}</Text>
            <View style={s.dividerLine} />

            <TouchableOpacity
              style={s.premiumRow}
              activeOpacity={0.9}
              onPress={() => nav.navigate("Premium")}
            >
              <View style={s.premiumLeft}>
                <View style={s.premiumIconBox}>
                  <Ionicons name="trophy-outline" size={18} color="#ffffff" />
                </View>
                <View>
                  <Text style={s.premiumTitle}>
                    {isPremium ? t("account.your_premium") : t("account.upgrade_premium")}
                  </Text>
                  <Text style={s.premiumSub}>
                    {isPremium ? t("account.manage_membership") : t("account.unlock_all_features")}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>{t("account.security")}</Text>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{t("account.change_password")}</Text>
                {!editPwd ? (
                  <Text style={[s.rowValue, { color: colors.subtext }]}>••••••••</Text>
                ) : (
                  <>
                    <TextInput
                      value={pwd1}
                      onChangeText={setPwd1}
                      placeholder={t("account.placeholder_new_pwd")}
                      placeholderTextColor={colors.subtext}
                      style={s.input}
                      secureTextEntry
                    />
                    <TextInput
                      value={pwd2}
                      onChangeText={setPwd2}
                      placeholder={t("account.placeholder_repeat_pwd")}
                      placeholderTextColor={colors.subtext}
                      style={[s.input, { marginTop: 8 }]}
                      secureTextEntry
                    />
                  </>
                )}
              </View>

              {!editPwd ? (
                <TouchableOpacity onPress={() => setEditPwd(true)}>
                  <Text style={s.editLink}>{t("account.edit")}</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.editBtns}>
                  <TouchableOpacity onPress={() => { setEditPwd(false); setPwd1(""); setPwd2(""); }}>
                    <Text style={s.cancelLink}>{t("common.cancel")}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={savePassword} disabled={busy} style={s.saveBtnSpacing}>
                    <Text style={s.saveLink}>{t("account.save")}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={s.thinDivider} />
            <TouchableOpacity style={s.logoutRow} activeOpacity={0.85} onPress={signOut}>
              <View style={s.logoutLeft}>
                <View style={s.logoutIconBox}>
                  <Ionicons name="log-out-outline" size={16} color="#ef4444" />
                </View>
                <Text style={s.logoutText}>{t("account.log_out")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ef4444aa" />
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
  saveBtnSpacing: { marginTop: 10 },

  freqCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2),
    marginTop: 10,
  },
  freqRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing(1.5),
  },
  freqBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  freqNumber: { color: colors.text, fontSize: 32, fontWeight: "800" },
  freqCaption: { color: colors.subtext, fontSize: 12, marginTop: 2 },
  freqBarsRow: { flexDirection: "row", gap: 4 },
  freqBar: { flex: 1, height: 4, borderRadius: 999, backgroundColor: colors.muted },
  freqBarActive: { backgroundColor: colors.accent },

  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  dividerLine: { height: 1, backgroundColor: colors.border, marginBottom: spacing(1.2) },
  premiumRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing(1),
  },
  premiumLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  premiumIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumTitle: { color: colors.text, fontWeight: "700", fontSize: 16 },
  premiumSub: { color: colors.subtext, fontSize: 13, marginTop: 2 },

  thinDivider: { height: 1, backgroundColor: colors.border, marginTop: spacing(1), marginBottom: spacing(1) },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing(1),
    borderRadius: 10,
    paddingHorizontal: 2,
  },
  logoutLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoutIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: { color: "#ef4444", fontWeight: "700" },
});

export default AccountScreen;
