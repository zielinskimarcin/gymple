// src/i18n/I18nProvider.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { supabase } from "../lib/supabase";
import {
  I18nContext,
  SupportedLang,
  PreferredLang,
  Dict,
  getFromDict,
  mapSystemToSupported,
  I18N_PREF_KEY,
  I18N_RESOLVED_KEY,
} from "./context";

// nasze tłumaczenia
import en from "./locales/en.json";
import pl from "./locales/pl.json";
import it from "./locales/it.json";

const DICTS: Record<SupportedLang, Dict> = { en, pl, it };

type Props = { children: React.ReactNode };

export const I18nProvider: React.FC<Props> = ({ children }) => {
  const [pref, setPref] = useState<PreferredLang>("system");
  const [lang, setLang] = useState<SupportedLang>("en");

  // 🔹 szybki start – odczytaj cache, by uniknąć flasha
  useEffect(() => {
    (async () => {
      try {
        const [p, r] = await Promise.all([
          AsyncStorage.getItem(I18N_PREF_KEY),
          AsyncStorage.getItem(I18N_RESOLVED_KEY),
        ]);
        if (p === "system" || p === "en" || p === "pl") setPref(p);
        if (r === "en" || r === "pl") setLang(r);
      } catch {}
    })();
  }, []);

  // 🔹 pełna inicjalizacja – Supabase + system fallback
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: usr } = await supabase.auth.getUser();
        const uid = usr.user?.id;
        let prefDb: PreferredLang = "system";

        if (uid) {
          const { data } = await supabase
            .from("profiles")
            .select("ui_language")
            .eq("id", uid)
            .maybeSingle<{ ui_language: PreferredLang | null }>();
          if (data?.ui_language) prefDb = data.ui_language;
        }

        const finalPref = prefDb || pref;
        const resolved =
          finalPref === "system"
            ? mapSystemToSupported(Localization.getLocales?.()[0]?.languageCode)
            : (finalPref as SupportedLang);

        if (active) {
          setPref(finalPref);
          setLang(resolved);
        }

        await AsyncStorage.multiSet([
          [I18N_PREF_KEY, finalPref],
          [I18N_RESOLVED_KEY, resolved],
        ]);
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, []);

  const t = useCallback(
    (key: string) => getFromDict(DICTS[lang], key) ?? key,
    [lang]
  );

  const setPreferredLanguage = useCallback(async (next: PreferredLang) => {
    setPref(next);
    const resolved =
      next === "system"
        ? mapSystemToSupported(Localization.getLocales?.()[0]?.languageCode)
        : (next as SupportedLang);
    setLang(resolved);

    await AsyncStorage.multiSet([
      [I18N_PREF_KEY, next],
      [I18N_RESOLVED_KEY, resolved],
    ]);

    try {
      const { data: usr } = await supabase.auth.getUser();
      const uid = usr.user?.id;
      if (uid) {
        await supabase
          .from("profiles")
          .upsert({ id: uid, ui_language: next }, { onConflict: "id" });
      }
    } catch {}
  }, []);

  const value = useMemo(
    () => ({ lang, pref, t, setPreferredLanguage }),
    [lang, pref, t, setPreferredLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export default I18nProvider;