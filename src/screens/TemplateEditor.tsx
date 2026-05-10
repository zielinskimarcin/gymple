import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";

import type { Exercise, Template, TemplateIconKey } from "../types";
import { DEFAULT_EXERCISES } from "../constants/exercises";
import { TEMPLATE_ICON_MAP } from "../constants/templateIcons";
import { DEFAULT_TEMPLATES } from "../constants/defaultTemplates";
import type { RootStackParamList } from "../navigation/AppNavigator";

import { fetchCustomExercises } from "../storage/customExercises";
import { popLastAddedExerciseTemp } from "../storage/lastAdded";
import { loadTemplates, saveTemplate, updateTemplate, deleteTemplate, setFavourite } from "../storage/templates";
import { useI18n } from "../i18n";

const ICON_KEYS = Object.keys(TEMPLATE_ICON_MAP) as TemplateIconKey[];
type RouteParams = { id?: string };
type Nav = NativeStackNavigationProp<RootStackParamList>;

export const TemplateEditor = () => {
  const nav = useNavigation<Nav>();
  const { t } = useI18n();
  const route = useRoute<any>();
  const editingId = (route.params as RouteParams)?.id ?? null;

  const isDefaultTemplate = !!DEFAULT_TEMPLATES.find((d) => d.id === editingId);
  const defaultMeta = isDefaultTemplate ? DEFAULT_TEMPLATES.find((d) => d.id === editingId)! : null;

  const [name, setName] = useState(
    isDefaultTemplate ? (defaultMeta?.name ?? t("template_editor.fallback_template")) : (editingId ? t("template_editor.fallback_template") : t("template_editor.new_template"))
  );
  const [icon, setIcon] = useState<TemplateIconKey>(
    isDefaultTemplate ? (defaultMeta?.icon as TemplateIconKey) : "flash"
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [favorite, setFavorite] = useState<boolean>(false);

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
          setName(defaultMeta?.name ?? t("template_editor.fallback_template"));
          setIcon((defaultMeta?.icon as TemplateIconKey) ?? "flash");
          setSelectedIds(new Set(defaultMeta?.exerciseIds ?? []));
          setFavorite(false);
        } else {
          const list = await loadTemplates();
          const t = list.find((x) => x.id === editingId);
          if (t) {
            setName(t.name);
            setIcon(t.icon);
            setSelectedIds(new Set(t.exerciseIds ?? []));
            setFavorite(!!t.favorite);
          }
        }
      }
      const cx = await fetchCustomExercises();
      setCustom((prev) => uniqById([...prev, ...cx]));
    })();
  }, [editingId, isDefaultTemplate, defaultMeta, t]);

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
      return () => { alive = false; };
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

  async function nameClashes(newName: string): Promise<boolean> {
    const tNew = newName.trim().toLowerCase();
    if (!tNew) return false;

    const mine = await loadTemplates();
    const mineSet = new Set(
      (mine || [])
        .filter((t: any) => t.id !== editingId)
        .map((t: any) => (t.name || "").trim().toLowerCase())
    );

    const defaultsSet = new Set(DEFAULT_TEMPLATES.map((t) => t.name.trim().toLowerCase()));
    return mineSet.has(tNew) || defaultsSet.has(tNew);
  }

  async function onSave() {
    if (selectedIds.size < 1) {
      Alert.alert(t("template_editor.select_exercises_title"), t("template_editor.select_exercises_message"));
      return;
    }

    if (isDefaultTemplate && editingId) {
      Alert.alert(t("template_editor.cant_edit_default"));
      nav.goBack();
      return;
    }

    const trimmed = (name || "").trim();
    if (!trimmed) {
      Alert.alert(t("template_editor.missing_name_title"), t("template_editor.missing_name_message"));
      return;
    }

    if (await nameClashes(trimmed)) {
      Alert.alert(t("template_editor.duplicate_name_title"), t("template_editor.duplicate_name_message"));
      return;
    }

    const now = Date.now();
    const payload: Template = {
      id: editingId ?? `tpl_${Date.now()}`,
      name: trimmed,
      icon: icon,
      exerciseIds: Array.from(selectedIds),
      createdAt: now,
      updatedAt: now,
    };

    let ok = true;
    if (editingId) {
      const { ok: resOk, error } = await updateTemplate(payload.id, {
        name: payload.name,
        icon: payload.icon,
        exerciseIds: payload.exerciseIds,
      });
      ok = resOk;
      if (!resOk) Alert.alert(t("template_editor.save_failed"), error || t("template_editor.unknown_error"));
    } else {
      const { ok: resOk, error } = await saveTemplate(payload);
      ok = resOk;
      if (!resOk) Alert.alert(t("template_editor.save_failed"), error || t("template_editor.unknown_error"));
    }

    if (!ok) return;

    if (!isDefaultTemplate) {
      await setFavourite(payload.id, favorite);
    }

    nav.goBack();
  }

  async function onDelete() {
    if (!editingId || isDefaultTemplate) {
      nav.goBack();
      return;
    }
    const res = await deleteTemplate(editingId);
    if (!res.ok) {
      Alert.alert(t("template_editor.delete_failed"), res.error || t("template_editor.unknown_error"));
      return;
    }
    nav.goBack();
  }

  function onQuickAddCustom() {
    nav.navigate("AddExercise");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, padding: spacing(2) }}>
        <View style={s.top}>
          <TouchableOpacity onPress={() => nav.goBack()} style={s.iconBtn} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.topTitle}>
            {editingId
              ? (isDefaultTemplate
                ? t("template_editor.default_prefix").replace("{{name}}", defaultMeta?.name ?? t("template_editor.fallback_template"))
                : t("template_editor.edit_template"))
              : t("template_editor.new_template")}
          </Text>
          <TouchableOpacity onPress={() => nav.goBack()} style={s.iconBtn} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
            <Ionicons name="close" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.label}>{t("template_editor.name")}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            editable={!isDefaultTemplate}
            placeholder={t("template_editor.name_placeholder")}
            placeholderTextColor={colors.subtext}
            style={[s.input, isDefaultTemplate && { opacity: 0.7 }]}
          />
          {isDefaultTemplate ? (
            <Text style={{ color: colors.subtext, marginTop: 6, fontSize: 12 }}>
              {t("template_editor.default_rename_hint")}
            </Text>
          ) : null}

          <Text style={s.label}>{t("template_editor.icon")}</Text>
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

          {!isDefaultTemplate && (
            <TouchableOpacity
              onPress={async () => {
                const to = !favorite;
                setFavorite(to);
                if (editingId) {
                  await setFavourite(editingId, to);
                }
              }}
              style={s.favRow}
              activeOpacity={0.85}
            >
              <View style={s.favStar}>
                <Ionicons name={favorite ? "star" : "star-outline"} size={16} color={favorite ? "#FFD166" : colors.subtext} />
              </View>
              <Text style={s.favTxt}>{favorite ? t("template_editor.remove_favourite") : t("template_editor.add_favourite")}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.searchBar}>
          <View style={s.searchLeft}>
            <Ionicons name="search-outline" size={16} color={colors.subtext} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={t("search_exercise.placeholder")}
              placeholderTextColor={colors.subtext}
              style={s.searchInput}
            />
          </View>
          <TouchableOpacity onPress={onQuickAddCustom} style={s.quickAddBtn} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
            <Text style={s.quickAddTxt}>{t("template_editor.custom")}</Text>
            <Ionicons name="add-circle-outline" size={16} color={colors.accent} />
          </TouchableOpacity>
        </View>

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

        <View style={s.bottomDock}>
          <TouchableOpacity
            style={[s.saveBtn, (isDefaultTemplate && editingId) && { opacity: 0.5 }]}
            onPress={onSave}
            disabled={isDefaultTemplate && !!editingId}
          >
            <Text style={s.saveTxt}>
              {(isDefaultTemplate && editingId)
                ? t("template_editor.cant_edit_default")
                : editingId
                  ? t("template_editor.save_changes")
                  : t("template_editor.create_template")}
            </Text>
          </TouchableOpacity>

          {editingId && !isDefaultTemplate ? (
            <TouchableOpacity onPress={onDelete} style={{ alignSelf: "center", marginTop: 10 }}>
              <Text style={{ color: "#ff6b6b", fontWeight: "700" }}>{t("template_editor.delete")}</Text>
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

  favRow: { flexDirection: "row", alignItems: "center", marginTop: spacing(1.5), gap: 10 },
  favStar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  favTxt: { color: colors.text, fontWeight: "700" },

  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginBottom: spacing(1.5), overflow: "hidden" },
  searchLeft: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, flex: 1 },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 10 },
  quickAddBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderLeftWidth: 1, borderLeftColor: colors.border },
  quickAddTxt: { color: colors.accent, fontWeight: "700" },

  row: { backgroundColor: colors.card, borderRadius: 12, padding: spacing(2), borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent:"space-between" },
  rowPicked: { borderColor: "#ff4d4d" },
  rowName: { color: colors.text, fontWeight: "700" },
  rowSub: { color: colors.subtext, marginTop: 2 },

  bottomDock: { backgroundColor: colors.bg, paddingTop: spacing(2), paddingBottom: spacing(2), borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { backgroundColor: colors.accent, borderRadius: 14, alignItems: "center", paddingVertical: spacing(2) },
  saveTxt: { color: "#0E0E10", fontWeight: "800" },
});
