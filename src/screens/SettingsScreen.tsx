// src/screens/SettingsScreen.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";
import { fetchPrefs } from "../storage/prefs";
import { supabase } from "../lib/supabase";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { markOnboardingDone, clearOnbDraft } from "../storage/onboarding";

export const SettingsScreen = () => {
  const nav = useNavigation();
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<"en" | "pl">("en");
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [units, setUnits] = useState<"kg" | "lb">("kg");

  useEffect(() => {
    (async () => {
      const p = await fetchPrefs();
      setLang((p.uiLanguage as "en" | "pl") ?? "en");
      setTheme(p.uiTheme);
      setUnits(p.unitsWeight);
      setLoading(false);
    })();
  }, []);

  function soon(msg = "This feature is coming soon.") {
    Alert.alert("Soon", msg);
  }

  // 👉 pełny reset lokalu + powrót do onboardingu (bez navigation.reset)
  async function resetLocalData() {
    try {
      // 1) Wyloguj (czyści sesję w SecureStore przez adapter)
      try { await supabase.auth.signOut(); } catch {}

      // 2) Wyczyść AsyncStorage (jeśli coś trzymasz)
      try { await AsyncStorage.clear(); } catch {}

      // 3) Usuń znane klucze w SecureStore (dopisz swoje, jeśli masz inne)
      try { await SecureStore.deleteItemAsync("prefs"); } catch {}
      try { await SecureStore.deleteItemAsync("last_added_exercise"); } catch {}

      // 4) Usuń draft onboardingu i ustaw flagę na false
      await clearOnbDraft();
      await markOnboardingDone(false);

      // ⛔️ NIE robimy nav.reset – Root przełączy widok sam po evencie
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not reset data.");
    }
  }

  async function onResetAllData() {
    Alert.alert(
      "Reset all data",
      "You will be signed out, local settings will be cleared and the app will return to onboarding. Cloud data remains.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: resetLocalData },
      ]
    );
  }

  // Kasowanie danych w chmurze (Supabase)
  async function onWipeCloudData() {
    Alert.alert(
      "Wipe cloud data",
      "This will delete your workouts, templates and custom exercises from the cloud. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { data: usr } = await supabase.auth.getUser();
              const userId = usr.user?.id;
              if (!userId) { Alert.alert("Error", "You must be logged in."); return; }

              const ops = await Promise.allSettled([
                supabase.from("workouts").delete().eq("user_id", userId),
                supabase.from("templates").delete().eq("user_id", userId),
                supabase.from("custom_exercises").delete().eq("user_id", userId),
              ]);

              const failed = ops.filter(r => r.status === "rejected" || (r as any)?.value?.error);
              if (failed.length > 0) {
                const firstErr = (failed[0] as any)?.reason?.message || (failed[0] as any)?.value?.error?.message;
                throw new Error(firstErr || "Some items could not be deleted.");
              }

              Alert.alert("Done", "Cloud data removed.");
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Failed to wipe cloud data.");
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Top bar */}
      <View style={s.top}>
        <Text style={s.title}>Settings</Text>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={{ padding: spacing(2) }}>
        {/* General */}
        <Section title="General">
          <Row
            onPress={() => soon("Language selection UI will land next.")}
            leftIcon="globe-outline"
            label="Language"
            value={lang === "en" ? "English" : "Polski"}
          />
          <SwitchRow
            leftIcon="moon-outline"
            label="Dark Mode"
            value={theme === "dark"}
            onValueChange={() => soon("Theme switch will toggle app-wide colors.")}
          />
          <Row
            onPress={() => soon("Choose between kg and lb.")}
            leftIcon="scale-outline"
            label="Weight unit"
            value={units}
          />
        </Section>

        {/* Account */}
        <Section title="Account">
          <Row
            onPress={() => nav.navigate("Profile" as never)}
            leftIcon="person-outline"
            label="Profile"
            value="Edit"
          />
          <Row
            onPress={() => {
              Alert.alert("Delete account", "You can delete your account from Profile screen.");
            }}
            leftIcon="trash-outline"
            label="Delete account"
          />
        </Section>

        {/* Data & Privacy */}
        <Section title="Data & Privacy">
          <Row
            onPress={() => Alert.alert("Export", "Export to CSV/JSON will appear here soon.")}
            leftIcon="server-outline"
            label="Export data"
          />
          <Row
            onPress={onWipeCloudData}
            leftIcon="alert-circle-outline"
            label="Wipe cloud data"
          />
          <Row
            onPress={onResetAllData}
            leftIcon="reload-circle-outline"
            label="Reset all data"
          />
        </Section>

        {loading ? <Text style={{ color: colors.subtext, marginTop: 8 }}>Loading…</Text> : null}
      </View>
    </SafeAreaView>
  );
};

/* ------- Small UI primitives ------- */

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={{ marginBottom: spacing(2) }}>
    <Text style={s.sectionTitle}>{title}</Text>
    <View style={{ gap: 10 }}>{children}</View>
  </View>
);

const Row: React.FC<{
  leftIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}> = ({ leftIcon, label, value, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={s.row}>
    <View style={s.rowLeft}>
      <Ionicons name={leftIcon} size={18} color={colors.subtext} />
      <Text style={s.rowLabel}>{label}</Text>
    </View>
    <View style={s.rowRight}>
      {value ? <Text style={s.rowValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
    </View>
  </TouchableOpacity>
);

const SwitchRow: React.FC<{
  leftIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}> = ({ leftIcon, label, value, onValueChange }) => (
  <View style={s.row}>
    <View style={s.rowLeft}>
      <Ionicons name={leftIcon} size={18} color={colors.subtext} />
      <Text style={s.rowLabel}>{label}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: "#3a3f47", true: colors.accent }}
      thumbColor="#fff"
    />
  </View>
);

const s = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing(2), paddingTop: spacing(2), paddingBottom: spacing(1) },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },

  sectionTitle: { color: colors.subtext, marginBottom: 8, fontWeight: "600" },

  row: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowLabel: { color: colors.text, fontSize: 16, fontWeight: "600" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowValue: { color: colors.subtext, fontWeight: "600" },
});