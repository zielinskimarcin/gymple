// src/screens/TemplateEditor.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";

import type { Exercise, Template } from "../types";
import { DEFAULT_EXERCISES } from "../constants/exercises";
import { TEMPLATE_ICON_MAP } from "../constants/templateIcons";
import { DEFAULT_TEMPLATES } from "../constants/defaultTemplates";

import { fetchCustomExercises } from "../storage/customExercises";
import { popLastAddedExerciseTemp } from "../storage/lastAdded";
import { loadTemplates, saveTemplate, updateTemplate, deleteTemplate } from "../storage/templates";

const ICON_KEYS = Object.keys(TEMPLATE_ICON_MAP) as Array<keyof typeof TEMPLATE_ICON_MAP>;
type RouteParams = { id?: string };

export const TemplateEditor = () => {
  const nav = useNavigation();
  const route = useRoute<any>();
  const editingId = (route.params as RouteParams)?.id ?? null;

  const isDefaultTemplate = !!DEFAULT_TEMPLATES.find((d) => d.id === editingId);
  const defaultMeta = isDefaultTemplate ? DEFAULT_TEMPLATES.find((d) => d.id === editingId)! : null;

  const [name, setName] = useState(
    isDefaultTemplate ? (defaultMeta?.name ?? "Template") : (editingId ? "Template" : "New template")
  );
  const [icon, setIcon] = useState<keyof typeof TEMPLATE_ICON_MAP>(
    isDefaultTemplate ? (defaultMeta?.icon as keyof typeof TEMPLATE_ICON_MAP) : "flash"
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [custom, setCustom] = useState<Exercise[]>([]);
  const allExercises = useMemo<Exercise[]>(() => [...custom, ...DEFAULT_EXERCISES], [custom]);

  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return allExercises;
    return allExercises.filter(
      (e) =>
        e.name.toLowerCase().includes(t) ||
        (e.muscleGroup ?? "").toLowerCase().includes(t)
    );
  }, [q, allExercises]);

  const listRef = useRef<FlatList<any>>(null);

  function uniqById(list: Exercise[]): Exercise[] {
    const seen = new Set<string>();
    const out: Exercise[] = [];
    for (const e of list) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      out.push(e);
    }
    return out;
  }

  useEffect(() => {
    (async () => {
      if (editingId) {
        if (isDefaultTemplate) {
          setName(defaultMeta?.name ?? "Template");
          setIcon((defaultMeta?.icon as keyof typeof TEMPLATE_ICON_MAP) ?? "flash");
          setSelectedIds(new Set(defaultMeta?.exerciseIds ?? []));
        } else {
          const list = await loadTemplates();
          const t = list.find((x) => x.id === editingId);
          if (t) {
            setName(t.name);
            setIcon(t.icon as keyof typeof TEMPLATE_ICON_MAP);
            setSelectedIds(new Set(t.exerciseIds ?? []));
          }
        }
      }
      const cx = await fetchCustomExercises();
      setCustom((prev) => uniqById([...prev, ...cx]));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        const cx = await fetchCustomExercises();
        const just = await popLastAddedExerciseTemp();
        if (!alive) return;

        if (just) {
          setCustom((prev) => uniqById([just, ...prev, ...cx]));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.add(just.id);
            return next;
          });
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
          });
        } else {
          setCustom((prev) => uniqById([...prev, ...cx]));
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  function toggleExercise(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // -------- DUPLICATE NAME CHECK (case-insensitive) --------
  async function nameClashes(newName: string): Promise<boolean> {
    const tNew = newName.trim().toLowerCase();
    if (!tNew) return false;

    const mine = await loadTemplates(); // only user’s templates
    const mineSet = new Set(
      mine
        .filter((t) => t.id !== editingId) // allow keeping same name on the same record
        .map((t) => t.name.trim().toLowerCase())
    );

    const defaultsSet = new Set(DEFAULT_TEMPLATES.map((t) => t.name.trim().toLowerCase()));
    return mineSet.has(tNew) || defaultsSet.has(tNew);
  }

  async function onSave() {
    if (selectedIds.size < 1) {
      Alert.alert("Select exercises", "A template must contain at least 1 exercise.");
      return;
    }

    // if editing a default template → saving is disabled (button already inactive),
    // but guard here too just in case
    if (isDefaultTemplate && editingId) {
      Alert.alert("Can't edit default template");
      return;
    }

    const trimmed = (name || "").trim();
    if (!trimmed) {
      Alert.alert("Missing name", "Please enter a template name.");
      return;
    }

    // Block duplicate names (both vs your templates and defaults)
    if (await nameClashes(trimmed)) {
      Alert.alert("Name already exists", "Choose a different template name.");
      return;
    }

    const payload: Template = {
      id: editingId ?? `tpl_${Date.now()}`,
      name: trimmed,
      icon: icon,
      exerciseIds: Array.from(selectedIds),
    };

    let res: { ok: boolean; error?: string };
    if (editingId) {
      res = await updateTemplate(payload.id, {
        name: payload.name,
        icon: payload.icon,
        exerciseIds: payload.exerciseIds,
      });
    } else {
      res = await saveTemplate(payload);
    }

    if (!res.ok) {
      Alert.alert("Save failed", res.error || "Unknown error");
      return;
    }

    // @ts-ignore
    nav.goBack();
  }

  async function onDelete() {
    if (!editingId || isDefaultTemplate) {
      // @ts-ignore
      nav.goBack();
      return;
    }
    const res = await deleteTemplate(editingId);
    if (!res.ok) {
      Alert.alert("Delete failed", res.error || "Unknown error");
      return;
    }
    // @ts-ignore
    nav.goBack();
  }

  function onQuickAddCustom() {
    // @ts-ignore
    nav.navigate("AddExercise");
  }

  // Save button state
  const saveDisabled = !!(isDefaultTemplate && editingId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, padding: spacing(2) }}>
        {/* Top bar */}
        <View style={s.top}>
          <TouchableOpacity onPress={() => nav.goBack()} style={s.iconBtn} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.topTitle}>
            {editingId ? (isDefaultTemplate ? `Default: ${defaultMeta?.name}` : "Edit template") : "New template"}
          </Text>
          <TouchableOpacity onPress={() => nav.goBack()} style={s.iconBtn} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
            <Ionicons name="close" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Name + icons */}
        <View style={s.card}>
          <Text style={s.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            editable={!isDefaultTemplate}
            placeholder="Template name"
            placeholderTextColor={colors.subtext}
            style={[s.input, isDefaultTemplate && { opacity: 0.7 }]}
          />
          {isDefaultTemplate ? (
            <Text style={{ color: colors.subtext, marginTop: 6, fontSize: 12 }}>
              Default templates can’t be renamed.
            </Text>
          ) : null}

          <Text style={s.label}>Icon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
            {ICON_KEYS.map((key) => {
              const active = icon === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setIcon(key)}
                  style={[s.iconDot, active && s.iconDotActive]}
                  accessibilityLabel={key}
                >
                  <Ionicons name={TEMPLATE_ICON_MAP[key]} size={18} color={active ? colors.accent : colors.text} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Search + Custom */}
        <View style={s.searchBar}>
          <View style={s.searchLeft}>
            <Ionicons name="search-outline" size={16} color={colors.subtext} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search exercises or groups…"
              placeholderTextColor={colors.subtext}
              style={s.searchInput}
            />
          </View>
          <TouchableOpacity onPress={onQuickAddCustom} style={s.quickAddBtn} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
            <Text style={s.quickAddTxt}>Custom</Text>
            <Ionicons name="add-circle-outline" size={16} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Exercise list */}
        <FlatList
          ref={listRef}
          data={filtered}
          keyExtractor={(it) => it.id}
          style={{ flex: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const picked = selectedIds.has(item.id);
            return (
              <TouchableOpacity
                onPress={() => toggleExercise(item.id)}
                style={[s.row, picked && s.rowPicked]}
                activeOpacity={0.85}
              >
                <View>
                  <Text style={s.rowName}>{item.name}</Text>
                  <Text style={s.rowSub}>{item.muscleGroup}</Text>
                </View>
                {picked ? (
                  <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                ) : (
                  <Ionicons name="ellipse-outline" size={16} color={colors.subtext} />
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: spacing(10) }}
        />

        {/* Bottom */}
        <View style={s.bottomDock}>
          <TouchableOpacity
            style={[s.saveBtn, saveDisabled && { opacity: 0.5 }]}
            onPress={onSave}
            disabled={saveDisabled}
          >
            <Text style={s.saveTxt}>
              {saveDisabled
                ? "Can’t edit default template"
                : editingId
                  ? "Save changes"
                  : "Create template"}
            </Text>
          </TouchableOpacity>

          {editingId && !isDefaultTemplate ? (
            <TouchableOpacity onPress={onDelete} style={{ alignSelf: "center", marginTop: 10 }}>
              <Text style={{ color: "#ff6b6b", fontWeight: "700" }}>Delete</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing(2) },
  topTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },

  card: { backgroundColor: colors.card, borderRadius: 14, padding: spacing(2), borderWidth: 1, borderColor: colors.border, marginBottom: spacing(1.5) },
  label: { color: colors.subtext, marginTop: spacing(1), marginBottom: 6 },
  input: { backgroundColor: colors.muted, color: colors.text, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },

  iconDot: { width: 38, height: 38, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  iconDotActive: { borderColor: colors.accent, backgroundColor: "#2b2f36" },

  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginBottom: spacing(1.5), overflow: "hidden" },
  searchLeft: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, flex: 1 },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 10 },
  quickAddBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderLeftWidth: 1, borderLeftColor: colors.border },
  quickAddTxt: { color: colors.accent, fontWeight: "700" },

  row: { backgroundColor: colors.card, borderRadius: 12, padding: spacing(2), borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowPicked: { borderColor: "#ff4d4d" },
  rowName: { color: colors.text, fontWeight: "700" },
  rowSub: { color: colors.subtext, marginTop: 2 },

  bottomDock: { backgroundColor: colors.bg, paddingTop: spacing(2), paddingBottom: spacing(2), borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { backgroundColor: colors.accent, borderRadius: 14, alignItems: "center", paddingVertical: spacing(2) },
  saveTxt: { color: "#0E0E10", fontWeight: "800" },
});