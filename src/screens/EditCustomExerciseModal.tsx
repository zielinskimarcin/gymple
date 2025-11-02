import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { colors, spacing } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteCustomExercise, loadCustomExercises, updateCustomExercise } from "../storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const PRESET_GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Other"];

export const EditCustomExerciseModal = () => {
  const nav = useNavigation();
  const route = useRoute<any>();
  const { id } = route.params || {};

  const [name, setName] = useState<string>("");
  const [group, setGroup] = useState<string>("Chest");
  const [customGroup, setCustomGroup] = useState<string>("");

  useEffect(() => {
    (async () => {
      const list = await loadCustomExercises();
      const ex = list.find((e) => e.id === id);
      if (ex) {
        setName(ex.name);
        const isPreset = PRESET_GROUPS.includes(ex.muscleGroup);
        setGroup(isPreset ? ex.muscleGroup : "Other");
        if (!isPreset) setCustomGroup(ex.muscleGroup);
      }
    })();
  }, [id]);

  async function saveChanges() {
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
            style={s.input}
          />
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
                  {isOther && (
                    <Ionicons
                      name="create-outline"
                      size={14}
                      color={selected ? "#0E0E10" : colors.text}
                      style={{ marginRight: 6 }}
                    />
                  )}
                  <Text style={[s.chipTxt, selected && { color: "#0E0E10" }]}>{g}</Text>
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

        <TouchableOpacity style={s.save} onPress={saveChanges}>
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
});
