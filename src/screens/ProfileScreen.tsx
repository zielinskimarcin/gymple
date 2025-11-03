import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthProvider";

export const ProfileScreen = () => {
  const { session, signOut } = useAuth();
  const email = session?.user?.email ?? "Unknown";

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: colors.bg }}>
      <View style={s.container}>
        <Text style={s.title}>Profile</Text>
        <View style={s.card}>
          <Text style={s.label}>Email</Text>
          <Text style={s.value}>{email}</Text>
        </View>

        <TouchableOpacity style={s.logout} onPress={signOut}>
          <Text style={s.logoutTxt}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container:{ flex:1, padding: spacing(2) },
  title:{ color:colors.text, fontSize:22, fontWeight:"800", marginBottom: spacing(2) },
  card:{ backgroundColor:colors.card, borderRadius:14, padding: spacing(2), borderWidth:1, borderColor:colors.border },
  label:{ color:colors.subtext, marginBottom:6 },
  value:{ color:colors.text, fontWeight:"700" },
  logout:{ marginTop: spacing(2), backgroundColor:"#F04444", paddingVertical: spacing(2), borderRadius:14, alignItems:"center" },
  logoutTxt:{ color:"#0E0E10", fontWeight:"800" },
});