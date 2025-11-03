import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from "react-native";
import { colors, spacing } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { TEMPLATE_ICON_MAP } from "../constants/templateIcons";
import { DEFAULT_TEMPLATES } from "../constants/defaultTemplates";
import { loadCustomExercises, popLastAddedExerciseTemp } from "../storage";
import { DEFAULT_EXERCISES } from "../constants/exercises";
import { deleteTemplate, loadTemplates, upsertTemplate, updateTemplate } from "../storage/templates";
import type { Exercise, Template, TemplateIconKey } from "../types";

const ICONS: TemplateIconKey[] = ["barbell","flash","body","walk","star"];
const uid = () => "tpl_" + Math.random().toString(36).slice(2) + Date.now().toString(36);

export const TemplateEditorModal = () => {
  const nav = useNavigation();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const { id } = route.params || {};

  const editing = !!id;
  const [name, setName] = useState(editing ? "Template" : "New template");
  const [icon, setIcon] = useState<TemplateIconKey>("star");
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [q, setQ] = useState("");

  const [customs, setCustoms] = useState<Exercise[]>([]);

  // odśwież customy
  useEffect(() => { (async () => setCustoms(await loadCustomExercises()))(); }, [isFocused]);

  // wróciliśmy z AddExercise → dodaj świeżo utworzone ćwiczenie NA GÓRĘ i zaznacz
  useEffect(() => {
    (async () => {
      const justAdded = await popLastAddedExerciseTemp();
      if (!justAdded) return;
      setCustoms(prev => {
        const withoutDup = prev.filter(e => e.id !== justAdded.id);
        return [justAdded, ...withoutDup];
      });
      setPickedIds(prev => prev.includes(justAdded.id) ? prev : [justAdded.id, ...prev]);
    })();
  }, [isFocused]);

  // wczytaj dane przy edycji
  useEffect(() => {
    (async () => {
      if (!editing) return;
      const user = await loadTemplates();
      const base = [...DEFAULT_TEMPLATES, ...user];
      const t = base.find((t) => t.id === id);
      if (t) {
        setName(t.name);
        setIcon(t.icon);
        setPickedIds(t.exerciseIds);
      }
    })();
  }, [id, editing]);

  // lista: najpierw customy (najnowsze), potem domyślne; bez duplikatów
  const allExercises = useMemo<Exercise[]>(() => {
    const sortedCustoms = [...customs].sort((a,b)=>(b.createdAt ?? 0) - (a.createdAt ?? 0));
    const out: Exercise[] = [];
    const seen = new Set<string>();
    for (const e of [...sortedCustoms, ...DEFAULT_EXERCISES]) {
      if (seen.has(e.id)) continue;
      seen.add(e.id); out.push(e);
    }
    return out;
  }, [customs]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return allExercises;
    return allExercises.filter(e =>
      e.name.toLowerCase().includes(t) || (e.muscleGroup||"").toLowerCase().includes(t)
    );
  }, [q, allExercises]);

  function toggleExercise(exId: string) {
    setPickedIds((p) => (p.includes(exId) ? p.filter((x) => x !== exId) : [...p, exId]));
  }

  async function save() {
    const now = Date.now();
    const tpl: Template = {
      id: editing ? id : uid(),
      name: name.trim() || "Template",
      icon,
      exerciseIds: pickedIds,
      createdAt: now,
      updatedAt: now,
    };
    if (editing) { await updateTemplate(tpl.id, () => ({ ...tpl })); }
    else { await upsertTemplate(tpl); }
    nav.goBack();
  }

  async function remove() {
    if (!editing) return;
    await deleteTemplate(id);
    nav.goBack();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: spacing(2), gap: spacing(2), flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{editing ? "Edit template" : "New template"}</Text>
          <TouchableOpacity onPress={() => nav.goBack()}><Ionicons name="close" size={20} color={colors.subtext} /></TouchableOpacity>
        </View>

        {/* Name */}
        <View>
          <Text style={s.label}>Name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Template name" placeholderTextColor={colors.subtext} style={s.input} />
        </View>

        {/* Icons */}
        <View>
          <Text style={s.label}>Icon</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {ICONS.map((k) => {
              const active = icon === k;
              return (
                <TouchableOpacity key={k} style={[s.iconBtn, active && { backgroundColor: colors.accent }]} onPress={() => setIcon(k)}>
                  <Ionicons name={TEMPLATE_ICON_MAP[k]} size={20} color={active ? "#0E0E10" : colors.text} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Search + Exercise picker */}
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Exercises</Text>

          <View style={s.searchRow}>
            {/* Plus po LEWEJ */}
            <TouchableOpacity onPress={() => nav.navigate("AddExercise" as never)} style={s.customAddBtn}>
              <Ionicons name="add-circle" size={22} color="#FF4D4D" />
              <Text style={s.customAddTxt}>Custom</Text>
            </TouchableOpacity>

            {/* Pole szukania */}
            <View style={s.searchBox}>
              <Ionicons name="search-outline" size={16} color={colors.subtext} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search exercises or groups…"
                placeholderTextColor={colors.subtext}
                style={s.searchInput}
              />
            </View>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(e) => e.id}
            renderItem={({ item }) => {
              const on = pickedIds.includes(item.id);
              return (
                <TouchableOpacity onPress={() => toggleExercise(item.id)} style={[s.row, on && s.rowActive]}>
                  <View>
                    <Text style={s.name}>{item.name}</Text>
                    <Text style={s.sub}>{item.muscleGroup}</Text>
                  </View>
                  <Ionicons name={on ? "checkbox-outline" : "square-outline"} size={22} color={on ? colors.accent : colors.subtext} />
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            contentContainerStyle={{ paddingBottom: spacing(2) }}
          />
        </View>

        <TouchableOpacity style={s.save} onPress={save}>
          <Text style={{ color: "#0E0E10", fontWeight: "800", fontSize: 16 }}>Save</Text>
        </TouchableOpacity>

        {editing && (
          <TouchableOpacity onPress={remove} style={{ alignSelf: "center", marginTop: 6 }}>
            <Text style={{ color: "#FF4D4D", textDecorationLine: "underline", fontWeight: "600" }}>Delete template</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  label: { color: colors.subtext, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border
  },

  // Pasek: [ + Custom ] [ search box ]
  searchRow:{
    flexDirection:"row", alignItems:"center", gap:10, marginBottom:8
  },
  customAddBtn:{ flexDirection:"row", alignItems:"center", gap:6, paddingVertical:8, paddingHorizontal:12, borderRadius:12, backgroundColor:"#2A2D33", borderWidth:1, borderColor:colors.border },
  customAddTxt:{ color:"#FF4D4D", fontWeight:"700", fontSize:12 },

  searchBox:{ flex:1, flexDirection:"row", alignItems:"center", gap:8, backgroundColor:colors.card, borderRadius:12, borderWidth:1, borderColor:colors.border, paddingHorizontal:12, paddingVertical:10 },
  searchInput:{ flex:1, color:colors.text, fontSize:15 },

  row: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowActive:{
    borderColor:"#FF4D4D",
    shadowColor:"#FF4D4D",
    shadowOpacity:0.2,
    shadowRadius:4,
    elevation:1,
  },
  name: { color: colors.text, fontWeight: "700", fontSize:15 },
  sub: { color: colors.subtext, marginTop: 2 },

  save: {
    marginTop: spacing(1),
    backgroundColor: colors.accent,
    paddingVertical: spacing(2.2),
    alignItems: "center",
    borderRadius: 14,
  },
});