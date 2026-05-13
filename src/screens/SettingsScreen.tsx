import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  LayoutAnimation, Platform, UIManager, Linking, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Localization from "expo-localization";

import { colors, spacing } from "../theme";
import { getSupabaseFunctionsUrl, supabase } from "../lib/supabase";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { markOnboardingDone, clearOnbDraft } from "../storage/onboarding";
import { getWeightUnit, setWeightUnit, type WeightUnit } from "../lib/units";
import { useI18n } from "../i18n";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? "https://zielinskimarcin.github.io/gymple/privacy.html";
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL ?? "https://zielinskimarcin.github.io/gymple/terms.html";

export const SettingsScreen = () => {
  const nav = useNavigation<any>();

  const i = useI18n();
  const t = (key: string) => {
    const fromCtx = i?.t ? i.t(key) : undefined;
    if (fromCtx && fromCtx !== key) return fromCtx;
    return fallbackT(key);
  };
  const pref = i?.pref ?? "system";
  const setPreferredLanguage = i?.setPreferredLanguage;

  const sysCode = Localization.getLocales?.()[0]?.languageCode?.toLowerCase() || "en";
  const systemLabel = sysCode.startsWith("pl")
    ? t("common.polish")
    : sysCode.startsWith("it")
    ? t("common.italian")
    : t("common.english");

  const currentLangLabel =
    pref === "system"
      ? `${t("settings.system")} (${systemLabel})`
      : pref === "pl"
      ? t("common.polish")
      : pref === "it"
      ? t("common.italian")
      : t("common.english");

  const [loading, setLoading] = useState(true);

  const [units, setUnits] = useState<WeightUnit | null>(null);
  const [savingUnits, setSavingUnits] = useState(false);
  const [unitExpanded, setUnitExpanded] = useState(false);

  const [langExpanded, setLangExpanded] = useState(false);
  const [changingLang, setChangingLang] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getWeightUnit();
      setUnits(u);
      setLoading(false);
    })();
  }, []);

  async function resetLocalData() {
    try {
      try { await supabase.auth.signOut(); } catch {}
      try { await AsyncStorage.clear(); } catch {}
      try { await SecureStore.deleteItemAsync("prefs"); } catch {}
      try { await SecureStore.deleteItemAsync("last_added_exercise"); } catch {}
      await clearOnbDraft();
      await markOnboardingDone(false);
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? t("settings.reset_error"));
    }
  }

  function onResetAllData() {
    Alert.alert(
      t("settings.reset_all"),
      t("settings.reset_all_hint"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.reset"), style: "destructive", onPress: resetLocalData },
      ]
    );
  }

  async function onClearCloudData() {
    Alert.alert(
      t("settings.clear_account_data"),
      t("settings.clear_account_data_hint"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const { data: usr } = await supabase.auth.getUser();
              const userId = usr.user?.id;
              if (!userId) return Alert.alert(t("common.error"), t("settings.must_be_logged_in"));

              await Promise.all([
                supabase.from("template_favourites").delete().eq("user_id", userId),
                supabase.from("workouts").delete().eq("user_id", userId),
                supabase.from("templates").delete().eq("user_id", userId),
                supabase.from("custom_exercises").delete().eq("user_id", userId),
              ]);

              Alert.alert(t("common.done"), t("settings.cleared_ok"));
            } catch (e: any) {
              Alert.alert(t("common.error"), e?.message ?? t("settings.clear_failed"));
            }
          },
        },
      ]
    );
  }

  async function applyUnits(next: WeightUnit) {
    if (savingUnits || units === next) return;
    setSavingUnits(true);
    const prev = units;
    setUnits(next);
    try {
      const res = await setWeightUnit(next);
      if (!(res as any)?.ok) {
        setUnits(prev ?? "kg");
        Alert.alert(t("common.error"), (res as any)?.error ?? t("settings.units_update_failed"));
      }
    } catch (e: any) {
      setUnits(prev ?? "kg");
      Alert.alert(t("common.error"), e?.message ?? t("settings.units_update_failed"));
    } finally {
      setSavingUnits(false);
    }
  }

  async function applyLanguage(next: "system" | "en" | "pl" | "it") {
    if (!setPreferredLanguage) {
      Alert.alert(t("common.error"), t("settings.lang_update_failed"));
      return;
    }
    if (changingLang || (pref as any) === next) return;
    setChangingLang(true);
    try {
      await setPreferredLanguage(next);
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? t("settings.lang_update_failed"));
    } finally {
      setChangingLang(false);
    }
  }

  async function openLegalUrl(url: string) {
    if (!url) {
      Alert.alert(t("common.error"), t("premium.legal_url_missing"));
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? t("premium.legal_open_failed"));
    }
  }

function confirmDeleteAccount() {
  const title = t("settings.delete_account");

  const message =
    `${t("settings.delete_hint_part1")}\n\n` +
    `${t("settings.delete_hint_part2")}\n\n` +
    `${t("settings.delete_hint_part3")}`;

  Alert.alert(
    title,
    message,
    [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: deleteAccountNow },
    ],
    { cancelable: true }
  );
}

async function performLogoutAndRedirect() {
  await supabase.auth.signOut();
  try { await AsyncStorage.clear(); } catch {}
  try { await SecureStore.deleteItemAsync("prefs"); } catch {}
  await clearOnbDraft();
  await markOnboardingDone(false);
}

async function deleteAccountNow() {
  try {
    const { data: s } = await supabase.auth.getSession();
    const accessToken = s?.session?.access_token;
    if (!accessToken) {
      Alert.alert(t("common.error"), t("settings.must_be_logged_in"));
      return;
    }

    const base = getSupabaseFunctionsUrl();
    if (!base) {
      Alert.alert(t("common.error"), t("settings.func_url_error"));
      return;
    }

    const delRes = await fetch(`${base}/delete-account`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "user_self_delete" }),
    });

    const delText = await delRes.text();
    let delJson: any = {};
    try { delJson = JSON.parse(delText); } catch { delJson = { raw: delText }; }

    if (!delRes.ok || delJson?.error) {
      const msg = delJson?.detail || delJson?.error || `HTTP ${delRes.status}`;

      const isUserAlreadyDeleted =
        msg.includes("User from sub claim in JWT does not exist") ||
        msg.includes("User not allowed") ||
        delRes.status === 401;

      if (isUserAlreadyDeleted) {
        await performLogoutAndRedirect();
        return;
      }

      Alert.alert(t("common.error"), t("settings.deletion_failed_message"));
      return;
    }

    await performLogoutAndRedirect();

  } catch (e: any) {
    Alert.alert(t("common.error"), e?.message ?? t("settings.deletion_failed_network"));
  }
}

  const unitsLabel = units ? units.toLowerCase() : "…";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.top}>
        <Text style={s.title}>{t("settings.title")}</Text>
        <TouchableOpacity
          onPress={() => nav.goBack()}
          style={s.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing(2), paddingBottom: spacing(4) }}
        showsVerticalScrollIndicator={false}
      >
        <Section title={t("settings.general")}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setLangExpanded(v => !v);
            }}
            style={s.row}
          >
            <View style={s.rowLeft}>
              <Ionicons name="globe-outline" size={18} color={colors.subtext} />
              <Text style={s.rowLabel}>{t("settings.language")}</Text>
            </View>
            <View style={s.rowRight}>
              <Text style={s.rowValue}>{currentLangLabel}</Text>
              <Ionicons
                name={langExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.subtext}
              />
            </View>
          </TouchableOpacity>

          {langExpanded && (
            <View style={s.dropdown}>
              <DropdownItem label={`${t("settings.system")} (${systemLabel})`} selected={pref === "system"} onPress={() => applyLanguage("system")} disabled={changingLang} />
              <DropdownItem label={t("common.english")} selected={pref === "en"} onPress={() => applyLanguage("en")} disabled={changingLang} />
              <DropdownItem label={t("common.polish")} selected={pref === "pl"} onPress={() => applyLanguage("pl")} disabled={changingLang} />
              <DropdownItem label={t("common.italian")} selected={pref === "it"} onPress={() => applyLanguage("it")} disabled={changingLang} />
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setUnitExpanded(v => !v);
            }}
            style={s.row}
          >
            <View style={s.rowLeft}>
              <Ionicons name="scale-outline" size={18} color={colors.subtext} />
              <Text style={s.rowLabel}>{t("settings.weight")}</Text>
            </View>
            <View style={s.rowRight}>
              <Text style={s.rowValue}>{unitsLabel}</Text>
              <Ionicons name={unitExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.subtext} />
            </View>
          </TouchableOpacity>

          {unitExpanded && (
            <View style={s.dropdown}>
              <DropdownItem label="kg" selected={units === "kg"} onPress={() => applyUnits("kg")} disabled={savingUnits || units === null} />
              <DropdownItem label="lbs" selected={units === "lbs"} onPress={() => applyUnits("lbs")} disabled={savingUnits || units === null} />
            </View>
          )}
        </Section>

        <Section title={t("settings.account")}>
          <Row onPress={() => nav.navigate("Profile" as never)} leftIcon="person-outline" label={t("settings.profile")} value={t("common.edit")} />
          <Row onPress={onClearCloudData} leftIcon="trash-outline" label={t("settings.clear_account_data")} />
        </Section>

        <Section title={t("settings.data_privacy")}>
          <Row onPress={() => openLegalUrl(PRIVACY_URL)} leftIcon="shield-checkmark-outline" label={t("premium.privacy")} />
          <Row onPress={() => openLegalUrl(TERMS_URL)} leftIcon="document-text-outline" label={t("premium.terms")} />
          <Row onPress={onResetAllData} leftIcon="reload-circle-outline" label={t("settings.reset_all")} />
          <Row onPress={confirmDeleteAccount} leftIcon="trash-outline" label={t("settings.delete_account")} />
        </Section>

        {loading ? <Text style={{ color: colors.subtext, marginTop: 8 }}>{t("common.loading")}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const DropdownItem = ({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) => (
  <TouchableOpacity
    style={[s.ddItem, selected && s.ddItemActive, disabled && { opacity: 0.6 }]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.9}
  >
    <Text style={[s.ddText, selected && s.ddTextActive]}>{label}</Text>
    {selected ? <Ionicons name="checkmark" size={16} color={colors.accent} /> : null}
  </TouchableOpacity>
);

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

function fallbackT(key: string) {
  const dict: Record<string, string> = {
    "common.loading": "Loading…",
    "common.cancel": "Cancel",
    "common.reset": "Reset",
    "common.delete": "Delete",
    "common.done": "Done",
    "common.error": "Error",
    "common.edit": "Edit",
    "common.english": "English",
    "common.polish": "Polski",
    "common.italian": "Italiano",

    "settings.title": "Settings",
    "settings.general": "General",
    "settings.language": "Language",
    "settings.system": "System",
    "settings.weight": "Weight unit",
    "settings.account": "Account",
    "settings.profile": "Profile",
    "settings.delete_account": "Delete account",
    "settings.data_privacy": "Data & Privacy",
    "settings.reset_all": "Reset all data",
    "settings.reset_all_hint":
      "You will be signed out, local settings will be cleared and the app will return to onboarding. Cloud data remains.",
    "settings.reset_error": "Could not reset data.",
    "settings.clear_account_data": "Clear account data",
    "settings.clear_account_data_hint":
      "This will delete your workouts, templates and custom exercises from the cloud. Continue?",
    "settings.cleared_ok": "Cloud data removed.",
    "settings.clear_failed": "Failed to wipe cloud data.",
    "settings.must_be_logged_in": "You must be logged in.",
    "settings.lang_update_failed": "Could not change language.",
    "settings.units_update_failed": "Could not update units.",
    "settings.func_url_error": "Functions base URL not resolved from client.",
    "settings.deletion_failed_message": "Account deletion failed.",
    "settings.deletion_failed_network": "Account deletion failed.",
    "settings.logs_tip": "Please try again in a moment.",
  };
  return dict[key] ?? key;
}

const s = StyleSheet.create({
  top: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing(2), paddingTop: spacing(2), paddingBottom: spacing(1),
  },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },

  sectionTitle: { color: colors.subtext, marginBottom: 8, fontWeight: "600" },

  row: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowLabel: { color: colors.text, fontSize: 16, fontWeight: "600" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowValue: { color: colors.subtext, fontWeight: "600" },

  dropdown: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, marginTop: 6, padding: spacing(1),
  },
  ddItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10,
  },
  ddItemActive: { backgroundColor: "#202329", borderWidth: 1, borderColor: colors.border },
  ddText: { color: colors.text, fontWeight: "600" },
  ddTextActive: { color: colors.text },
});
