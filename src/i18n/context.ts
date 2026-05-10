import React from "react";

export type SupportedLang = "en" | "pl" | "it";
export type PreferredLang = "system" | SupportedLang;

export interface Dict {
  [key: string]: string | Dict;
}

export function getFromDict(dict: Dict, key: string): string | undefined {
  const parts = key.split(".");
  let cur: any = dict;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function mapSystemToSupported(code?: string): SupportedLang {
  if (!code) return "en";
  const lower = code.toLowerCase();
  if (lower.startsWith("pl")) return "pl";
  if (lower.startsWith("it")) return "it";
  return "en";
}

export const I18N_PREF_KEY = "i18n:pref";
export const I18N_RESOLVED_KEY = "i18n:active";

export type I18nContextValue = {
  lang: SupportedLang;
  pref: PreferredLang;
  t: (key: string) => string;
  setPreferredLanguage: (p: PreferredLang) => Promise<void> | void;
};

export const I18nContext = React.createContext<I18nContextValue | undefined>(undefined);

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  return ctx ?? {
    lang: "en",
    pref: "system",
    t: (key: string) => key,
    setPreferredLanguage: () => {},
  };
}
