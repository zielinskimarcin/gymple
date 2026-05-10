// src/premium/PaywallOverlay.tsx
import React, { useEffect, useRef, useState } from "react";
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
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";

type Props = {
  visible: boolean;
  onClose: () => void;   // X / backdrop / “Manage workouts”
  onUnlock?: () => void; // future IAP; no-op for now
};

export const PaywallOverlay: React.FC<Props> = ({ visible, onClose, onUnlock }) => {
  const [mounted, setMounted] = useState(visible);
  const [closing, setClosing] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  const insets = useSafeAreaInsets();

  const animateIn = () => {
    setMounted(true);
    setClosing(false);
    fade.setValue(0);
    slide.setValue(24);
    setFaqOpen(null);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  const animateOutThenClose = () => {
    if (closing) return;
    setClosing(true);
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 24, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
        setClosing(false);
        onClose();
      }
    });
  };

  useEffect(() => {
    if (visible) animateIn();
    else if (mounted) animateOutThenClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  return (
    <View style={s.root} pointerEvents="box-none">
      {/* backdrop – tap closes */}
      <TouchableWithoutFeedback onPress={animateOutThenClose}>
        <Animated.View style={[s.backdrop, { opacity: fade }]} />
      </TouchableWithoutFeedback>

      {/* sheet */}
      <Animated.View style={[s.sheet, { transform: [{ translateY: slide }] }]}>
        <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
          {/* top bar + X */}
          <View style={[s.topBar, { paddingTop: Math.max(insets.top, 6) }]}>
            <Text style={s.topTitle}>Premium</Text>
            <TouchableOpacity onPress={animateOutThenClose} activeOpacity={0.9} style={s.topClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* content (scrollable) */}
          <ScrollView
            bounces
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: spacing(2), paddingBottom: spacing(4) + insets.bottom }}
          >
            {/* hero */}
            <View style={{ alignItems: "center", gap: 10, marginBottom: spacing(2) }}>
              <View style={s.heroIcon}><Ionicons name="sparkles" size={20} color="#fff" /></View>
              <Text style={s.h1}>Free plan limit reached</Text>
              <Text style={s.sub} numberOfLines={3}>
                Keep saving workouts with Premium — or remove older ones to stay on Free.
              </Text>
            </View>

            {/* main CTA */}
            <TouchableOpacity onPress={onUnlock} activeOpacity={0.9} style={s.primaryBtn}>
              <Ionicons name="barbell" size={16} color="#0E0E10" />
              <Text style={s.primaryTxt}>Unlock Premium</Text>
            </TouchableOpacity>

            {/* plans (clean, spaced) */}
            <View style={{ gap: 12, marginTop: spacing(2) }}>
              <PlanCard title="Monthly" note="Renews monthly — cancel anytime" price="$2.99/mo" onPress={onUnlock} />
              <PlanCard title="Lifetime Access" note="One-time purchase" price="$24.99" best onPress={onUnlock} />
              <Text style={s.microNote}>Cancel anytime • Managed by the App Store</Text>
            </View>

            {/* divider + manage */}
            <View style={s.dividerRow}>
              <View style={s.divider} />
              <Text style={s.dividerTxt}>or</Text>
              <View style={s.divider} />
            </View>
            <TouchableOpacity onPress={animateOutThenClose} activeOpacity={0.85} style={{ alignSelf: "center" }}>
              <Text style={s.manageLink}>Manage workouts (remove older)</Text>
            </TouchableOpacity>

            {/* FAQ (kept, minimal) */}
            <View style={{ gap: 8, marginTop: spacing(2) }}>
              <Text style={s.sectionLabel}>FAQ</Text>
              <FAQ i={0} open={faqOpen} setOpen={setFaqOpen} q="Can I stay on the free plan?" a="Yes. Delete older workouts to stay under the free limit." />
              <FAQ i={1} open={faqOpen} setOpen={setFaqOpen} q="Can I cancel anytime?" a="Yes. You can cancel anytime in the App Store settings." />
              <FAQ i={2} open={faqOpen} setOpen={setFaqOpen} q="Will my data remain after canceling?" a="Yes. You keep access to your data. Saving new workouts requires Premium or freeing space." />
            </View>

            {/* footer compliance */}
            <View style={{ marginTop: spacing(2), borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing(1.5) }}>
              <View style={s.footerRow}>
                <TouchableOpacity activeOpacity={0.85}><Text style={s.footerLink}>Restore</Text></TouchableOpacity>
                <Text style={s.footerDot}>•</Text>
                <TouchableOpacity activeOpacity={0.85}><Text style={s.footerLink}>Terms</Text></TouchableOpacity>
                <Text style={s.footerDot}>•</Text>
                <TouchableOpacity activeOpacity={0.85}><Text style={s.footerLink}>Privacy</Text></TouchableOpacity>
              </View>
              <Text style={s.compliance}>
                Payments and subscriptions are processed by the App Store. Privacy Policy and Terms apply.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const PlanCard = ({ title, note, price, best, onPress }: { title: string; note: string; price: string; best?: boolean; onPress?: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[s.planCard, best && s.planActive]}>
    <View style={{ gap: 2, flex: 1 }}>
      <Text style={s.planTitle}>{title}</Text>
      <Text style={s.planNote}>{note}</Text>
    </View>
    <View style={{ alignItems: "flex-end", minWidth: 80 }}>
      {best ? <Text style={s.badge}>Best value</Text> : null}
      <Text style={s.planPrice}>{price}</Text>
    </View>
  </TouchableOpacity>
);

const FAQ = ({ i, open, setOpen, q, a }: { i: number; open: number | null; setOpen: (i: number | null) => void; q: string; a: string }) => {
  const expanded = open === i;
  return (
    <View style={s.faqCard}>
      <TouchableOpacity onPress={() => setOpen(expanded ? null : i)} activeOpacity={0.9} style={s.faqHeader}>
        <Text style={s.faqQ}>{q}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.subtext} />
      </TouchableOpacity>
      {expanded ? <Text style={s.faqA}>{a}</Text> : null}
    </View>
  );
};

const s = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.9)" },
  sheet: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.bg },
  safe: { flex: 1 },

  topBar: {
    minHeight: 56,
    paddingHorizontal: spacing(1.2),
    borderBottomWidth: 1, borderBottomColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  topTitle: { color: colors.text, fontWeight: "800" },
  topClose: {
    position: "absolute", right: spacing(1.2),
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },

  heroIcon: {
    width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center",
    backgroundColor: "#E6452E",
    shadowColor: "#E6452E", shadowOpacity: Platform.OS === "ios" ? 0.35 : 0.5, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  h1: { color: colors.text, fontSize: 20, fontWeight: "800", textAlign: "center" },
  sub: { color: colors.subtext, textAlign: "center" },

  primaryBtn: {
    backgroundColor: colors.accent, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    paddingVertical: spacing(1.8), flexDirection: "row", gap: 8,
  },
  primaryTxt: { color: "#0E0E10", fontWeight: "800" },

  planCard: {
    flexDirection: "row", alignItems: "center",
    gap: 12,
    backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing(1.4), paddingHorizontal: spacing(1.6),
  },
  planActive: { borderColor: colors.accent },
  planTitle: { color: colors.text, fontWeight: "800" },
  planNote: { color: colors.subtext, fontSize: 12 },
  planPrice: { color: colors.text, fontWeight: "800", marginTop: 2 },
  badge: {
    color: colors.accent, fontSize: 11, fontWeight: "700",
    backgroundColor: "rgba(255,122,51,0.15)",
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginBottom: 6,
  },

  microNote: { color: colors.subtext, fontSize: 12, textAlign: "center" },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: spacing(1.8) },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerTxt: { color: colors.subtext, fontSize: 12 },
  manageLink: { color: colors.text, textDecorationLine: "underline", fontWeight: "600" },

  sectionLabel: { color: colors.subtext, fontWeight: "700" },

  faqCard: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  faqHeader: {
    paddingHorizontal: spacing(1.5), paddingVertical: spacing(1.2),
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  faqQ: { color: colors.text, fontWeight: "700" },
  faqA: { color: colors.subtext, paddingHorizontal: spacing(1.5), paddingBottom: spacing(1.4) },

  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8, marginTop: spacing(1.2) },
  footerLink: { color: colors.subtext },
  footerDot: { color: colors.border },
  compliance: { color: colors.subtext, fontSize: 12, textAlign: "center" },
});