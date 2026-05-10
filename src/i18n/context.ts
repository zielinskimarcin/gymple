// src/i18n/context.ts
import React from "react";

export type SupportedLang = "en" | "pl" | "it";
export type PreferredLang = "system" | SupportedLang;

// prosta struktura słownika: gniazdka i/lub kropkowane klucze
export type Dict = Record<string, string | Dict>;

/** Bezpieczne pobieranie wartości z kropkowanego klucza, np. "settings.title" */
export function getFromDict(dict: Dict, key: string): string | undefined {
  const parts = key.split(".");
  let cur: any = dict;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Mapowanie języka systemowego na nasze wspierane */
export function mapSystemToSupported(code?: string): SupportedLang {
  if (!code) return "en";
  const lower = code.toLowerCase();
  if (lower.startsWith("pl")) return "pl";
  if (lower.startsWith("it")) return "it";
  return "en";
}

/** Klucze do lokalnego cache (AsyncStorage) */
export const I18N_PREF_KEY = "i18n:pref";      // "system" | "en" | "pl"
export const I18N_RESOLVED_KEY = "i18n:active"; // "en" | "pl"

/** API kontekstu i18n */
export type I18nContextValue = {
  lang: SupportedLang;                    // rozstrzygnięty język (np. "pl")
  pref: PreferredLang;                    // preferencja użytkownika (np. "system")
  t: (key: string) => string;             // tłumaczenie
  setPreferredLanguage: (p: PreferredLang) => Promise<void> | void; // zmiana preferencji
};

export const I18nContext = React.createContext<I18nContextValue | undefined>(undefined);

/** Hook wygodny do użycia w komponentach */
export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    // Świadomie nie rzucamy błędu – pozwala używać ekranu zanim Provider się podłączy
    // ale zachęcam, aby Provider był wysoko (np. w App.tsx) – wtedy ctx zawsze istnieje.
  }
  return ctx;
}