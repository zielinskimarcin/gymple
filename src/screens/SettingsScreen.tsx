import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";
import { fetchPrefs } from "../storage/prefs";

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

  function comingSoon(msg = "This setting isn’t active yet.") {
    Alert.alert("Soon", msg);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Top bar */}
      <View style={s.top}>
        <Text style={s.title}>Settings</Text>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.iconBtn} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
          <Ionicons name="close" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={{ padding: spacing(2) }}>
        {/* General */}
        <Section title="General">
          <Row onPress={() => comingSoon("Language selection UI will land next.")}
               leftIcon="globe-outline"
               label="Language"
               value={lang === "en" ? "English" : "Polski"} />
          <SwitchRow
            leftIcon="moon-outline"
            label="Dark Mode"
            value={theme === "dark"}
            onValueChange={() => comingSoon("Theme switch will toggle app-wide colors.")}
          />
          <Row onPress={() => comingSoon("Choose between kg and lb.")}
               leftIcon="scale-outline"
               label="Weight unit"
               value={units} />
        </Section>

        {/* Account */}
        <Section title="Account">
          <Row
            onPress={() => nav.navigate("Profile" as never)}
            leftIcon="person-outline"
            label="Profile"
            value="Edit"
            valueTint={colors.accent}
          />
          <Row
            onPress={() => comingSoon("Password change will open a secure flow.")}
            leftIcon="lock-closed-outline"
            label="Change password"
          />
        </Section>

        {/* Data & privacy */}
        <Section title="Data & Privacy">
          <Row
            onPress={() => comingSoon("Export to CSV/JSON will appear here.")}
            leftIcon="download-outline"
            label="Export my data"
          />
          <Row
            onPress={() => Alert.alert(
              "Reset local settings",
              "This will clear local caches and preferences on this device (not your workouts). Continue?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Reset", style: "destructive", onPress: () => comingSoon("Local reset will be wired next.") },
              ]
            )}
            leftIcon="refresh-outline"
            label="Reset local settings"
          />
        </Section>

        {/* Danger zone */}
        <Section title="Danger zone">
          <Row
            onPress={() => comingSoon("Account deletion flow will live here (with confirmation).")}
            leftIcon="trash-outline"
            label="Delete account"
            value="Coming soon"
            valueTint="#ff6b6b"
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
  valueTint?: string;
  onPress?: () => void;
}> = ({ leftIcon, label, value, valueTint, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={s.row}>
    <View style={s.rowLeft}>
      <Ionicons name={leftIcon} size={18} color={colors.subtext} />
      <Text style={s.rowLabel}>{label}</Text>
    </View>
    <View style={s.rowRight}>
      {value ? <Text style={[s.rowValue, valueTint && { color: valueTint }]}>{value}</Text> : null}
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
  top:{ flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal: spacing(2), paddingTop: spacing(2), paddingBottom: spacing(1) },
  title:{ color: colors.text, fontSize: 28, fontWeight: "800" },
  iconBtn:{ width: 40, height: 40, borderRadius: 12, alignItems:"center", justifyContent:"center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },

  sectionTitle:{ color: colors.subtext, marginBottom: 8, fontWeight:"600" },

  row:{
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
  rowLeft:{ flexDirection:"row", alignItems:"center", gap: 10 },
  rowLabel:{ color: colors.text, fontSize: 16, fontWeight:"600" },
  rowRight:{ flexDirection:"row", alignItems:"center", gap: 8 },
  rowValue:{ color: colors.subtext, fontWeight:"600" },
});