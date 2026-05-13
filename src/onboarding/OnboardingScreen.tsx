import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing } from "../theme";
import AppLogo from "../components/AppLogo";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../i18n";
import { getPendingProfile } from "../storage/pendingProfile";

export type WeightUnit = "KG" | "LBS";
export type MainGoal = "mass" | "strength" | "endurance" | null;
export type ExperienceLevel = "beginner" | "intermediate" | "advanced" | null;

export type OnboardingData = {
  name: string;
  weight_unit: WeightUnit;
  main_goal: MainGoal;
  workouts_per_week: number;
  experience_level: ExperienceLevel;
};

type Props = {
  onDone: () => void;
};

export const OnboardingScreen: React.FC<Props> = ({ onDone }) => {
  const { session } = useAuth() as any;
  const userId: string | null = session?.user?.id ?? null;

  const i = useI18n();
  const t = useCallback((key: string) => i?.t(key) ?? key, [i]);

  const fmt = useCallback(
    (key: string, vars: Record<string, string | number>) => {
      let s = t(key);
      for (const [k, v] of Object.entries(vars)) {
        s = s.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), String(v));
      }
      return s;
    },
    [t]
  );

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    weight_unit: "KG",
    main_goal: null,
    workouts_per_week: 3,
    experience_level: null,
  });

  const [saving, setSaving] = useState(false);

  const [skipGoalTouched, setSkipGoalTouched] = useState(false);
  const [skipExpTouched, setSkipExpTouched] = useState(false);

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [currentStep, anim]);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  }, [currentStep, data]);

  useEffect(() => {
    let alive = true;

    async function seedName() {
      if (!userId) return;

      try {
        const pending = await getPendingProfile();
        const pendingName = pending?.display_name?.trim();
        if (pendingName && alive) {
          setData((prev) => prev.name.trim() ? prev : { ...prev, name: pendingName });
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .maybeSingle();

        const profileName = String(profile?.display_name ?? "").trim();
        if (profileName && alive) {
          setData((prev) => prev.name.trim() ? prev : { ...prev, name: profileName });
        }
      } catch {
      }
    }

    seedName();
    return () => {
      alive = false;
    };
  }, [userId]);

  const ctaLabel = useMemo(() => {
    if (currentStep === 1) return t("onboarding.cta_start");
    if (currentStep === 4) return t("onboarding.cta_finish");
    if (currentStep === 3 && saving) return t("onboarding.cta_saving");
    return t("onboarding.cta_next");
  }, [currentStep, saving, t]);

  function handleBack() {
    if (currentStep === 1) return;
    setCurrentStep((prev) => (prev - 1) as any);
  }

  async function saveProfileOnce() {
    if (!userId) {
      Alert.alert(t("common.error"), t("onboarding.save_failed"));
      return false;
    }
    setSaving(true);
    try {
      const trimmedName = data.name.trim();
      const { error } = await supabase.from("profiles").upsert(
        {
          id: userId,
          display_name: trimmedName || null,
          weight_unit: data.weight_unit,
          main_goal: data.main_goal,
          workouts_per_week: data.workouts_per_week,
          experience_level: data.experience_level,
          onboarding_done: true,
        },
        { onConflict: "id" }
      );

      if (error) {
        Alert.alert(t("common.error"), t("onboarding.save_failed"));
        return false;
      }
      return true;
    } catch {
      Alert.alert(t("common.error"), t("onboarding.save_failed"));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    if (!canProceed || saving) return;

    if (currentStep === 1) {
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      const saved = await saveProfileOnce();
      if (!saved) return;
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      onDone();
    }
  }

  const contentAnimStyle = {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.container}>
          <View style={s.progressRow}>
            {[1, 2, 3, 4].map((step) => (
              <View key={step} style={s.progressOuter}>
                <View
                  style={[
                    s.progressInner,
                    currentStep >= step && s.progressInnerActive,
                  ]}
                />
              </View>
            ))}
          </View>

          <View style={s.topBar}>
            {currentStep > 1 ? (
              <TouchableOpacity
                onPress={handleBack}
                style={s.backBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 32, height: 32 }} />
            )}

            <Text style={s.stepLabel}>
              {fmt("onboarding.step_label", { current: currentStep, total: 4 })}
            </Text>

            <View style={{ width: 32, height: 32 }} />
          </View>

          <Animated.View style={[{ flex: 1 }, contentAnimStyle]}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: spacing(3) }}
              keyboardShouldPersistTaps="handled"
            >
              {currentStep === 1 && <StepIntro t={t} />}

              {currentStep === 2 && (
                <StepPersonal
                  data={data}
                  setData={setData}
                  t={t}
                  skipTouched={skipGoalTouched}
                  setSkipTouched={setSkipGoalTouched}
                />
              )}

              {currentStep === 3 && (
                <StepPlan
                  data={data}
                  setData={setData}
                  t={t}
                  fmt={fmt}
                  skipTouched={skipExpTouched}
                  setSkipTouched={setSkipExpTouched}
                />
              )}

              {currentStep === 4 && (
                <StepSummary data={data} t={t} fmt={fmt} />
              )}
            </ScrollView>
          </Animated.View>

          {currentStep === 4 && (
            <LinearGradient
              colors={[
                "rgba(14,14,16,0)",
                "rgba(14,14,16,0.65)",
                "rgba(14,14,16,0.95)",
              ]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={s.step4Fade}
              pointerEvents="none"
            />
          )}

          <View style={s.bottomBar}>
            <TouchableOpacity
              onPress={handleNext}
              disabled={!canProceed || saving}
              activeOpacity={0.9}
              style={[s.primaryBtn, (!canProceed || saving) && { opacity: 0.6 }]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={s.primaryTxt}>{ctaLabel}</Text>
                  <Ionicons
                    name={
                      currentStep === 4 ? "arrow-forward" : "chevron-forward"
                    }
                    size={18}
                    color="#fff"
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const StepIntro: React.FC<{ t: (k: string) => string }> = ({ t }) => {
  return (
    <View style={s.stepWrapCenter}>
      <View style={s.introLogoWrap}>
        <AppLogo size={72} />
      </View>

      <Text style={s.h1}>{t("onboarding.step1_title")}</Text>

      <View style={{ marginTop: spacing(1.5), gap: 6 }}>
        <Text style={s.introLineMain}>{t("onboarding.step1_line1")}</Text>
        <Text style={s.introLineSub}>{t("onboarding.step1_line2")}</Text>
      </View>
    </View>
  );
};

const StepPersonal: React.FC<{
  data: OnboardingData;
  setData: (d: OnboardingData) => void;
  t: (k: string) => string;
  skipTouched: boolean;
  setSkipTouched: (v: boolean) => void;
}> = ({ data, setData, t, skipTouched, setSkipTouched }) => {
  const goals: {
    id: MainGoal;
    label: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    {
      id: "mass",
      label: t("onboarding.goal_mass_title"),
      subtitle: t("onboarding.goal_mass_sub"),
      icon: "barbell-outline",
    },
    {
      id: "strength",
      label: t("onboarding.goal_weightloss_title"),
      subtitle: t("onboarding.goal_weightloss_sub"),
      icon: "scale-outline",
    },
    {
      id: "endurance",
      label: t("onboarding.goal_endurance_title"),
      subtitle: t("onboarding.goal_endurance_sub"),
      icon: "heart-outline",
    },
  ];

  return (
    <View style={s.stepWrap}>
      <View style={{ marginBottom: spacing(2) }}>
        <Text style={s.stepTitle}>{t("onboarding.step2_title")}</Text>
        <Text style={s.stepSubtitle}>{t("onboarding.step2_subtitle")}</Text>
      </View>

      <View style={{ marginBottom: spacing(2) }}>
        <Text style={s.label}>{t("onboarding.name_label")}</Text>
        <TextInput
          value={data.name}
          onChangeText={(name) => setData({ ...data, name })}
          placeholder={t("onboarding.name_placeholder")}
          placeholderTextColor={colors.subtext}
          style={s.input}
          autoCapitalize="words"
        />
      </View>

      <View style={{ marginBottom: spacing(2) }}>
        <Text style={s.label}>{t("onboarding.units_label")}</Text>
        <View style={s.toggleRow}>
          {(["KG", "LBS"] as WeightUnit[]).map((unit) => {
            const active = data.weight_unit === unit;
            return (
              <TouchableOpacity
                key={unit}
                onPress={() => setData({ ...data, weight_unit: unit })}
                activeOpacity={0.9}
                style={[s.toggleBtn, active && s.toggleBtnActive]}
              >
                <Text style={[s.toggleTxt, active && s.toggleTxtActive]}>
                  {unit.toLowerCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={s.label}>{t("onboarding.main_goal_label")}</Text>
        <View style={{ gap: 10 }}>
          {goals.map((g) => {
            const active = data.main_goal === g.id;
            return (
              <TouchableOpacity
                key={g.id}
                onPress={() => {
                  setData({ ...data, main_goal: g.id });
                  setSkipTouched(false);
                }}
                activeOpacity={0.9}
                style={[s.cardRow, active && s.cardRowActive]}
              >
                <View style={s.cardIconBox}>
                  <Ionicons name={g.icon} size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{g.label}</Text>
                  <Text style={s.cardSub}>{g.subtitle}</Text>
                </View>
                {active && (
                  <View style={s.cardCheck}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            setData({ ...data, main_goal: null });
            setSkipTouched(true);
          }}
          style={s.skipUnderCards}
        >
          <Text
            style={[
              s.skipUnderCardsTxt,
              skipTouched && s.skipUnderCardsTxtActive,
            ]}
          >
            {t("onboarding.skip")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const StepPlan: React.FC<{
  data: OnboardingData;
  setData: (d: OnboardingData) => void;
  t: (k: string) => string;
  fmt: (k: string, vars: Record<string, string | number>) => string;
  skipTouched: boolean;
  setSkipTouched: (v: boolean) => void;
}> = ({ data, setData, t, fmt, skipTouched, setSkipTouched }) => {
  const experienceLevels: { id: ExperienceLevel; label: string }[] = [
    { id: "beginner", label: t("onboarding.exp_beginner") },
    { id: "intermediate", label: t("onboarding.exp_intermediate") },
    { id: "advanced", label: t("onboarding.exp_advanced") },
  ];

  const workoutLabel =
    data.workouts_per_week === 1
      ? t("onboarding.workout_singular")
      : t("onboarding.workout_plural");

  function changeWorkouts(delta: number) {
    const next = Math.min(7, Math.max(1, data.workouts_per_week + delta));
    setData({ ...data, workouts_per_week: next });
  }

  return (
    <View style={s.stepWrap}>
      <View style={{ marginBottom: spacing(2) }}>
        <Text style={s.stepTitle}>{t("onboarding.step3_title")}</Text>
        <Text style={s.stepSubtitle}>{t("onboarding.step3_subtitle")}</Text>
      </View>

      <View style={{ marginBottom: spacing(2) }}>
        <Text style={s.label}>{t("onboarding.freq_label")}</Text>
        <View style={{ height: 10 }} />

        <View style={s.freqCard}>
          <View style={s.freqRow}>
            <TouchableOpacity
              onPress={() => changeWorkouts(-1)}
              activeOpacity={0.8}
              style={s.freqBtn}
            >
              <Ionicons name="remove" size={18} color={colors.text} />
            </TouchableOpacity>

            <View style={{ alignItems: "center" }}>
              <Text style={s.freqNumber}>{data.workouts_per_week}</Text>
              <Text style={s.freqCaption}>
                {fmt("onboarding.freq_caption", {
                  n: data.workouts_per_week,
                  label: workoutLabel,
                })}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => changeWorkouts(1)}
              activeOpacity={0.8}
              style={s.freqBtn}
            >
              <Ionicons name="add" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={s.freqBarsRow}>
            {Array.from({ length: 7 }).map((_, idx) => {
              const active = idx < data.workouts_per_week;
              return (
                <View
                  key={idx}
                  style={[s.freqBar, active && s.freqBarActive]}
                />
              );
            })}
          </View>
        </View>
      </View>

      <View>
        <Text style={s.label}>{t("onboarding.exp_label")}</Text>

        <View style={s.segmentCol}>
          {experienceLevels.map((lvl) => {
            const active = data.experience_level === lvl.id;
            return (
              <TouchableOpacity
                key={lvl.id}
                onPress={() => {
                  setData({ ...data, experience_level: lvl.id });
                  setSkipTouched(false);
                }}
                activeOpacity={0.9}
                style={[s.segmentBtnCol, active && s.segmentBtnColActive]}
              >
                <Text
                  style={[s.segmentTxtCol, active && s.segmentTxtColActive]}
                >
                  {lvl.label}
                </Text>
                {active ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            setData({ ...data, experience_level: null });
            setSkipTouched(true);
          }}
          style={s.skipUnderCards}
        >
          <Text
            style={[
              s.skipUnderCardsTxt,
              skipTouched && s.skipUnderCardsTxtActive,
            ]}
          >
            {t("onboarding.skip")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const StepSummary: React.FC<{
  data: OnboardingData;
  t: (k: string) => string;
  fmt: (k: string, vars: Record<string, string | number>) => string;
}> = ({ data, t, fmt }) => {
  const goalLabelMap: Record<Exclude<MainGoal, null>, string> = {
    mass: t("onboarding.goal_mass_title"),
    strength: t("onboarding.goal_weightloss_title"),
    endurance: t("onboarding.goal_endurance_title"),
  };

  const experienceLabelMap: Record<Exclude<ExperienceLevel, null>, string> = {
    beginner: t("onboarding.exp_beginner"),
    intermediate: t("onboarding.exp_intermediate"),
    advanced: t("onboarding.exp_advanced"),
  };

  const goalLabel = data.main_goal
    ? goalLabelMap[data.main_goal]
    : t("onboarding.later_note");

  const expLabel = data.experience_level
    ? experienceLabelMap[data.experience_level]
    : t("onboarding.later_note");

  const workoutLabel =
    data.workouts_per_week === 1
      ? t("onboarding.workout_singular")
      : t("onboarding.workout_plural");

  return (
    <View style={s.stepWrap}>
      <View style={s.stepWrapCenter}>
        <View style={s.doneIconWrap}>
          <Ionicons name="checkmark" size={32} color="#fff" />
        </View>
        <Text style={s.h1}>{t("onboarding.step4_title")}</Text>
        <Text style={s.stepSubtitle}>{t("onboarding.step4_subtitle")}</Text>
      </View>

      <View style={{ marginTop: spacing(2), gap: 10 }}>
        <SummaryCard
          label={t("onboarding.summary_name")}
          value={data.name || "-"}
        />
        <SummaryCard
          label={t("onboarding.summary_units")}
          value={data.weight_unit.toLowerCase()}
        />
        <SummaryCard label={t("onboarding.summary_goal")} value={goalLabel} />
        <SummaryCard
          label={t("onboarding.summary_plan")}
          value={fmt("onboarding.summary_plan_value", {
            n: data.workouts_per_week,
            label: workoutLabel,
          })}
        />
        <SummaryCard label={t("onboarding.summary_exp")} value={expLabel} />
      </View>

      <View style={s.motivationCard}>
        <Ionicons
          name="rocket-outline"
          size={20}
          color={colors.accent}
          style={{ marginRight: 10, marginTop: 2 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={s.motivationTitle}>
            {fmt("onboarding.motivation_title", {
              name: (data.name || "").trim()
                ? `, ${(data.name || "").trim()}`
                : "",
            })}
          </Text>
          <Text style={s.motivationText}>{t("onboarding.motivation_text")}</Text>
        </View>
      </View>
    </View>
  );
};

const SummaryCard: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <View style={s.summaryCard}>
    <Text style={s.summaryLabel}>{label}</Text>
    <Text style={s.summaryValue}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
    paddingBottom: spacing(2),
  },

  progressRow: { flexDirection: "row", gap: 8, marginBottom: spacing(2) },
  progressOuter: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.muted,
  },
  progressInner: { flex: 1, borderRadius: 999, backgroundColor: "transparent" },
  progressInnerActive: { backgroundColor: colors.accent },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing(1.5),
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepLabel: { color: colors.subtext, fontSize: 13, fontWeight: "600" },

  step4Fade: {
    position: "absolute",
    left: spacing(2),
    right: spacing(2),
    bottom: spacing(2) + spacing(1.5) + spacing(2) + 14,
    height: 44,
    borderRadius: 14,
  },

  bottomBar: { paddingTop: spacing(1.5) },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingVertical: spacing(2),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },

  stepWrap: { paddingTop: spacing(1) },
  stepWrapCenter: { alignItems: "center", marginTop: spacing(2) },

  stepTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  stepSubtitle: { color: colors.subtext, marginTop: 4 },

  h1: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1.2,
    marginTop: spacing(1.5),
  },

  introLogoWrap: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing(3),
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  introLineMain: { color: colors.text, fontSize: 16, textAlign: "center" },
  introLineSub: { color: colors.subtext, textAlign: "center" },

  label: { color: colors.subtext, fontSize: 13, marginBottom: 6 },

  skipUnderCards: {
    marginTop: 10,
    alignSelf: "flex-end",
  },
  skipUnderCardsTxt: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.85,
  },
  skipUnderCardsTxtActive: {
    textDecorationLine: "underline",
    textDecorationStyle: "solid",
  },

  input: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
  },

  toggleRow: { flexDirection: "row", gap: 10 },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing(1.5),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  toggleTxt: { color: colors.subtext, fontWeight: "700" },
  toggleTxtActive: { color: "#fff" },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1.6),
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardRowActive: { borderColor: colors.accent },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: colors.text, fontWeight: "700" },
  cardSub: { color: colors.subtext, fontSize: 12 },
  cardCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  freqCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2),
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

  segmentCol: { marginTop: spacing(1), gap: 10 },
  segmentBtnCol: {
    width: "100%",
    paddingVertical: spacing(1.6),
    paddingHorizontal: spacing(1.6),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  segmentBtnColActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  segmentTxtCol: { color: colors.subtext, fontSize: 13, fontWeight: "700" },
  segmentTxtColActive: { color: "#fff" },

  doneIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(1.5),
    marginTop: spacing(1.5),
  },

  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(1.8),
  },
  summaryLabel: { color: colors.subtext, fontSize: 12, marginBottom: 2 },
  summaryValue: { color: colors.text, fontWeight: "700" },

  motivationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing(2),
    padding: spacing(1.8),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${colors.accent}33`,
    backgroundColor: "#FF5A3C22",
  },
  motivationTitle: { color: colors.text, fontWeight: "700", marginBottom: 4 },
  motivationText: { color: colors.subtext, fontSize: 13 },
});

export default OnboardingScreen;
