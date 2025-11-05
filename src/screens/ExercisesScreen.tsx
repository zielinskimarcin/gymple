// src/screens/ExercisesScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { colors, spacing } from "../theme";
import type { Exercise } from "../types";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { listCustomExercises } from "../storage/remoteCustomExercises";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";

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
];

type GroupRow =
  | { type: "header"; title: string }
  | { type: "item"; ex: Exercise };

type ExStats = { pr: number | null; totalSets: number };

export const ExercisesScreen = () => {
  const nav = useNavigation();
  const focused = useIsFocused();
  const { session } = useAuth();
  const userId = session?.user?.id ?? "";
  const userEmail = session?.user?.email ?? "";

  const [custom, setCustom] = useState<Exercise[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<Record<string, ExStats>>({});

  // profile mini avatar (initial + color)
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await listCustomExercises();
        setCustom(list as any);
      } catch {
        setCustom([]);
      }
    })();
  }, [focused]);

  // sumuj PR i total sets (serii), nie workouty
  const loadStats = useCallback(async () => {
    if (!userId) { setStats({}); return; }
    const { data, error } = await supabase.from("workouts").select("payload").eq("user_id", userId);
    if (error || !data) { setStats({}); return; }

    const agg = new Map<string, ExStats>();
    for (const row of data) {
      const exercises = row?.payload?.exercises || [];
      for (const e of exercises) {
        const id: string = e.id;
        const sets = Array.isArray(e.sets) ? e.sets : [];
        if (!agg.has(id)) agg.set(id, { pr: null, totalSets: 0 });

        const cur = agg.get(id)!;
        // PR = max wagi z jakiejkolwiek serii; totalSets = suma liczby serii
        for (const s of sets) {
          if (typeof s?.weight === "number") {
            cur.pr = cur.pr == null ? s.weight : Math.max(cur.pr, s.weight);
          }
        }
        cur.totalSets += sets.length; // <— dokładna suma serii
      }
    }
    const obj: Record<string, ExStats> = {};
    agg.forEach((v, k) => (obj[k] = v));
    setStats(obj);
  }, [userId]);

  // profil (inicjał + kolor; kolor opcjonalny — fallback jeżeli brak kolumny)
  const loadProfile = useCallback(async () => {
    if (!userId) { setDisplayName(null); setAvatarColor(null); return; }

    // próbujemy pobrać display_name i ewentualny avatar_color (jeśli dodałeś kolumnę)
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_color")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      setDisplayName(null);
      setAvatarColor(null);
      return;
    }
    setDisplayName(data?.display_name ?? null);
    setAvatarColor((data as any)?.avatar_color ?? null);
  }, [userId]);

  useEffect(() => { loadStats(); loadProfile(); }, [focused, loadStats, loadProfile]);

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

  function toggleExpand(exId: string) {
    setExpanded((e) => ({ ...e, [exId]: !e[exId] }));
  }

  // util: inicjał i kolor
  const initial = (displayName || userEmail || "?").trim().charAt(0).toUpperCase() || "?";
  const avatarBg = avatarColor || autoColorFromString(displayName || userEmail || "user");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        {/* Header bar: title left, right cluster (Add | Settings | Profile Avatar) */}
        <View style={styles.headerBar}>
          <Text style={styles.title}>Exercises</Text>
          <View style={styles.rightCluster}>
            <TouchableOpacity
              onPress={() => nav.navigate("AddExercise" as never)}
              style={styles.addBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={16} color={colors.accent} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => nav.navigate("Settings" as never)}
              style={styles.ghostBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="settings-outline" size={18} color={colors.text} />
            </TouchableOpacity>

            {/* Avatar button */}
            <TouchableOpacity
              onPress={() => nav.navigate("Profile" as never)}
              style={styles.avatarBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={[styles.avatarCircle, { backgroundColor: avatarBg }]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={rows}
          keyExtractor={(row, i) =>
            "type" in row && row.type === "header" ? `h_${row.title}` : `i_${row.ex.id}_${i}`
          }
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
                style={[styles.card, expanded[item.ex.id] && styles.cardExpanded]}
                onPress={() => toggleExpand(item.ex.id)}
                activeOpacity={0.85}
              >
                {/* top line */}
                <View style={styles.cardTop}>
                  <Text style={styles.name}>{item.ex.name}</Text>
                  {item.ex.isCustom ? <Text style={styles.badge}>CUSTOM</Text> : null}
                </View>

                {/* expanded inline content */}
                {expanded[item.ex.id] ? (
                  <View style={styles.expandInline}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>PR</Text>
                      <Text style={styles.statValue}>
                        {stats[item.ex.id]?.pr != null ? `${stats[item.ex.id].pr} kg` : "—"}
                      </Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Total sets</Text>
                      <Text style={styles.statValue}>
                        {typeof stats[item.ex.id]?.totalSets === "number" ? stats[item.ex.id]!.totalSets : "—"}
                      </Text>
                    </View>

                    {item.ex.isCustom ? (
                      <TouchableOpacity
                        onPress={() => nav.navigate("EditCustomExercise" as never, { id: item.ex.id } as never)}
                        style={styles.editPill}
                      >
                        <Ionicons name="create-outline" size={14} color={colors.subtext} />
                        <Text style={styles.editTxt}>Edit</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
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

// prosty determinizm koloru, jeśli nie zapisujesz go jeszcze w DB
function autoColorFromString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing(2) },

  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing(1.5),
  },
  title: { color: colors.text, fontSize: 24, fontWeight: "700" },
  rightCluster: { flexDirection: "row", alignItems: "center", gap: 8 },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1.2,
    borderColor: colors.accent,
  },
  addBtnText: { color: colors.accent, fontWeight: "800" },

  ghostBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  // Avatar button
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "#fff", fontWeight: "800", fontSize: 13, includeFontPadding: false },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    marginTop: spacing(2),
  },
  section: { color: colors.subtext, fontWeight: "600" },
  collapseHint: { color: colors.subtext },

  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: spacing(1.6),
    paddingHorizontal: spacing(1.6),
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardExpanded: { borderColor: colors.accent },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { color: colors.text, fontWeight: "600" },
  badge: { color: colors.subtext, fontSize: 11 },

  expandInline: {
    marginTop: spacing(1.2),
    paddingTop: spacing(1.2),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statBox: { minWidth: 100 },
  statLabel: { color: colors.subtext, fontSize: 12 },
  statValue: { color: colors.text, fontWeight: "700", marginTop: 2 },

  editPill: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  editTxt: { color: colors.subtext, fontWeight: "600" },
});