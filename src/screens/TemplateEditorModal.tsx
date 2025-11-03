import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from "react-native";
import { colors, spacing } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { TEMPLATE_ICON_MAP } from "../constants/templateIcons";
import { DEFAULT_TEMPLATES } from "../constants/defaultTemplates";
import { loadCustomExercises } from "../storage";
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

  const [customs, setCustoms] = useState<Exercise[]>([]);

  useEffect(() => {
    (async () => {
      setCustoms(await loadCustomExercises());
    })();
  }, [isFocused]);

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

  const allExercises = useMemo<Exercise[]>(
    () => [...DEFAULT_EXERCISES, ...customs],
    [customs]
  );

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
    if (editing) {
      await updateTemplate(tpl.id, () => ({ ...tpl, createdAt: now })); // simple replace
    } else {
      await upsertTemplate(tpl);
    }
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
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>{editing ? "Edit template" : "New template"}</Text>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <Ionicons name="close" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* Name */}
        <View>
          <Text style={s.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Template name"
            placeholderTextColor={colors.subtext}
            style={s.input}
          />
        </View>

        {/* Icons */}
        <View>
          <Text style={s.label}>Icon</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {ICONS.map((k) => {
              const active = icon === k;
              return (
                <TouchableOpacity key={k} style={[s.iconBtn, active && { backgroundColor: colors.accent }]} onPress={() => setIcon(k)}>
                  <Ionicons name={TEMPLATE_ICON_MAP[k]} size={18} color={active ? "#0E0E10" : colors.text} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Exercise picker */}
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Exercises</Text>
          <FlatList
            data={allExercises}
            keyExtractor={(e) => e.id}
            renderItem={({ item }) => {
              const on = pickedIds.includes(item.id);
              return (
                <TouchableOpacity onPress={() => toggleExercise(item.id)} style={s.row}>
                  <View>
                    <Text style={s.name}>{item.name}</Text>
                    <Text style={s.sub}>{item.muscleGroup}</Text>
                  </View>
                  <Ionicons name={on ? "checkbox-outline" : "square-outline"} size={20} color={on ? colors.accent : colors.subtext} />
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            contentContainerStyle={{ paddingBottom: spacing(2) }}
          />
          <TouchableOpacity onPress={() => nav.navigate("AddExercise" as never)} style={[s.secondaryBtn,{marginTop:spacing(1)}]}>
            <Ionicons name="add" size={16} color={colors.text} />
            <Text style={s.secondaryTxt}>Add custom exercise</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.save} onPress={save}>
          <Text style={{ color: "#0E0E10", fontWeight: "800" }}>Save</Text>
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
    width: 40, height: 40, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border
  },
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
  name: { color: colors.text, fontWeight: "700" },
  sub: { color: colors.subtext, marginTop: 2 },
  secondaryBtn:{flexDirection:"row",gap:8,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:colors.border,borderRadius:12,paddingVertical:spacing(1.2)},
  secondaryTxt:{color:colors.text,fontWeight:"600"},
  save: {
    marginTop: spacing(1),
    backgroundColor: colors.accent,
    paddingVertical: spacing(2),
    alignItems: "center",
    borderRadius: 14,
  },
});