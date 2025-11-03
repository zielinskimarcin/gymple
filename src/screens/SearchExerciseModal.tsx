import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from "react-native";
import { colors, spacing } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadCustomExercises, setLastAddedExerciseTemp } from "../storage";
import type { Exercise } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { DEFAULT_EXERCISES, sortByAlpha, sortByGroup, type SortMode } from "../constants/exercises";

export const SearchExerciseModal = () => {
  const nav = useNavigation();
  const [custom, setCustom] = useState<Exercise[]>([]);
  const [q, setQ] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("group"); // domyślnie: Group

  useEffect(() => {
    (async () => setCustom(await loadCustomExercises()))();
  }, []);

  const all = useMemo(() => [...DEFAULT_EXERCISES, ...custom], [custom]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t
      ? all.filter((e) => e.name.toLowerCase().includes(t) || e.muscleGroup.toLowerCase().includes(t))
      : all.slice();

    base.sort(sortMode === "group" ? sortByGroup : sortByAlpha);
    return base;
  }, [q, all, sortMode]);

  async function pick(ex: Exercise) {
    await setLastAddedExerciseTemp(ex);
    nav.goBack(); // TrainScreen wciągnie to ćwiczenie do aktywnego workoutu
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: spacing(2), gap: spacing(2), flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="search-outline" size={18} color={colors.subtext} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search exercises or groups…"
            placeholderTextColor={colors.subtext}
            style={s.input}
          />
        </View>

        {/* Toggle sortowania: Group / A–Z */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => setSortMode("group")}
            style={[
              s.sortBtn,
              { backgroundColor: sortMode === "group" ? colors.card : "transparent", borderColor: colors.border },
            ]}
          >
            <Text style={{ color: colors.text }}>Group</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSortMode("alpha")}
            style={[
              s.sortBtn,
              { backgroundColor: sortMode === "alpha" ? colors.card : "transparent", borderColor: colors.border },
            ]}
          >
            <Text style={{ color: colors.text }}>A–Z</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={results}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.row} onPress={() => pick(item)}>
              <View>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.sub}>{item.muscleGroup}</Text>
              </View>
              {item.isCustom ? <Text style={s.badge}>CUSTOM</Text> : null}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  input: {
    flex: 1,
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: { color: colors.text, fontWeight: "700" },
  sub: { color: colors.subtext, marginTop: 2 },
  badge: { color: colors.subtext, fontSize: 11 },
});