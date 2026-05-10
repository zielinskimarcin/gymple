import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import Purchases from "react-native-purchases";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { AppLogo } from "../components/AppLogo";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useI18n } from "../i18n";
import { usePremium } from "../premium/PremiumProvider";
import { PaywallOverlay } from "../premium/PaywallOverlay";
import { isRevenueCatReady } from "../premium/revenuecat";
import { colors, spacing } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ENTITLEMENT_ID = "premium";

function isExpoGo() {
  return Constants.appOwnership === "expo";
}

export const PremiumScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { isPremium, refreshPremium } = usePremium();
  const [busy, setBusy] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const restorePurchases = useCallback(async () => {
    if (busy) return;
    if (isExpoGo()) {
      Alert.alert(t("premium.expo_title"), t("premium.expo_message"));
      return;
    }

    setBusy(true);
    try {
      if (!(await isRevenueCatReady())) {
        Alert.alert(t("premium.expo_title"), t("premium.expo_message"));
        return;
      }

      const info = await Purchases.restorePurchases();
      await refreshPremium();
      const active = Boolean(info.entitlements?.active?.[ENTITLEMENT_ID]);
      Alert.alert(
        active ? t("common.success") : t("premium.restore_done_title"),
        active ? t("premium.restore_success") : t("premium.restore_empty")
      );
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? t("premium.restore_failed"));
    } finally {
      setBusy(false);
    }
  }, [busy, refreshPremium, t]);

  const manageSubscriptions = useCallback(async () => {
    if (isExpoGo()) {
      Alert.alert(t("premium.expo_title"), t("premium.expo_message"));
      return;
    }

    try {
      if (!(await isRevenueCatReady())) {
        Alert.alert(t("premium.expo_title"), t("premium.expo_message"));
        return;
      }

      await Purchases.showManageSubscriptions();
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? t("premium.manage_failed"));
    }
  }, [t]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.top}>
        <Text style={s.topTitle}>{t("premium.title")}</Text>
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
        contentContainerStyle={{
          paddingHorizontal: spacing(2),
          paddingTop: spacing(1),
          paddingBottom: spacing(4) + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <AppLogo size={50} />
          </View>
          <Text style={s.h1}>{isPremium ? t("premium.active_title") : t("premium.upgrade_title")}</Text>
          <Text style={s.sub}>
            {isPremium ? t("premium.active_subtitle") : t("premium.upgrade_subtitle")}
          </Text>
        </View>

        <View style={s.statusCard}>
          <View style={s.statusIcon}>
            <Ionicons name={isPremium ? "checkmark" : "lock-open-outline"} size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.statusLabel}>{t("premium.status")}</Text>
            <Text style={s.statusTitle}>
              {isPremium ? t("premium.status_active") : t("premium.status_free")}
            </Text>
          </View>
        </View>

        {!isPremium ? (
          <TouchableOpacity
            style={s.primaryBtn}
            activeOpacity={0.9}
            onPress={() => setPaywallVisible(true)}
          >
            <Ionicons name="sparkles" size={16} color="#fff" />
            <Text style={s.primaryTxt}>{t("premium.cta_upgrade")}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.secondaryBtn} activeOpacity={0.9} onPress={manageSubscriptions}>
            <Text style={s.secondaryTxt}>{t("premium.manage_subscription")}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[s.ghostBtn, busy && { opacity: 0.6 }]}
          activeOpacity={0.9}
          disabled={busy}
          onPress={restorePurchases}
        >
          {busy ? <ActivityIndicator /> : <Text style={s.ghostTxt}>{t("premium.restore")}</Text>}
        </TouchableOpacity>

        <View style={s.features}>
          <Text style={s.sectionLabel}>{t("premium.includes")}</Text>
          <Feature icon="infinite" title={t("premium.feature_unlimited")} />
          <Feature icon="stats-chart-outline" title={t("premium.feature_stats")} />
          <Feature icon="cloud-upload-outline" title={t("premium.feature_backup")} />
        </View>

        <Text style={s.compliance}>{t("premium.compliance")}</Text>
      </ScrollView>

      <PaywallOverlay
        visible={paywallVisible}
        source="upgrade"
        onClose={() => setPaywallVisible(false)}
        onUnlock={async () => {
          await refreshPremium();
          setPaywallVisible(false);
        }}
      />
    </SafeAreaView>
  );
};

const Feature = ({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) => (
  <View style={s.featureRow}>
    <View style={s.featureIcon}>
      <Ionicons name={icon} size={16} color="#fff" />
    </View>
    <Text style={s.featureText}>{title}</Text>
  </View>
);

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
    paddingBottom: spacing(1),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hero: {
    alignItems: "center",
    gap: 14,
    marginTop: spacing(1),
    marginBottom: spacing(2.4),
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.25 : 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  h1: { color: colors.text, fontSize: 24, fontWeight: "800", textAlign: "center" },
  sub: { color: colors.subtext, textAlign: "center", lineHeight: 20 },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2),
  },
  statusIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
  },
  statusLabel: { color: colors.subtext, fontSize: 12 },
  statusTitle: { color: colors.text, fontWeight: "800", fontSize: 17, marginTop: 2 },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing(2.2),
    flexDirection: "row",
    gap: 10,
    marginTop: spacing(2),
  },
  primaryTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
  secondaryBtn: {
    backgroundColor: colors.card,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: spacing(1.8),
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing(2),
  },
  secondaryTxt: { color: colors.text, fontWeight: "800" },
  ghostBtn: {
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: spacing(1.6),
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing(1.2),
    minHeight: 48,
  },
  ghostTxt: { color: colors.subtext, fontWeight: "700" },
  features: { marginTop: spacing(3), gap: 10 },
  sectionLabel: { color: colors.subtext, fontWeight: "700", marginBottom: 2 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1.8),
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6452E",
  },
  featureText: { color: colors.text, fontWeight: "700", flex: 1 },
  compliance: {
    color: colors.subtext,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
    marginTop: spacing(3),
  },
});

export default PremiumScreen;
