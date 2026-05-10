import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

export const HeaderActions: React.FC = () => {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { top: Math.max(insets.top, 8) }]}
    >
      <TouchableOpacity
        accessibilityLabel="Open Settings"
        onPress={() => nav.navigate("Settings")}
        style={styles.circle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityLabel="Open Profile"
        onPress={() => nav.navigate("Profile")}
        style={styles.circle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="person-outline" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 12,
    flexDirection: "row",
    gap: 8,
    zIndex: 100,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2E3136",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2B2F36",
  },
});
