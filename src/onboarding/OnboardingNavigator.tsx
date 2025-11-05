// src/onboarding/OnboardingNavigator.tsx
import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";
import { saveOnbDraft, getOnbDraft, markOnboardingDone } from "../storage/onboarding";
import * as Updates from "expo-updates"; // <<< wymagane: npx expo install expo-updates

type OnbStackParam = { Name: undefined; Goal: undefined; Focus: undefined };
const Stack = createNativeStackNavigator<OnbStackParam>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Name" component={StepName} />
      <Stack.Screen name="Goal" component={StepGoal} />
      <Stack.Screen name="Focus" component={StepFocus} />
    </Stack.Navigator>
  );
}

/* ---------- Step 1: name ---------- */
function StepName({ navigation }: any) {
  const [name, setName] = useState("");
  const insets = useSafeAreaInsets();

  useEffect(() => { (async () => {
    const d = await getOnbDraft();
    if (d?.name) setName(d.name);
  })(); }, []);

  async function next() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await saveOnbDraft({ name: trimmed });
    navigation.replace("Goal");
  }

  const canContinue = name.trim().length > 0;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.progressRow}><View style={[s.progressDot, s.dotActive]}/><View style={s.progressDot}/><View style={s.progressDot}/></View>

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

      <TouchableOpacity
        style={[s.cta, { bottom: insets.bottom + spacing(1.5), opacity: canContinue ? 1 : 0.5 }]}
        onPress={next}
        disabled={!canContinue}
      >
        <Text style={s.ctaTxt}>Continue  <Text>›</Text></Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* ---------- Step 2: goal (workouts/week) ---------- */
function StepGoal({ navigation }: any) {
  const [n, setN] = useState(3);
  const insets = useSafeAreaInsets();

  useEffect(() => { (async () => {
    const d = await getOnbDraft();
    if (d?.workoutsPerWeek) setN(d.workoutsPerWeek);
  })(); }, []);

  function dec(){ setN(x => Math.max(1, x-1)); }
  function inc(){ setN(x => Math.min(14, x+1)); }

  async function next(){
    await saveOnbDraft({ workoutsPerWeek: n });
    navigation.replace("Focus");
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.progressRow}>
        <View style={[s.progressDot, s.dotActive]}/><View style={[s.progressDot, s.dotActive]}/><View style={s.progressDot}/>
      </View>

      <Text style={s.h1}>Your goal</Text>
      <Text style={s.sub}>How many times per week do you plan to train?</Text>

      <View style={s.counterCard}>
        <View style={s.counterRow}>
          <TouchableOpacity onPress={dec} style={s.counterBtn}><Text style={s.counterBtnTxt}>−</Text></TouchableOpacity>
          <Text style={s.counterValue}>{n}</Text>
          <TouchableOpacity onPress={inc} style={s.counterBtn}><Text style={s.counterBtnTxt}>+</Text></TouchableOpacity>
        </View>
        <Text style={s.counterHint}>workouts / week</Text>
        <View style={s.divider}/>
        <Text style={s.helper}>We'll use this to calibrate your weekly progress bar</Text>
      </View>

      <TouchableOpacity style={[s.cta, { bottom: insets.bottom + spacing(1.5) }]} onPress={next}>
        <Text style={s.ctaTxt}>Continue  <Text>›</Text></Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* ---------- Step 3: focus ---------- */
function StepFocus() {
  const [focus, setFocus] = useState<"strength"|"hypertrophy"|"endurance"|"mixed" | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => { (async () => {
    const d = await getOnbDraft();
    if (d?.focus) setFocus(d.focus);
  })(); }, []);

  // w StepFocus:
async function finish() {
  if (!focus) return;
  await saveOnbDraft({ focus });
  await markOnboardingDone(true); // 🔔 to wyemituje event -> Root pokaże AuthStack(SignUp)
}

  const Box = ({ id, label, icon }: any) => {
    const active = focus === id;
    return (
      <TouchableOpacity onPress={() => setFocus(id)} style={[s.box, active && s.boxActive]}>
        <View style={s.boxIcon}><Ionicons name={icon} size={20} color={colors.text} /></View>
        <Text style={s.boxTxt}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const canFinish = !!focus;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.progressRow}>
        <View style={[s.progressDot, s.dotActive]}/><View style={[s.progressDot, s.dotActive]}/><View style={[s.progressDot, focus && s.dotActive]}/>
      </View>

      <Text style={s.h1}>Training focus</Text>
      <Text style={s.sub}>What's your main training goal?</Text>

      <View style={s.grid2}>
        <Box id="strength"     label="Strength"     icon="barbell-outline" />
        <Box id="hypertrophy"  label="Hypertrophy"  icon="flame-outline" />
        <Box id="endurance"    label="Endurance"    icon="pulse-outline" />
        <Box id="mixed"        label="Mixed"        icon="aperture-outline" />
      </View>

      <TouchableOpacity
        style={[s.cta, { bottom: insets.bottom + spacing(1.5), opacity: canFinish ? 1 : 0.6 }]}
        onPress={finish}
        disabled={!canFinish}
      >
        <Text style={s.ctaTxt}>Get Started  <Text>›</Text></Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* ---------- styles ---------- */
const s = StyleSheet.create({
  safe:{ flex:1, backgroundColor: colors.bg, paddingHorizontal: spacing(2), paddingTop: spacing(2) },

  progressRow:{ flexDirection:"row", gap:10, marginTop: 4, marginBottom: spacing(2) },
  progressDot:{ height:4, flex:1, backgroundColor:"#2a2d33", borderRadius:2 },
  dotActive:{ backgroundColor: colors.accent },

  h1:{ color: colors.text, fontSize: 28, fontWeight:"800", marginTop: 6 },
  sub:{ color: colors.subtext, marginTop: 6, marginBottom: spacing(2) },

  input:{
    backgroundColor: colors.card, color: colors.text, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, padding: 14,
  },

  cta:{
    position:"absolute", left: spacing(2), right: spacing(2),
    backgroundColor: colors.accent, borderRadius: 16, alignItems:"center", paddingVertical: spacing(2),
  },
  ctaTxt:{ color:"#0E0E10", fontWeight:"800" },

  counterCard:{
    backgroundColor: colors.card, borderRadius:16, borderWidth:1, borderColor:colors.border,
    padding: spacing(2), marginTop: spacing(2), alignItems:"center"
  },
  counterRow:{ flexDirection:"row", alignItems:"center", gap: 24 },
  counterBtn:{ width:48, height:48, borderRadius:12, backgroundColor: colors.muted, alignItems:"center", justifyContent:"center" },
  counterBtnTxt:{ color: colors.text, fontSize: 24, fontWeight:"800" },
  counterValue:{ color: colors.text, fontSize: 42, fontWeight:"800" },
  counterHint:{ color: colors.subtext, marginTop: 8 },
  divider:{ height:1, alignSelf:"stretch", backgroundColor: colors.border, marginVertical: spacing(2) },
  helper:{ color: colors.subtext, textAlign:"center" },

  grid2:{ flexDirection:"row", flexWrap:"wrap", gap: 14, marginTop: spacing(2) },
  box:{ width: "47%", backgroundColor: colors.card, borderRadius: 18, borderWidth:1, borderColor: colors.border, padding: spacing(2) },
  boxActive:{ borderColor: colors.accent },
  boxIcon:{ width:42, height:42, borderRadius:12, backgroundColor: colors.muted, alignItems:"center", justifyContent:"center", marginBottom: 10 },
  boxTxt:{ color: colors.text, fontWeight:"700" },
});