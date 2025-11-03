import React, { useState } from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import { colors, spacing } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";

export const SettingsScreen = () => {
  const [dark, setDark] = useState(true);
  const [kg, setKg] = useState(true);
  const [en, setEn] = useState(true);

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: colors.bg }}>
      <View style={s.container}>
        <Text style={s.title}>Settings</Text>

        <View style={s.row}>
          <Text style={s.key}>Theme</Text>
          <View style={s.valueRow}>
            <Text style={s.valTxt}>{dark ? "Dark" : "Light"}</Text>
            <Switch value={dark} onValueChange={setDark} />
          </View>
        </View>

        <View style={s.row}>
          <Text style={s.key}>Units</Text>
          <View style={s.valueRow}>
            <Text style={s.valTxt}>{kg ? "kg" : "lbs"}</Text>
            <Switch value={kg} onValueChange={setKg} />
          </View>
        </View>

        <View style={s.row}>
          <Text style={s.key}>Language</Text>
          <View style={s.valueRow}>
            <Text style={s.valTxt}>{en ? "English" : "Polski"}</Text>
            <Switch value={en} onValueChange={setEn} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container:{ flex:1, padding: spacing(2) },
  title:{ color:colors.text, fontSize:22, fontWeight:"800", marginBottom: spacing(2) },
  row:{ backgroundColor:colors.card, borderRadius:14, padding: spacing(2), borderWidth:1, borderColor:colors.border, marginBottom: spacing(1) },
  key:{ color:colors.text, fontWeight:"700", marginBottom:6 },
  valueRow:{ flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  valTxt:{ color:colors.subtext },
});