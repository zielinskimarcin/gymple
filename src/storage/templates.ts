import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Template } from "../types";

const K_TEMPLATES = "gt.templates.v1";
const K_SELECTED_TEMPLATE = "gt.selected_template_id.v1";

export async function loadTemplates(): Promise<Template[]> {
  const raw = await AsyncStorage.getItem(K_TEMPLATES);
  if (!raw) return [];
  try { return JSON.parse(raw) as Template[]; } catch { return []; }
}

export async function saveTemplates(list: Template[]) {
  await AsyncStorage.setItem(K_TEMPLATES, JSON.stringify(list));
}

export async function upsertTemplate(t: Template) {
  const list = await loadTemplates();
  const idx = list.findIndex(x => x.id === t.id);
  if (idx >= 0) list[idx] = t; else list.unshift(t);
  await saveTemplates(list);
}

export async function updateTemplate(id: string, upd: (t: Template) => Template) {
  const list = await loadTemplates();
  const idx = list.findIndex(x => x.id === id);
  if (idx < 0) return;
  list[idx] = upd(list[idx]);
  await saveTemplates(list);
}

export async function deleteTemplate(id: string) {
  const list = await loadTemplates();
  await saveTemplates(list.filter(x => x.id !== id));
  const sel = await getSelectedTemplateId();
  if (sel === id) await setSelectedTemplateId(null);
}

export async function getSelectedTemplateId(): Promise<string | null> {
  return (await AsyncStorage.getItem(K_SELECTED_TEMPLATE)) || null;
}
export async function setSelectedTemplateId(id: string | null) {
  if (id) await AsyncStorage.setItem(K_SELECTED_TEMPLATE, id);
  else await AsyncStorage.removeItem(K_SELECTED_TEMPLATE);
}