import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { colors, spacing } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { Exercise } from "../types";

import { createCustomExercise } from "../storage/customExercises";
import { setLastAddedExerciseTemp } from "../storage/lastAdded";
import { useI18n } from "../i18n";

const PRESET_GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full Body", "Cardio", "Other"];

export const AddExerciseModal = () => {
  const nav = useNavigation();
  const i = useI18n();
  const t = i.t;
  const [name, setName] = useState("");
  const [group, setGroup] = useState<string>("Chest");
  const [customGroup, setCustomGroup] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const mg = group === "Other" ? (customGroup.trim() || "Other") : group;

    setBusy(true);
    try {
      const res = await createCustomExercise(trimmed, mg);
      if (!res.ok) {
        const message = res.error?.toLowerCase().includes("exists")
          ? t("edit_exercise.duplicate")
          : res.error || t("add_exercise.save_failed");
        Alert.alert(t("common.error"), message);
        return;
      }

      await setLastAddedExerciseTemp({
        id: res.ex!.id,
        name: res.ex!.name,
        muscleGroup: res.ex!.muscleGroup,
        isCustom: true,
        createdAt: Date.now(),
      } as Exercise as any);

      nav.goBack();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: spacing(2), gap: spacing(2) }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
  {t("add_exercise.title")}
</Text>

        <View>
          <Text style={s.label}>{t("add_exercise.name")}</Text>
          <TextInput placeholder={t("add_exercise.placeholder_name")}
            placeholderTextColor={colors.subtext}
            value={name}
            onChangeText={setName}
            style={s.input}
          />
        </View>

        <View>
          <Text style={s.label}>{t("add_exercise.muscle_group")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {PRESET_GROUPS.map((g) => {
              const selected = group === g;
              const isOther = g === "Other";
              return (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGroup(g)}
                  style={[s.chip, selected && { backgroundColor: colors.accent }]}
                >
                  <Text style={[s.chipTxt, selected && { color: "#0E0E10" }]}>{g}</Text>
                  {isOther && (
                    <Ionicons
                      name="create-outline"
                      size={14}
                      color={selected ? "#0E0E10" : colors.text}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {group === "Other" && (
            <TextInput 
              placeholder={t("add_exercise.placeholder_custom_group")}
              placeholderTextColor={colors.subtext}
              value={customGroup}
              onChangeText={setCustomGroup}
              style={[s.input, { marginTop: 8 }]}
            />
          )}
        </View>

        <TouchableOpacity style={[s.save, busy && { opacity: 0.6 }]} onPress={save} disabled={busy}>
          <Text style={{ color: "#0E0E10", fontWeight: "800" }}>{t("common.save")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  label: { color: colors.subtext, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chip: {
    backgroundColor: colors.muted,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  chipTxt: { color: colors.text },
  save: {
    marginTop: spacing(2),
    backgroundColor: colors.accent,
    paddingVertical: spacing(2),
    alignItems: "center",
    borderRadius: 14,
  },
});
