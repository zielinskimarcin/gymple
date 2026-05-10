import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Animated, ActivityIndicator, StyleSheet as RNStyleSheet, Dimensions, Pressable,
} from "react-native";
import { colors, spacing, shadow } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import { Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useI18n } from "../i18n";

type DbWorkout = { id: string; name: string; started_at: string; duration_sec: number | null };

const PAGE_SIZE = 10;

type GradientPair = [string, string];

const GRAD: GradientPair = ["rgba(255, 90, 60, 1)", "rgba(255, 90, 60, 1)"];
const GRAD_SOFT: GradientPair = ["rgba(255, 90, 60, 0.2)", "rgba(255, 90, 60, 0.2)"];
const GRAD_PILL: GradientPair = ["rgba(255, 90, 60, 0.8)", "rgba(255, 90, 60, 0.8)"];
const GRAD_BORDER = "rgba(255, 90, 60, 1)";
const ICON_TINT = "rgba(255, 255, 255, 0.92)";

const PANEL_MAX_H = Math.min(520, Math.round(Dimensions.get("window").height * 0.7));

function autoColorFromString(s: string) {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360; return `hsl(${hue},55%,45%)`;
}
function fmtMinSec(sec?: number | null) {
  if (sec == null) return "";
  const m = Math.floor(sec / 60); const s = sec % 60; return `${m}m ${s}s`;
}
function monthNameY(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function dateKey(d: Date) { return d.toISOString().slice(0,10); }

export const HistoryScreen = () => {
  const { t } = useI18n();
  const [list, setList] = useState<DbWorkout[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [statsLoading, setStatsLoading] = useState(true);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [totalDurationSec, setTotalDurationSec] = useState(0);
  const [firstWorkoutAt, setFirstWorkoutAt] = useState<Date | null>(null);
  const [avgDurationSec, setAvgDurationSec] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [thisMonthCount, setThisMonthCount] = useState(0);

  const focused = useIsFocused();
  const nav = useNavigation<any>();
  const { session } = useAuth();
  const userId = session?.user?.id ?? "";
  const userEmail = session?.user?.email ?? "";

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState<string | null>(null);

  const [firstPaintPending, setFirstPaintPending] = useState(true);

  const hasLoadedOnceRef = useRef(false);

  const [statsOpen, setStatsOpen] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;
  const animateTo = useCallback((to: 0 | 1) => {
    Animated.timing(slide, { toValue: to, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [slide]);
  const openStats = useCallback(() => { setStatsOpen(true); animateTo(1); }, [animateTo]);
  const closeStats = useCallback(() => { animateTo(0); setTimeout(() => setStatsOpen(false), 260); }, [animateTo]);

  const loadProfile = useCallback(async () => {
    if (!userId) { setDisplayName(null); setAvatarColor(null); return; }
    const { data, error } = await supabase.from("profiles").select("display_name, avatar_color").eq("id", userId).maybeSingle();
    if (error) { setDisplayName(null); setAvatarColor(null); return; }
    setDisplayName(data?.display_name ?? null);
    setAvatarColor((data as any)?.avatar_color ?? null);
  }, [userId]);

  const fetchPage = useCallback(async (pageIndex: number) => {
    if (!userId) return { data: [] as DbWorkout[], hasMore: false };
    const from = pageIndex * PAGE_SIZE; const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("workouts")
      .select("id,name,started_at,duration_sec")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .range(from, to);
    if (error) return { data: [] as DbWorkout[], hasMore: false };
    return { data: (data ?? []) as DbWorkout[], hasMore: (data ?? []).length === PAGE_SIZE };
  }, [userId]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      if (!userId) {
        setTotalWorkouts(0); setTotalDurationSec(0); setFirstWorkoutAt(null);
        setAvgDurationSec(0); setThisMonthCount(0); setStreakDays(0);
        return;
      }

      const { data: aggs, error: e1 } = await supabase
        .from("workouts")
        .select("started_at,duration_sec")
        .eq("user_id", userId)
        .order("started_at", { ascending: false });
      if (e1) throw e1;

      const all = (aggs ?? []) as { started_at: string; duration_sec: number | null }[];
      const total = all.length;
      const sum = all.reduce((s, r) => s + (r.duration_sec ?? 0), 0);
      const first = all.length ? new Date(all[all.length - 1].started_at) : null;
      const avg = total > 0 ? Math.round(sum / total) : 0;

      const now = new Date();
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const thisMonth = all.filter(r => { const d = new Date(r.started_at); return d >= mStart && d < mEnd; }).length;

      const daySet = new Set<string>();
      const ninetyAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);
      for (const r of all) { const d = new Date(r.started_at); if (d < ninetyAgo) break; daySet.add(dateKey(startOfDay(d))); }
      let streak = 0;
      const today = startOfDay(new Date());
      const startFrom = daySet.has(dateKey(today)) ? today : startOfDay(new Date(today.getTime() - 24*3600*1000));
      for (let i = 0; i < 365; i++) { const probe = new Date(startFrom.getTime() - i*24*3600*1000); if (daySet.has(dateKey(probe))) streak += 1; else break; }

      setTotalWorkouts(total);
      setTotalDurationSec(sum);
      setFirstWorkoutAt(first);
      setAvgDurationSec(avg);
      setThisMonthCount(thisMonth);
      setStreakDays(streak);
    } catch {
      setTotalWorkouts(0); setTotalDurationSec(0); setFirstWorkoutAt(null);
      setAvgDurationSec(0); setThisMonthCount(0); setStreakDays(0);
    } finally { setStatsLoading(false); }
  }, [userId]);

  useEffect(() => {
    if (!focused && hasLoadedOnceRef.current) return;
    let alive = true;
    (async () => {
      const firstLoad = !hasLoadedOnceRef.current;
      if (firstLoad) {
        setFirstPaintPending(true);
        setInitialLoading(true);
        setStatsLoading(true);
      }
      try {
        const [ , , listRes ] = await Promise.all([ loadProfile(), loadStats(), fetchPage(0) ]);
        if (!alive) return;
        setPage(0);
        setList(listRes.data);
        setHasMore(listRes.hasMore);
      } finally {
        if (!alive) return;
        hasLoadedOnceRef.current = true;
        setInitialLoading(false);
        setFirstPaintPending(false);
      }
    })();
    return () => { alive = false; };
  }, [fetchPage, focused, loadProfile, loadStats]);

  const loadMore = useCallback(async () => {
    if (moreLoading || initialLoading || !hasMore) return;
    setMoreLoading(true);
    const next = page + 1;
    const res = await fetchPage(next);
    setList(prev => [...prev, ...res.data]);
    setHasMore(res.hasMore);
    setPage(next);
    setMoreLoading(false);
  }, [page, moreLoading, initialLoading, hasMore, fetchPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setPage(0);
    const res = await fetchPage(0);
    setList(res.data); setHasMore(res.hasMore);
    setRefreshing(false);
  }, [fetchPage, loadStats]);

  const initial = (displayName || userEmail || "?").trim().charAt(0).toUpperCase() || "?";
  const avatarBg = avatarColor || autoColorFromString(displayName || userEmail || "user");

  const avgMin = useMemo(() => Math.round((avgDurationSec || 0) / 60), [avgDurationSec]);
  const totalHours = useMemo(() => Math.floor((totalDurationSec || 0) / 3600), [totalDurationSec]);
  const totalMinutesRemainder = useMemo(() => Math.floor(((totalDurationSec || 0) % 3600) / 60), [totalDurationSec]);
  const showEmptyState = !statsLoading && totalWorkouts === 0;
  const showInitialLoader = !hasLoadedOnceRef.current && (firstPaintPending || initialLoading);

  const StatsContent = () => {
    if (showEmptyState) {
      return (
        <View style={[st.gradientCard, shadow, { marginTop: spacing(1) }]}>
          <LinearGradient colors={GRAD_SOFT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={RNStyleSheet.absoluteFill} />
          <View style={st.cardInnerPad}>
            <Text style={st.emptyTitle}>{t("history.empty_title")}</Text>
            <Text style={st.emptySub}>{t("history.empty_sub")}</Text>
          </View>
        </View>
      );
    }

    return (
      <>
        <View style={[st.gradientCard, shadow, { marginTop: spacing(1) }]}>
          <LinearGradient colors={GRAD_SOFT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={RNStyleSheet.absoluteFill} />
          <View style={st.totalContentRow}>
            <View style={st.totalLeft}>
              <Text style={st.totalLabel}>{t("history.total_workouts_label")}</Text>
              <Text style={st.totalValue}>{totalWorkouts}</Text>
            </View>
            <View style={st.totalRight}>
              <Text style={st.metaTitle}>{t("history.total_time_title")}</Text>
              <Text style={st.metaValue}>
                {totalHours > 0 ? `${totalHours}${t("history.time_h")} ` : ""}
                {`${totalMinutesRemainder}${t("history.time_m")}`}
              </Text>
              <View style={{ height: spacing(1) }} />
              <Text style={st.metaTitle}>{t("history.since_title")}</Text>
              <Text style={st.metaValue}>{firstWorkoutAt ? monthNameY(firstWorkoutAt) : t("history.placeholder_none")}</Text>
            </View>
          </View>
        </View>

        <View style={st.smallRow}>
          <View style={[st.smallCard, shadow]}>
            <View style={st.smallIcon}>
              <LinearGradient colors={GRAD_PILL} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={RNStyleSheet.absoluteFill} />
              <Ionicons name="calendar-outline" size={14} color={ICON_TINT} />
            </View>
            <Text style={st.smallValue}>{thisMonthCount}</Text>
            <Text style={st.smallLabel}>{t("history.this_month_label")}</Text>
          </View>

          <View style={[st.smallCard, shadow]}>
            <View style={st.smallIcon}>
              <LinearGradient colors={GRAD_PILL} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={RNStyleSheet.absoluteFill} />
              <Ionicons name="flame" size={14} color={ICON_TINT} />
            </View>
            <Text style={st.smallValue}>{streakDays}</Text>
            <Text style={st.smallLabel}>{t("history.streak_label")}</Text>
          </View>

          <View style={[st.smallCard, shadow]}>
            <View style={st.smallIcon}>
              <LinearGradient colors={GRAD_PILL} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={RNStyleSheet.absoluteFill} />
              <Ionicons name="time-outline" size={14} color={ICON_TINT} />
            </View>
            <Text style={st.smallValue}>{avgMin}{t("history.time_m")}</Text>
            <Text style={st.smallLabel}>{t("history.avg_label")}</Text>
          </View>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        <View style={st.container}>
          <View style={st.topBar}>
            <Text style={st.title}>{t("history.title")}</Text>
            <View style={st.iconsWrap}>
              <TouchableOpacity onPress={() => nav.navigate("Settings")} style={st.topIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="settings-outline" size={18} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => nav.navigate("Profile")} style={st.avatarBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <View style={[st.avatarCircle, { backgroundColor: avatarBg }]}><Text style={st.avatarInitial}>{initial}</Text></View>
              </TouchableOpacity>
            </View>
          </View>

          {showInitialLoader ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={list}
              keyExtractor={(it) => it.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={st.row}
                  onPress={() => nav.navigate("WorkoutDetail", { workoutId: item.id, mode: "saved" })}
                >
                  <View>
                    <Text style={st.name}>{item.name}</Text>
                    <Text style={st.sub}>
                      {new Date(item.started_at).toLocaleString()}
                      {item.duration_sec ? ` • ${fmtMinSec(item.duration_sec)}` : ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: spacing(1) }} />}
              onEndReachedThreshold={0.3}
              onEndReached={loadMore}
              refreshing={refreshing}
              onRefresh={onRefresh}
              contentContainerStyle={{ paddingBottom: spacing(10) }}
              ListFooterComponent={
                moreLoading ? (
                  <View style={{ paddingVertical: spacing(2), alignItems: "center" }}>
                    <ActivityIndicator />
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={{ padding: spacing(2) }}>
                  <Text style={{ color: colors.subtext, textAlign: "center" }}>{t("history.no_workouts_yet")}</Text>
                </View>
              }
            />
          )}

          <TouchableOpacity onPress={openStats} activeOpacity={0.85} style={st.fabStats}>
            <Ionicons name="stats-chart" size={16} color="rgba(255,90,60,1)" />
            <Text style={st.fabText}>{t("history.fab_stats")}</Text>
          </TouchableOpacity>

          {!!(statsOpen || (slide as any)) && (
            <Animated.View
              pointerEvents={statsOpen ? "auto" : "none"}
              style={[
                RNStyleSheet.absoluteFill,
                { justifyContent: "flex-end", opacity: slide.interpolate({ inputRange: [0,1], outputRange: [0,1] }) }
              ]}
            >
              <Pressable onPress={closeStats} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.28)" }} />
              <Animated.View
                style={{
                  transform: [{ translateY: slide.interpolate({ inputRange: [0,1], outputRange: [PANEL_MAX_H, 0] }) }],
                  backgroundColor: colors.bg,
                  paddingBottom: spacing(2),
                }}
              >
                <View style={{ paddingHorizontal: spacing(2), maxHeight: PANEL_MAX_H }}>
                  <View style={{ alignItems: "center", paddingVertical: 8 }}>
                    <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
                  </View>
                  <StatsContent />
                  <View style={{ height: spacing(2) }} />
                </View>
              </Animated.View>
            </Animated.View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const HAIRLINE = RNStyleSheet.hairlineWidth;

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing(2) },

  topBar: { paddingVertical: spacing(2), flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.text, fontSize: 26, fontWeight: "800" },
  iconsWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  topIconBtn: { padding: 8, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  avatarBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", padding: 2 },
  avatarCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#fff", fontWeight: "800", fontSize: 13, includeFontPadding: false },

  gradientCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1.4,
    borderColor: GRAD_BORDER,
  },
  cardInnerPad: { paddingVertical: spacing(2.2), paddingHorizontal: spacing(2), alignItems: "center" },

  emptyTitle: { color: "#fff", fontWeight: "800", fontSize: 18, marginBottom: 8, textAlign: "center" },
  emptySub: { color: colors.subtext, textAlign: "center" },

  totalContentRow: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.2),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  totalLeft: { flexShrink: 1 },
  totalLabel: { color: colors.subtext, fontWeight: "700", fontSize: 13, marginBottom: 2 },
  totalValue: { color: "#fff", fontWeight: "900", fontSize: 34, marginTop: 0 },

  totalRight: { alignItems: "flex-start" },
  metaTitle: { color: colors.subtext, fontWeight: "700", fontSize: 12 },
  metaValue: { color: "#fff", fontWeight: "800", fontSize: 16, marginTop: 2 },

  smallRow: { flexDirection: "row", gap: 12, marginTop: spacing(1.4) },
  smallCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: spacing(2.0),
    paddingHorizontal: spacing(1.8),
    alignItems: "flex-start",
  },
  smallIcon: {
    width: 28, height: 28, borderRadius: 9, overflow: "hidden",
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  smallValue: { color: "#fff", fontWeight: "800", fontSize: 20 },
  smallLabel: { color: colors.subtext, marginTop: 2, fontWeight: "600" },

  row: { backgroundColor: colors.card, borderRadius: 14, padding: spacing(2), borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontSize: 16, fontWeight: "600" },
  sub: { color: colors.subtext, marginTop: 2 },

  fabStats: {
    position: "absolute",
    right: spacing(2),
    bottom: spacing(2),
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,90,60,0.12)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,90,60,0.6)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fabText: { color: "rgba(255,90,60,1)", fontWeight: "800" },
});

export default HistoryScreen;
