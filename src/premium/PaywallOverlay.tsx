import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";
import AppLogo from "../components/AppLogo";
import { useI18n } from "../i18n";

import Purchases, { PurchasesPackage, CustomerInfo, PurchasesStoreProduct } from "react-native-purchases";
import Constants from "expo-constants";
import { isRevenueCatReady } from "./revenuecat";

type Props = {
  visible: boolean;
  source?: "limit" | "upgrade";
  onClose: () => void;
  onUnlock?: () => Promise<void> | void;
};

type Plan = "lifetime" | "monthly";

const PRODUCT_ID_MONTHLY = "com.gymple.premium.monthly";
const PRODUCT_ID_LIFETIME = "com.gymple.premium.life";
const ENTITLEMENT_ID = "premium";
const OFFERING_ID = "default";
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? "https://zielinskimarcin.github.io/gymple/privacy.html";
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL ?? "https://zielinskimarcin.github.io/gymple/terms.html";

function isExpoGo() {
  return Constants.appOwnership === "expo";
}

function hasEntitlement(info: CustomerInfo | null): boolean {
  if (!info) return false;
  return Boolean(info.entitlements?.active?.[ENTITLEMENT_ID]);
}

function getProductIdFromPackage(p: PurchasesPackage): string {
  const id =
    (p.product as any)?.identifier ??
    (p as any)?.productIdentifier ??
    "";
  return String(id);
}

function getProductId(product: PurchasesStoreProduct | null): string {
  if (!product) return "";
  const p = product as any;
  return String(p.identifier ?? p.productIdentifier ?? "");
}

function pickPackageForPlan(packages: PurchasesPackage[], plan: Plan): PurchasesPackage | null {
  if (!packages?.length) return null;

  const wantedId = plan === "monthly" ? PRODUCT_ID_MONTHLY : PRODUCT_ID_LIFETIME;

  const match = packages.find((p) => {
    const pid = getProductIdFromPackage(p);
    return pid.toLowerCase() === wantedId.toLowerCase();
  });

  return match ?? null;
}

function pickProductForPlan(products: PurchasesStoreProduct[], plan: Plan): PurchasesStoreProduct | null {
  if (!products?.length) return null;

  const wantedId = plan === "monthly" ? PRODUCT_ID_MONTHLY : PRODUCT_ID_LIFETIME;
  return products.find((product) => getProductId(product).toLowerCase() === wantedId.toLowerCase()) ?? null;
}

function getProductPriceString(product: PurchasesStoreProduct | null): string {
  if (!product) return "—";
  const p = product as any;
  return String(p.priceString ?? p.price ?? "—");
}

function getPackagePriceString(pack: PurchasesPackage | null, fallbackProduct: PurchasesStoreProduct | null): string {
  const fallbackPrice = getProductPriceString(fallbackProduct);
  if (fallbackPrice !== "—") return fallbackPrice;
  if (!pack) return "—";
  const product = pack.product as any;
  return String(product?.priceString ?? product?.price ?? "—");
}

export const PaywallOverlay: React.FC<Props> = ({ visible, source = "upgrade", onClose, onUnlock }) => {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(visible);
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("lifetime");

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [products, setProducts] = useState<PurchasesStoreProduct[]>([]);
  const [rcReady, setRcReady] = useState(false);
  const [loadingOfferings, setLoadingOfferings] = useState(false);

  const insets = useSafeAreaInsets();

  const fadeBackdrop = useRef(new Animated.Value(0)).current;
  const slideSheet = useRef(new Animated.Value(24)).current;
  const heroFade = useRef(new Animated.Value(0)).current;
  const ctaFade = useRef(new Animated.Value(0)).current;
  const plansFade = useRef(new Animated.Value(0)).current;
  const dividerFade = useRef(new Animated.Value(0)).current;
  const featuresFade = useRef(new Animated.Value(0)).current;
  const footerFade = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    setMounted(true);
    setClosing(false);
    fadeBackdrop.setValue(0);
    slideSheet.setValue(24);
    [heroFade, ctaFade, plansFade, dividerFade, featuresFade, footerFade].forEach((v) =>
      v.setValue(0)
    );

    Animated.parallel([
      Animated.timing(fadeBackdrop, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideSheet, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      const items = [heroFade, ctaFade, plansFade, dividerFade, featuresFade, footerFade];
      Animated.stagger(
        70,
        items.map((v) =>
          Animated.timing(v, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          })
        )
      ).start();
    });
  };

  const animateOutThenClose = () => {
    if (closing) return;
    setClosing(true);
    Animated.parallel([
      Animated.timing(fadeBackdrop, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideSheet, {
        toValue: 24,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
        setClosing(false);
        onClose();
      }
    });
  };

  const loadOfferings = useCallback(async (): Promise<{
    packages: PurchasesPackage[];
    products: PurchasesStoreProduct[];
  }> => {
    setLoadingOfferings(true);

    if (isExpoGo()) {
      setRcReady(false);
      setPackages([]);
      setProducts([]);
      setLoadingOfferings(false);
      return { packages: [], products: [] };
    }

    try {
      if (!(await isRevenueCatReady())) {
        setRcReady(false);
        setPackages([]);
        setProducts([]);
        return { packages: [], products: [] };
      }

      let packs: PurchasesPackage[] = [];
      let storeProducts: PurchasesStoreProduct[] = [];

      try {
        const offerings = await Purchases.getOfferings();
        const current = offerings?.current;
        const byId = offerings?.all?.[OFFERING_ID];
        const offering = byId ?? current;
        packs = offering?.availablePackages ?? [];
      } catch {
        packs = [];
      }

      try {
        storeProducts = await Purchases.getProducts([PRODUCT_ID_LIFETIME, PRODUCT_ID_MONTHLY]);
      } catch {
        storeProducts = [];
      }

      setPackages(packs);
      setProducts(storeProducts ?? []);
      setRcReady(true);
      return { packages: packs, products: storeProducts ?? [] };
    } catch {
      setRcReady(false);
      setPackages([]);
      setProducts([]);
      return { packages: [], products: [] };
    } finally {
      setLoadingOfferings(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!visible) return;

      animateIn();
      await loadOfferings();

      try {
        if (!(await isRevenueCatReady())) return;
        const info = await Purchases.getCustomerInfo();
        if (!alive) return;
        if (hasEntitlement(info)) {
          animateOutThenClose();
        }
      } catch {
      }
    })();

    return () => {
      alive = false;
    };
  }, [visible]);

  if (!mounted) return null;

  async function handleUnlock() {
    if (busy) return;

    if (isExpoGo()) {
      Alert.alert(t("premium.expo_title"), t("premium.expo_message"));
      return;
    }

    setBusy(true);
    try {
      let availablePackages = packages;
      let availableProducts = products;
      if (!rcReady || !availablePackages.length) {
        const loaded = await loadOfferings();
        availablePackages = loaded.packages;
        availableProducts = loaded.products;
      }

      const pack = pickPackageForPlan(availablePackages, selectedPlan);
      const product = pickProductForPlan(availableProducts, selectedPlan);
      if (!pack && !product) {
        Alert.alert(
          t("premium.product_missing_title"),
          `${t("premium.product_missing_message")}\n\n${selectedPlan === "monthly" ? PRODUCT_ID_MONTHLY : PRODUCT_ID_LIFETIME}`
        );
        return;
      }

      const { customerInfo } = pack
        ? await Purchases.purchasePackage(pack)
        : await Purchases.purchaseStoreProduct(product!);

      if (!hasEntitlement(customerInfo)) {
        Alert.alert(
          t("premium.purchase_inactive_title"),
          `${t("premium.purchase_inactive_message")}\n\n${ENTITLEMENT_ID}`
        );
        return;
      }

      if (onUnlock) await onUnlock();
      animateOutThenClose();
    } catch (e: any) {
      if (String(e?.userCancelled).toLowerCase() === "true") return;
      Alert.alert(t("common.error"), e?.message ?? t("premium.purchase_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
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
      if (hasEntitlement(info)) {
        if (onUnlock) await onUnlock();
        animateOutThenClose();
      } else {
        Alert.alert(t("premium.restore_done_title"), t("premium.restore_empty"));
      }
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? t("premium.restore_failed"));
    } finally {
      setBusy(false);
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

  const lifetimePackage = pickPackageForPlan(packages, "lifetime");
  const monthlyPackage = pickPackageForPlan(packages, "monthly");
  const lifetimeProduct = pickProductForPlan(products, "lifetime");
  const monthlyProduct = pickProductForPlan(products, "monthly");
  const pricesUnavailable = !loadingOfferings && ((!lifetimePackage && !lifetimeProduct) || (!monthlyPackage && !monthlyProduct));
  const headline =
    source === "limit" ? t("premium.limit_title") : t("premium.upgrade_title");
  const subtitle =
    source === "limit" ? t("premium.limit_subtitle") : t("premium.upgrade_subtitle");

  return (
    <View style={s.root} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={animateOutThenClose}>
        <Animated.View style={[s.backdrop, { opacity: fadeBackdrop }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[s.sheet, { transform: [{ translateY: slideSheet }] }]}>
        <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
          <View style={[s.topBar, { paddingTop: Math.max(insets.top, 6) }]}>
            <TouchableOpacity
              onPress={animateOutThenClose}
              activeOpacity={0.9}
              style={s.topClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            bounces
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: spacing(2),
              paddingBottom: spacing(5) + insets.bottom,
            }}
          >
            <Animated.View style={{ opacity: heroFade }}>
              <View style={{ alignItems: "center", gap: 14, marginTop: spacing(1), marginBottom: spacing(2.2) }}>
                <View style={s.heroLogoWrap}>
                  <AppLogo size={50} />
                </View>

                <Text style={s.h1}>{headline}</Text>
                <Text style={s.sub} numberOfLines={3}>
                  {subtitle}
                </Text>
              </View>
            </Animated.View>

            <Animated.View style={{ opacity: plansFade }}>
              <View style={{ gap: 12, marginTop: spacing(2) }}>
                <PlanCard
                  title={t("premium.lifetime_title")}
                  note={t("premium.lifetime_note")}
                  price={loadingOfferings ? t("premium.loading_price") : getPackagePriceString(lifetimePackage, lifetimeProduct)}
                  best
                  bestLabel={t("premium.best_value")}
                  selected={selectedPlan === "lifetime"}
                  onPress={() => setSelectedPlan("lifetime")}
                />
                <PlanCard
                  title={t("premium.monthly_title")}
                  note={t("premium.monthly_note")}
                  price={loadingOfferings ? t("premium.loading_price") : getPackagePriceString(monthlyPackage, monthlyProduct)}
                  selected={selectedPlan === "monthly"}
                  onPress={() => setSelectedPlan("monthly")}
                />
                <Text style={s.microNote}>{t("premium.micro_note")}</Text>
                {pricesUnavailable ? (
                  <Text style={s.priceWarning}>{t("premium.prices_unavailable")}</Text>
                ) : null}
              </View>
            </Animated.View>

            <Animated.View style={{ opacity: ctaFade }}>
              <TouchableOpacity
                onPress={handleUnlock}
                activeOpacity={0.9}
                style={[s.primaryBtn, busy && { opacity: 0.7 }]}
                disabled={busy}
              >
                <Ionicons name="barbell" size={16} color="#fff" />
                <Text style={s.primaryTxt}>
                  {selectedPlan === "lifetime" ? t("premium.buy_lifetime") : t("premium.buy_monthly")}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ opacity: dividerFade }}>
              <View style={s.dividerRow}>
                <View style={s.divider} />
                <Text style={s.dividerTxt}>{t("premium.or")}</Text>
                <View style={s.divider} />
              </View>
              <TouchableOpacity onPress={animateOutThenClose} activeOpacity={0.85} style={{ alignSelf: "center" }}>
                <Text style={s.manageLink}>{t("premium.manage_workouts")}</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ opacity: featuresFade }}>
              <View style={{ gap: 12, marginTop: spacing(2.6) }}>
                <Text style={s.sectionLabel}>{t("premium.includes")}</Text>
                <Feature icon="infinite" title={t("premium.feature_unlimited")} desc={t("premium.feature_unlimited_desc")} />
                <Feature icon="stats-chart-outline" title={t("premium.feature_stats")} desc={t("premium.feature_stats_desc")} />
                <Feature icon="cloud-upload-outline" title={t("premium.feature_backup")} desc={t("premium.feature_backup_desc")} />
              </View>
            </Animated.View>

            <Animated.View style={{ opacity: footerFade }}>
              <View style={{ marginTop: spacing(3), paddingTop: spacing(1.4) }}>
                <View style={s.footerRow}>
                  <TouchableOpacity activeOpacity={0.85} onPress={handleRestore}><Text style={s.footerLink}>{t("premium.restore")}</Text></TouchableOpacity>
                  <Text style={s.footerDot}>•</Text>
                  <TouchableOpacity activeOpacity={0.85} onPress={() => openLegalUrl(TERMS_URL)}><Text style={s.footerLink}>{t("premium.terms")}</Text></TouchableOpacity>
                  <Text style={s.footerDot}>•</Text>
                  <TouchableOpacity activeOpacity={0.85} onPress={() => openLegalUrl(PRIVACY_URL)}><Text style={s.footerLink}>{t("premium.privacy")}</Text></TouchableOpacity>
                </View>
                <Text style={s.compliance}>
                  {t("premium.compliance")}
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const PlanCard = ({
  title,
  note,
  price,
  best,
  bestLabel,
  selected,
  onPress,
}: {
  title: string;
  note: string;
  price: string;
  best?: boolean;
  bestLabel?: string;
  selected?: boolean;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.9}
    style={[s.planCard, selected && { borderColor: colors.accent, borderWidth: 2 }]}
  >
    <View style={{ gap: 2, flex: 1 }}>
      <Text style={s.planTitle}>{title}</Text>
      <Text style={s.planNote}>{note}</Text>
    </View>
    <View style={{ alignItems: "flex-end", minWidth: 86 }}>
      {best ? <Text style={s.badge}>{bestLabel}</Text> : null}
      <Text style={s.planPrice}>{price}</Text>
    </View>
  </TouchableOpacity>
);

const Feature = ({
  icon,
  title,
  desc,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}) => (
  <View style={s.featureRow}>
    <View style={s.featureIconWrap}>
      <Ionicons name={icon} size={16} color="#fff" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={s.featureTitle}>{title}</Text>
      <Text style={s.featureDesc}>{desc}</Text>
    </View>
  </View>
);

const s = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.9)" },
  sheet: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.bg },
  safe: { flex: 1 },

  topBar: { minHeight: 44, paddingHorizontal: spacing(1.2), alignItems: "flex-end", justifyContent: "center" },
  topClose: {
    position: "absolute",
    right: spacing(1.2),
    top: spacing(1.2),
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  heroLogoWrap: {
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
  h1: { color: colors.text, fontSize: 22, fontWeight: "800", textAlign: "center", lineHeight: 28, marginHorizontal: spacing(1) },
  sub: { color: colors.subtext, textAlign: "center", lineHeight: 20, marginHorizontal: spacing(1) },

  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing(2.4),
    flexDirection: "row",
    gap: 10,
    marginTop: spacing(2),
  },
  primaryTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },

  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(2),
  },
  planTitle: { color: colors.text, fontWeight: "800" },
  planNote: { color: colors.subtext, fontSize: 12, lineHeight: 16 },
  planPrice: { color: colors.text, fontWeight: "800", marginTop: 6, fontSize: 16 },
  badge: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: "rgba(255,122,51,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 6,
  },

  microNote: { color: colors.subtext, fontSize: 12, textAlign: "center", marginTop: spacing(0.4) },
  priceWarning: { color: colors.subtext, fontSize: 12, textAlign: "center", lineHeight: 16 },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: spacing(2.2) },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerTxt: { color: colors.subtext, fontSize: 12 },
  manageLink: { color: colors.text, textDecorationLine: "underline", fontWeight: "600" },

  sectionLabel: { color: colors.subtext, fontWeight: "700", marginBottom: 6 },

  featureRow: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(1.6),
    paddingHorizontal: spacing(1.8),
  },
  featureIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6452E",
  },
  featureTitle: { color: colors.text, fontWeight: "800" },
  featureDesc: { color: colors.subtext, fontSize: 12, lineHeight: 17 },

  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8, marginTop: spacing(1.6) },
  footerLink: { color: colors.subtext },
  footerDot: { color: colors.border },
  compliance: { color: colors.subtext, fontSize: 12, textAlign: "center", lineHeight: 16 },
});
