import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

export const SettingsScreen = () => {
  const nav = useNavigation();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection:"row", alignItems:"center", justifyContent:"space-between", padding: spacing(2) }}>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>Settings</Text>
        <TouchableOpacity
          onPress={() => nav.goBack()}
          style={s.iconBtn}
          hitSlop={{ top:8, bottom:8, left:8, right:8 }}
        >
          <Ionicons name="close" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* TODO: Twoje przełączniki (theme, kg/lbs, language) */}
      <View style={{ padding: spacing(2) }}>
        <Text style={{ color: colors.subtext }}>Coming soon…</Text>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  iconBtn:{
    width:36,height:36,borderRadius:10,alignItems:"center",justifyContent:"center",
    backgroundColor:colors.card,borderWidth:1,borderColor:colors.border
  },
});