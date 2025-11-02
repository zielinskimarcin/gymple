import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { colors, spacing } from "../theme";
import type { Exercise } from "../types";
import { loadCustomExercises } from "../storage";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

const DEFAULTS: Exercise[] = [
  { id: "bench", name: "Bench Press", muscleGroup: "Chest" },
  { id: "incline_db", name: "Incline DB Press", muscleGroup: "Chest" },
  { id: "row", name: "Barbell Row", muscleGroup: "Back" },
  { id: "pullup", name: "Pull-Up", muscleGroup: "Back" },
  { id: "squat", name: "Back Squat", muscleGroup: "Legs" },
  { id: "rdl", name: "Romanian Deadlift", muscleGroup: "Legs" },
  { id: "ohp", name: "Overhead Press", muscleGroup: "Shoulders" },
  { id: "curl", name: "Barbell Curl", muscleGroup: "Arms" },
  { id: "pushdown", name: "Triceps Pushdown", muscleGroup: "Arms" },
  { id: "plank", name: "Plank", muscleGroup: "Core" },
  // examples (optional): you can add cardio/full body defaults later if you want
];

type GroupRow = { type: "header"; title: string } | { type: "item"; ex: Exercise };

export const ExercisesScreen = () => {
  const nav = useNavigation();
  const focused = useIsFocused();
  const [custom, setCustom] = useState<Exercise[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => setCustom(await loadCustomExercises()))();
  }, [focused]);

  const all = useMemo(() => [...DEFAULTS, ...custom], [custom]);

  const groups = useMemo(() => {
    const by = new Map<string, Exercise[]>();
    for (const ex of all) {
      if (!by.has(ex.muscleGroup)) by.set(ex.muscleGroup, []);
      by.get(ex.muscleGroup)!.push(ex);
    }
    return Array.from(by.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([title, data]) => ({ title, data }));
  }, [all]);

  const rows: GroupRow[] = useMemo(() => {
    const out: GroupRow[] = [];
    for (const g of groups) {
      out.push({ type: "header", title: g.title });
      if (!collapsed[g.title]) {
        for (const ex of g.data) out.push({ type: "item", ex });
      }
    }
    return out;
  }, [groups, collapsed]);

  function onPressExercise(item: Exercise) {
    if (item.isCustom) {
      // @ts-ignore
      nav.navigate("EditCustomExercise", { id: item.id });
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <View style={styles.top}>
          <Text style={styles.title}>Exercises</Text>
          <TouchableOpacity onPress={() => nav.navigate("AddExercise" as never)}>
            <Text style={{ color: colors.accent, fontWeight: "800" }}>Add +</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={rows}
          keyExtractor={(row, i) => ("type" in row && row.type === "header" ? `h_${row.title}` : `i_${row.ex.id}_${i}`)}
          renderItem={({ item }) =>
            item.type === "header" ? (
              <TouchableOpacity
                onPress={() => setCollapsed((c) => ({ ...c, [item.title]: !c[item.title] }))}
                style={styles.headerRow}
              >
                <Text style={styles.section}>{item.title}</Text>
                <Text style={styles.collapseHint}>{collapsed[item.title] ? "▸" : "▾"}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.row}
                onPress={() => onPressExercise(item.ex)}
                activeOpacity={item.ex.isCustom ? 0.6 : 1}
              >
                <Text style={styles.name}>{item.ex.name}</Text>
                {item.ex.isCustom ? <Text style={styles.badge}>CUSTOM</Text> : null}
              </TouchableOpacity>
            )
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ paddingBottom: spacing(10) }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing(2) },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing(2) },
  title: { color: colors.text, fontSize: 24, fontWeight: "700" },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    marginTop: spacing(2),
  },
  section: { color: colors.subtext, fontWeight: "600" },
  collapseHint: { color: colors.subtext },

  row: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { color: colors.text },
  badge: { color: colors.subtext, fontSize: 11 },
});
