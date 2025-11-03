import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { colors, spacing } from "../theme";
import type { Exercise } from "../types";
import { loadCustomExercises } from "../storage";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DEFAULT_EXERCISES, MUSCLE_GROUPS } from "../constants/exercises"; // ⬅️ jedno źródło

type GroupRow = { type: "header"; title: string } | { type: "item"; ex: Exercise };

export const ExercisesScreen = () => {
  const nav = useNavigation();
  const focused = useIsFocused();
  const [custom, setCustom] = useState<Exercise[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => setCustom(await loadCustomExercises()))();
  }, [focused]);

  const all = useMemo(() => [...DEFAULT_EXERCISES, ...custom], [custom]);

  const groups = useMemo(() => {
    const by = new Map<string, Exercise[]>();
    for (const ex of all) {
      const g = ex.muscleGroup || "Other";
      if (!by.has(g)) by.set(g, []);
      by.get(g)!.push(ex);
    }

    const entries = Array.from(by.entries());
    // sortuj wg ustalonej kolejności MUSCLE_GROUPS, a nie alfabetycznie
    entries.sort((a, b) => {
      const ia = MUSCLE_GROUPS.indexOf(a[0] as any);
      const ib = MUSCLE_GROUPS.indexOf(b[0] as any);
      const A = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
      const B = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
      if (A !== B) return A - B;
      // w obrębie grupy sort po nazwie
      return a[0].localeCompare(b[0]);
    });

    return entries.map(([title, data]) => ({
      title,
      data: data.slice().sort((x, y) => x.name.localeCompare(y.name)),
    }));
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