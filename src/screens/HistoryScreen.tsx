import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { colors, spacing } from "../theme";
import { loadWorkouts } from "../storage";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

export const HistoryScreen = () => {
  const [list, setList] = useState<any[]>([]);
  const focused = useIsFocused();
  const nav = useNavigation();

  useEffect(() => { (async () => setList(await loadWorkouts()))(); }, [focused]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <Text style={styles.title}>History</Text>
        <FlatList
          data={list}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => nav.navigate("WorkoutDetail" as never, { workoutId: item.id } as never)}>
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>{new Date(item.startedAt).toLocaleString()} • {fmt(item.durationSec)}</Text>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing(1) }} />}
          contentContainerStyle={{ paddingBottom: spacing(10) }}
        />
      </View>
    </SafeAreaView>
  );
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60); const s = sec % 60;
  return `${m}m ${s}s`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing(2) },
  title: { color: colors.text, fontSize: 24, fontWeight: "700", marginBottom: spacing(2) },
  row: { backgroundColor: colors.card, borderRadius: 14, padding: spacing(2), borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontSize: 16, fontWeight: "600" },
  sub: { color: colors.subtext, marginTop: 2 },
});
