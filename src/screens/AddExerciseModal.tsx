import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { colors, spacing } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadCustomExercises, saveCustomExercises, setLastAddedExerciseTemp } from "../storage";
import type { Exercise, MuscleGroup } from "../types";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { DEFAULT_EXERCISES, normalizeName } from "../constants/exercises";

const PRESET_GROUPS: MuscleGroup[] = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full Body", "Cardio", "Other"];
const ERROR_RED = "#FF4D4D";

export const AddExerciseModal = () => {
  const nav = useNavigation();
  const [name, setName] = useState("");
  const [group, setGroup] = useState<MuscleGroup>("Chest");
  const [customGroup, setCustomGroup] = useState("");

  // duplikaty
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const customs = await loadCustomExercises();
      const names = new Set<string>();
      DEFAULT_EXERCISES.forEach(e => names.add(normalizeName(e.name)));
      customs.forEach((e: Exercise) => names.add(normalizeName(e.name)));
      setExistingNames(names);
    })();
  }, []);

  const normalized = useMemo(() => normalizeName(name), [name]);

  useEffect(() => {
    if (!normalized) { setError(null); return; }
    setError(existingNames.has(normalized) ? "Exercise with this name already exists." : null);
  }, [normalized, existingNames]);

  const canSave = normalized.length > 0 && !error;

  async function save() {
    if (!canSave) return;
    const mg = group === "Other" ? (customGroup.trim() || "Other") : group;
    const list = await loadCustomExercises();
    const ex: Exercise = {
      id: "c_" + Date.now(),
      name: name.trim(),
      muscleGroup: mg,
      isCustom: true,
      createdAt: Date.now(),
    };
    await saveCustomExercises([ex, ...list]);
    await setLastAddedExerciseTemp(ex);
    nav.goBack();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: spacing(2), gap: spacing(2) }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>Add Exercise</Text>

        <View>
          <Text style={s.label}>Name</Text>
          <TextInput
            placeholder="e.g. Bulgarian Split Squat"
            placeholderTextColor={colors.subtext}
            value={name}
            onChangeText={setName}
            style={[
              s.input,
              !!error && { borderColor: ERROR_RED },
            ]}
          />
          {!!error && (
            <View style={s.errorRow}>
              <Ionicons name="warning-outline" size={14} color={ERROR_RED} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <View>
          <Text style={s.label}>Muscle group</Text>
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
              placeholder="Custom group (e.g. Glutes)"
              placeholderTextColor={colors.subtext}
              value={customGroup}
              onChangeText={setCustomGroup}
              style={[s.input, { marginTop: 8 }]}
            />
          )}
        </View>

        <TouchableOpacity style={[s.save, { opacity: canSave ? 1 : 0.6 }]} onPress={save} disabled={!canSave}>
          <Text style={{ color: "#0E0E10", fontWeight: "800" }}>Save</Text>
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
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  errorText: {
    color: ERROR_RED,
    fontSize: 12,
  },
});