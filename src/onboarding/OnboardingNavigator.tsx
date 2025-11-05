// src/onboarding/OnboardingNavigator.tsx
import React, { useEffect, useRef, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";
import {
  saveOnbDraft,
  getOnbDraft,
  markOnboardingDone,
  clearAfterSignupNeeded,
} from "../storage/onboarding";
import { setPendingProfile, applyPendingProfileOnce } from "../storage/pendingProfile";

type OnbStackParam = { Name: undefined; Goal: undefined; Focus: undefined };
const Stack = createNativeStackNavigator<OnbStackParam>();

/* ---------- helpery animacji ---------- */
function animateOut(fade: Animated.Value, slide: Animated.Value, duration = 160) {
  return new Promise<void>((resolve) => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0.9, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 6, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(() => resolve());
  });
}
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationTypeForReplace: "push",
      }}
    >
      <Stack.Screen name="Name" component={StepName} />
      <Stack.Screen name="Goal" component={StepGoal} />
      <Stack.Screen name="Focus" component={StepFocus} />
    </Stack.Navigator>
  );
}

/* ---------- Step 1: Name ---------- */
function StepName({ navigation }: any) {
  const [name, setName] = useState("");
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const d = await getOnbDraft();
      if (d?.name) setName(d.name);
    })();
  }, []);

  const canContinue = name.trim().length > 0;

  async function next() {
    if (!canContinue) return;
    await saveOnbDraft({ name: name.trim() });
    await animateOut(fade, slide, 160);
    navigation.replace("Goal");
  }

  return (
    <SafeAreaView style={s.safe}>
      <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
        <View style={s.progressRow}>
          <View style={[s.progressDot, s.dotActive]} />
          <View style={s.progressDot} />
          <View style={s.progressDot} />
        </View>

        <Text style={s.h1}>What's your name?</Text>
        <Text style={s.sub}>Let's personalize your experience</Text>

        <TextInput
          placeholder="Enter your name"
          placeholderTextColor={colors.subtext}
          style={s.input}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={next}
        />
      </Animated.View>

      <TouchableOpacity
        style={[s.ctaBottom, { bottom: insets.bottom + spacing(2.5), opacity: canContinue ? 1 : 0.5 }]}
        onPress={next}
        disabled={!canContinue}
        activeOpacity={0.9}
      >
        <Text style={s.ctaTxt}>
          Continue <Text>›</Text>
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* ---------- Step 2: Goal ---------- */
function StepGoal({ navigation }: any) {
  const [n, setN] = useState(3);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const d = await getOnbDraft();
      if (d?.workoutsPerWeek) setN(d.workoutsPerWeek);
    })();
  }, []);

  async function next() {
    await saveOnbDraft({ workoutsPerWeek: n });
    navigation.replace("Focus");
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.progressRow}>
        <View style={[s.progressDot, s.dotActive]} />
        <View style={[s.progressDot, s.dotActive]} />
        <View style={s.progressDot} />
      </View>

      <Text style={s.h1}>Your goal</Text>
      <Text style={s.sub}>How many times per week do you plan to train?</Text>

      <View style={s.counterCard}>
        <View style={s.counterRow}>
          <TouchableOpacity onPress={() => setN((x) => Math.max(1, x - 1))} style={s.counterBtn}>
            <Text style={s.counterBtnTxt}>−</Text>
          </TouchableOpacity>
          <Text style={s.counterValue}>{n}</Text>
          <TouchableOpacity onPress={() => setN((x) => Math.min(14, x + 1))} style={s.counterBtn}>
            <Text style={s.counterBtnTxt}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.counterHint}>workouts / week</Text>
        <View style={s.divider} />
        <Text style={s.helper}>We'll use this to calibrate your weekly progress bar</Text>
      </View>

      <TouchableOpacity
        style={[s.ctaBottom, { bottom: insets.bottom + spacing(2.5) }]}
        onPress={next}
        activeOpacity={0.9}
      >
        <Text style={s.ctaTxt}>
          Continue <Text>›</Text>
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* ---------- Step 3: Focus ---------- */
function StepFocus() {
  const [focus, setFocus] = useState<"strength" | "hypertrophy" | "endurance" | "mixed" | null>(null);
  const [finishing, setFinishing] = useState(false);
  const insets = useSafeAreaInsets();

  const fade = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const d = await getOnbDraft();
      if (d?.focus) setFocus(d.focus);
    })();
  }, []);

  const canFinish = !!focus;

  async function finish(final?: "strength" | "hypertrophy" | "endurance" | "mixed") {
    if (finishing) return;
    setFinishing(true);

    // 1) zapisz wybór (jeśli jest) do draftu i pendingProfile
    const chosen = final ?? focus ?? undefined;
    if (chosen) await saveOnbDraft({ focus: chosen });

    const d = await getOnbDraft();
    await setPendingProfile({
      display_name: d?.name?.trim(),
      workouts_per_week: d?.workoutsPerWeek,
      focus: chosen as any,
    });

    // 2) seed do Supabase po zalogowaniu — z bezpiecznym timeoutem (żeby spinner nie wisiał)
    await Promise.race([applyPendingProfileOnce(), delay(2500)]).catch(() => {});

    // 3) płynne wyjście + zamknięcie onboarding
    await animateOut(fade, slide, 140);
    await markOnboardingDone(true);
    await clearAfterSignupNeeded();

    // 4) zostaw mały bufor — Root przełączy się na AppNavigator po zmianie flagi
    setTimeout(() => setFinishing(false), 120);
  }

  const Box = ({ id, label, icon }: any) => {
    const active = focus === id;
    return (
      <TouchableOpacity onPress={() => setFocus(id)} style={[s.box, active && s.boxActive]} activeOpacity={0.9}>
        <View style={s.boxIcon}>
          <Ionicons name={icon} size={20} color={colors.text} />
        </View>
        <Text style={s.boxTxt}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <Animated.View style={{ opacity: finishing ? 0.85 : 1, transform: [{ translateY: slide }] }}>
        <View style={s.progressRow}>
          <View style={[s.progressDot, s.dotActive]} />
          <View style={[s.progressDot, s.dotActive]} />
          <View style={[s.progressDot, focus && s.dotActive]} />
        </View>

        <Text style={s.h1}>Training focus</Text>
        <Text style={s.sub}>What's your main training goal?</Text>

        <View style={s.grid2}>
          <Box id="strength" label="Strength" icon="barbell-outline" />
          <Box id="hypertrophy" label="Hypertrophy" icon="flame-outline" />
          <Box id="endurance" label="Endurance" icon="pulse-outline" />
          <Box id="mixed" label="Mixed" icon="aperture-outline" />
        </View>
      </Animated.View>

      {/* Skip for now – NAD głównym CTA */}
      <TouchableOpacity
        style={[s.skip, { bottom: insets.bottom + spacing(2.5) + 58 }]}
        onPress={() => finish(undefined)}
        activeOpacity={0.85}
        disabled={finishing}
      >
        <Text style={s.skipTxt}>Skip for now</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.ctaBottom, { bottom: insets.bottom + spacing(2.5), opacity: canFinish ? 1 : 0.6 }]}
        onPress={() => finish()}
        disabled={!canFinish || finishing}
        activeOpacity={0.9}
      >
        <Text style={s.ctaTxt}>
          Get Started <Text>›</Text>
        </Text>
      </TouchableOpacity>

      {finishing && (
        <View style={s.overlay}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={s.overlayTxt}>Finishing setup…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ---------- styles ---------- */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing(2), paddingTop: spacing(2) },

  progressRow: { flexDirection: "row", gap: 10, marginTop: 4, marginBottom: spacing(2) },
  progressDot: { height: 6, flex: 1, backgroundColor: "#2a2d33", borderRadius: 4 },
  dotActive: { backgroundColor: colors.accent },

  h1: { color: colors.text, fontSize: 28, fontWeight: "800", marginTop: 6 },
  sub: { color: colors.subtext, marginTop: 8, marginBottom: spacing(2.4) },

  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },

  ctaBottom: {
    position: "absolute",
    left: spacing(2),
    right: spacing(2),
    backgroundColor: colors.accent,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing(2.2),
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  ctaTxt: { color: "#0E0E10", fontWeight: "800" },

  counterCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2),
    marginTop: spacing(2),
    alignItems: "center",
  },
  counterRow: { flexDirection: "row", alignItems: "center", gap: 28 },
  counterBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnTxt: { color: colors.text, fontSize: 26, fontWeight: "800" },
  counterValue: { color: colors.text, fontSize: 44, fontWeight: "800" },
  counterHint: { color: colors.subtext, marginTop: 10 },
  divider: { height: 1, alignSelf: "stretch", backgroundColor: colors.border, marginVertical: spacing(2) },
  helper: { color: colors.subtext, textAlign: "center" },

  grid2: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: spacing(2) },
  box: {
    width: "47%",
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2),
  },
  boxActive: { borderColor: colors.accent },
  boxIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  boxTxt: { color: colors.text, fontWeight: "700" },

  skip: { position: "absolute", left: spacing(2), right: spacing(2), alignItems: "center" },
  skipTxt: { color: colors.subtext },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 20,
  },
  overlayTxt: { marginTop: 10, color: colors.subtext },
});