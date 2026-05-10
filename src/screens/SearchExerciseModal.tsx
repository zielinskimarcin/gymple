import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { colors, spacing } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { setLastAddedExerciseTemp } from "../storage/lastAdded";
import { DEFAULT_EXERCISES, MUSCLE_GROUPS } from "../constants/exercises";
import { useI18n } from "../i18n";
import { formatMuscleGroup } from "../i18n/labels";

type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  isCustom?: boolean;
};

type Row =
  | { type: "header"; key: string; title: string }
  | { type: "item"; key: string; ex: Exercise };

type SortMode = "group" | "alpha";

export const SearchExerciseModal = () => {
  const nav = useNavigation();
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("group");
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<Exercise[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data: usr } = await supabase.auth.getUser();
        const userId = usr.user?.id ?? null;
        const customQuery = userId
          ? supabase.from("custom_exercises").select("id,name,muscle_group").eq("user_id", userId)
          : Promise.resolve({ data: [], error: null });

        const [{ data: defs, error: e1 }, { data: cust, error: e2 }] = await Promise.all([
          supabase.from("default_exercises").select("id,name,muscle_group"),
          customQuery,
        ]);

        if (e2) throw e2;

        const localDefaults = DEFAULT_EXERCISES.map((x) => ({
          id: x.id,
          name: x.name,
          muscleGroup: x.muscleGroup,
        }));
        const remoteDefaults: Exercise[] = e1
          ? []
          : (defs ?? []).map((x) => ({ id: x.id, name: x.name, muscleGroup: x.muscle_group })) ?? [];
        const defaultsById = new Map(localDefaults.map((x) => [x.id, x]));
        remoteDefaults.forEach((x) => defaultsById.set(x.id, x));
        const d = Array.from(defaultsById.values());
        const c: Exercise[] =
          (cust ?? []).map((x) => ({ id: x.id, name: x.name, muscleGroup: x.muscle_group, isCustom: true })) ?? [];

        const merged = [...d, ...c].sort((a, b) => a.name.localeCompare(b.name));
        setAll(merged);
      } catch {
        setErr(t("search_exercise.load_failed"));
        setAll([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all;
    return all.filter(
      (e) =>
        e.name.toLowerCase().includes(t) ||
        (e.muscleGroup || "").toLowerCase().includes(t)
    );
  }, [q, all]);

  const rows: Row[] = useMemo(() => {
    if (!filtered.length) return [];
    const out: Row[] = [];
    if (sortMode === "group") {
      const map = new Map<string, Exercise[]>();
      for (const ex of filtered) {
        const g = ex.muscleGroup || "Other";
        if (!map.has(g)) map.set(g, []);
        map.get(g)!.push(ex);
      }
      const groups = Array.from(map.entries()).sort((a, b) => {
        const ai = MUSCLE_GROUPS.indexOf(a[0] as any);
        const bi = MUSCLE_GROUPS.indexOf(b[0] as any);
        if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        return a[0].localeCompare(b[0]);
      });
      for (const [title, list] of groups) {
        out.push({ type: "header", key: `h_${title}`, title });
        for (const ex of list) out.push({ type: "item", key: `i_${ex.id}`, ex });
      }
    } else {
      const map = new Map<string, Exercise[]>();
      for (const ex of filtered) {
        const ch = (ex.name[0] || "#").toUpperCase();
        const letter = /[A-ZĄĆĘŁŃÓŚŹŻ]/i.test(ch) ? ch : "#";
        if (!map.has(letter)) map.set(letter, []);
        map.get(letter)!.push(ex);
      }
      const groups = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      for (const [title, list] of groups) {
        const sorted = list.slice().sort((a, b) => a.name.localeCompare(b.name));
        out.push({ type: "header", key: `h_${title}`, title });
        for (const ex of sorted) out.push({ type: "item", key: `i_${ex.id}`, ex });
      }
    }
    return out;
  }, [filtered, sortMode]);

  async function pick(ex: Exercise) {
    await setLastAddedExerciseTemp(ex);
    nav.goBack();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.top}>
        <Text style={s.title}>{t("search_exercise.title")}</Text>

        <View style={s.toggleWrap}>
          <TouchableOpacity
            style={[s.toggleBtn, sortMode === "group" && s.toggleBtnActive]}
            onPress={() => setSortMode("group")}
          >
            <Text style={[s.toggleTxt, sortMode === "group" && s.toggleTxtActive]}>{t("search_exercise.group")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, sortMode === "alpha" && s.toggleBtnActive]}
            onPress={() => setSortMode("alpha")}
          >
            <Text style={[s.toggleTxt, sortMode === "alpha" && s.toggleTxtActive]}>A→Z</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.subtext} />
          <TextInput
            style={s.input}
            value={q}
            onChangeText={setQ}
            placeholder={t("search_exercise.placeholder")}
            placeholderTextColor={colors.subtext}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : err ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyText}>{err}</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyText}>{t("search_exercise.no_matches")}</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          renderItem={({ item }) =>
            item.type === "header" ? (
              <View style={s.headerRow}>
                <Text style={s.headerTxt}>
                  {sortMode === "group" ? formatMuscleGroup(t, item.title) : item.title}
                </Text>
              </View>
            ) : (
              <TouchableOpacity style={s.row} onPress={() => pick(item.ex)}>
                <View>
                  <Text style={s.name}>{item.ex.name}</Text>
                  <Text style={s.sub}>{formatMuscleGroup(t, item.ex.muscleGroup)}</Text>
                </View>
                {item.ex.isCustom ? <Text style={s.badge}>{t("search_exercise.custom_badge")}</Text> : null}
              </TouchableOpacity>
            )
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ padding: spacing(2), paddingBottom: spacing(6) }}
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  top: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
    paddingBottom: spacing(1),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },

  toggleWrap: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  toggleBtnActive: {
    backgroundColor: colors.accent,
  },
  toggleTxt: { color: colors.text, fontSize: 12, fontWeight: "600" },
  toggleTxtActive: { color: "#0E0E10" },

  searchRow: {
    paddingHorizontal: spacing(2),
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: spacing(1),
  },
  searchBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: { flex: 1, color: colors.text },

  headerRow: { marginTop: spacing(2), marginBottom: 6 },
  headerTxt: { color: colors.subtext, fontWeight: "700" },

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

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing(4),
  },
  emptyText: { color: colors.subtext, textAlign: "center" },
});

export default SearchExerciseModal;
