import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { colors, spacing } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteCustomExercise, loadCustomExercises, updateCustomExercise } from "../storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { Exercise, MuscleGroup } from "../types";
import { DEFAULT_EXERCISES, normalizeName } from "../constants/exercises";

const PRESET_GROUPS: MuscleGroup[] = ["Chest","Back","Legs","Shoulders","Arms","Core","Full Body","Cardio","Other"];
const ERROR_RED = "#FF4D4D";

export const EditCustomExerciseModal = () => {
  const nav = useNavigation();
  const route = useRoute<any>();
  const { id } = route.params || {};

  const [name, setName] = useState<string>("");
  const [group, setGroup] = useState<MuscleGroup>("Chest");
  const [customGroup, setCustomGroup] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  // duplikaty
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // wczytaj ćwiczenie i zbuduj listę nazw do walidacji (bez bieżącego id)
  useEffect(() => {
    (async () => {
      const customs: Exercise[] = await loadCustomExercises();
      const ex = customs.find((e) => e.id === id);
      if (ex) {
        setName(ex.name);
        const isPreset = PRESET_GROUPS.includes(ex.muscleGroup as MuscleGroup);
        setGroup(isPreset ? (ex.muscleGroup as MuscleGroup) : "Other");
        if (!isPreset) setCustomGroup(ex.muscleGroup);
      }

      const names = new Set<string>();
      DEFAULT_EXERCISES.forEach((e) => names.add(normalizeName(e.name)));
      customs
        .filter((e) => e.id !== id) // ← wykluczamy edytowany rekord
        .forEach((e) => names.add(normalizeName(e.name)));
      setExistingNames(names);
      setLoaded(true);
    })();
  }, [id]);

  const normalized = useMemo(() => normalizeName(name), [name]);

  useEffect(() => {
    if (!loaded) return;
    if (!normalized) { setError(null); return; }
    setError(existingNames.has(normalized) ? "Exercise with this name already exists." : null);
  }, [normalized, existingNames, loaded]);

  const canSave = normalized.length > 0 && !error;

  async function saveChanges() {
    if (!canSave) return;
    const mg = group === "Other" ? (customGroup.trim() || "Other") : group;
    await updateCustomExercise(id, (e) => ({ ...e, name: name.trim() || e.name, muscleGroup: mg }));
    nav.goBack();
  }

  async function remove() {
    await deleteCustomExercise(id);
    nav.goBack();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: spacing(2), gap: spacing(2) }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>Edit exercise</Text>

        {/* RENAME */}
        <View>
          <Text style={s.label}>Name</Text>
          <TextInput
            placeholder="Exercise name"
            placeholderTextColor={colors.subtext}
            value={name}
            onChangeText={setName}
            style={[s.input, !!error && { borderColor: ERROR_RED }]}
          />
          {!!error && (
            <View style={s.errorRow}>
              <Ionicons name="warning-outline" size={14} color={ERROR_RED} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* GROUP */}
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

        <TouchableOpacity style={[s.save, { opacity: canSave ? 1 : 0.6 }]} onPress={saveChanges} disabled={!canSave}>
          <Text style={{ color: "#0E0E10", fontWeight: "800" }}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={remove} style={{ alignSelf: "center", marginTop: 8 }}>
          <Text style={{ color: colors.subtext, textDecorationLine: "underline" }}>Delete</Text>
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