// src/screens/AccountScreen.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthProvider";

export const AccountScreen = () => {
  const nav = useNavigation();
  const { session, signOut } = useAuth();
  const email = session?.user?.email ?? "";

  async function handleSignOut() {
    try {
      await signOut(); // App.tsx natychmiast pokaże AuthStack (ekran logowania)
    } catch {
      // ewentualnie możesz dorzucić alert
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* mini-header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Account</Text>
        <TouchableOpacity
          onPress={() => nav.goBack()}
          style={s.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={s.container}>
        <View style={s.card}>
          <Text style={s.label}>Email</Text>
          <Text style={s.value}>{email || "—"}</Text>
        </View>

        <TouchableOpacity style={s.logout} onPress={handleSignOut}>
          <Text style={s.logoutTxt}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing(2),
  },
  headerTitle: { color: colors.text, fontWeight: "700", fontSize: 18 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  container: { flex: 1, padding: spacing(2) },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing(2),
  },
  label: { color: colors.subtext, marginBottom: 4 },
  value: { color: colors.text, fontWeight: "600" },
  logout: {
    backgroundColor: "#F04444",
    paddingVertical: spacing(2),
    borderRadius: 14,
    alignItems: "center",
  },
  logoutTxt: { color: "#0E0E10", fontWeight: "800" },
});