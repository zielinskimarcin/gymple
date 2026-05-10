import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, spacing } from "../theme";
import { Ionicons } from "@expo/vector-icons";

export const PremiumPaywall: React.FC<{
  visible: boolean;
  onClose(): void;
  onBuy(): Promise<any>;
  freeLimit: number;
}> = ({ visible, onClose, onBuy, freeLimit }) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={s.wrap}>
        <View style={s.header}>
          <Text style={s.h1}>Osiągnąłeś limit darmowych {freeLimit} treningów 🎉</Text>
          <Text style={s.sub}>Aby kontynuować zapisywanie treningów, przejdź na Premium – lub usuń starsze, by zostać na planie Free.</Text>
        </View>

        <View style={s.bullet}>
          <Ionicons name="infinite" size={18} color={colors.accent} />
          <Text style={s.bulletTxt}>Nielimitowane zapisy treningów</Text>
        </View>
        <View style={s.bullet}>
          <Ionicons name="stats-chart" size={18} color={colors.accent} />
          <Text style={s.bulletTxt}>Pełne statystyki i streak</Text>
        </View>
        <View style={s.bullet}>
          <Ionicons name="cloud-upload" size={18} color={colors.accent} />
          <Text style={s.bulletTxt}>Backup w chmurze</Text>
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={s.primary} onPress={onBuy} activeOpacity={0.9}>
          <Text style={s.primaryTxt}>Odblokuj Premium</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.secondary} onPress={onClose}>
          <Text style={s.secondaryTxt}>Zarządzaj treningami (usuń starsze)</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: spacing(2) },
  header: { gap: 10, marginTop: spacing(1.5), marginBottom: spacing(2) },
  h1: { color: colors.text, fontSize: 22, fontWeight: "800" },
  sub: { color: colors.subtext },
  bullet: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  bulletTxt: { color: colors.text, fontWeight: "600" },
  primary: {
    backgroundColor: colors.accent, borderRadius: 16, paddingVertical: spacing(2),
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  primaryTxt: { color: "#0E0E10", fontWeight: "800" },
  secondary: {
    borderRadius: 14, paddingVertical: spacing(1.6), alignItems: "center",
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing(1),
  },
  secondaryTxt: { color: colors.subtext, fontWeight: "700" },
});