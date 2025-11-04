// src/screens/HistoryScreen.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { colors, spacing } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

type DbWorkout = {
  id: string;
  name: string;
  started_at: string;   // ISO string
  duration_sec: number; // int
};

export const HistoryScreen = () => {
  const [list, setList] = useState<DbWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const focused = useIsFocused();
  const nav = useNavigation();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("workouts")
        .select("id,name,started_at,duration_sec")
        .order("started_at", { ascending: false });

      if (error) {
        console.warn("Supabase fetch workouts error:", error.message);
        setList([]);
      } else {
        setList(data ?? []);
      }
      setLoading(false);
    })();
  }, [focused]);

  function fmt(sec?: number) {
    if (sec === undefined || sec === null) return "";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        {/* Top bar spójny z Train: tytuł po lewej, ikonki po prawej */}
        <View style={styles.topBar}>
          <Text style={styles.title}>History</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              onPress={() => nav.navigate("Settings" as never)}
              style={styles.topIconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="settings-outline" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => nav.navigate("Profile" as never)}
              style={styles.topIconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="person-circle-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={list}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                nav.navigate("WorkoutDetail" as never, { workoutId: item.id, mode: "saved" } as never)
              }
            >
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>
                  {new Date(item.started_at).toLocaleString()}
                  {item.duration_sec ? ` • ${fmt(item.duration_sec)}` : ""}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing(1) }} />}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Your workout history is empty.</Text>
              </View>
            ) : null
          }
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: !loading && list.length === 0 ? "center" : "flex-start",
            paddingBottom: spacing(10),
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing(2) },

  // top bar jak w TrainScreen
  topBar: {
    paddingVertical: spacing(1.2),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topIconBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  title: { color: colors.text, fontSize: 26, fontWeight: "800" },

  row: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: "600" },
  sub: { color: colors.subtext, marginTop: 2 },

  // empty state
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    padding: spacing(4),
  },
  emptyText: {
    color: colors.subtext,
    fontSize: 15,
    textAlign: "center",
  },
});

export default HistoryScreen;