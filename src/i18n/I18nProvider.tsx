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

import en from "./locales/en.json";
import pl from "./locales/pl.json";
import it from "./locales/it.json";

const SUPPORTED_LANGS: SupportedLang[] = ["en", "pl", "it"];

const isValidSupported = (val: string | null): val is SupportedLang =>
  val !== null && SUPPORTED_LANGS.includes(val as SupportedLang);

const isValidPreferred = (val: string | null): val is PreferredLang =>
  isValidSupported(val) || val === "system";

const DICTS: Record<SupportedLang, Dict> = { en, pl, it };

type Props = { children: React.ReactNode };

function resolveLanguage(pref: PreferredLang): SupportedLang {
  if (pref !== "system") return pref;
  return mapSystemToSupported(Localization.getLocales?.()[0]?.languageCode ?? undefined);
}

export const I18nProvider: React.FC<Props> = ({ children }) => {
  const [pref, setPref] = useState<PreferredLang>("system");
  const [lang, setLang] = useState<SupportedLang>("en");

  useEffect(() => {
    let active = true;

    async function loadLanguage() {
      let nextPref: PreferredLang = "system";

      try {
        const cachedPref = await AsyncStorage.getItem(I18N_PREF_KEY);
        if (isValidPreferred(cachedPref)) {
          nextPref = cachedPref;
        }
      } catch {}

      try {
        const { data: usr } = await supabase.auth.getUser();
        const uid = usr.user?.id;

        if (uid) {
          const { data } = await supabase
            .from("profiles")
            .select("ui_language")
            .eq("id", uid)
            .maybeSingle<{ ui_language: PreferredLang | null }>();

          if (isValidPreferred(data?.ui_language ?? null)) {
            nextPref = data!.ui_language!;
          }
        }
      } catch {}

      const resolved = resolveLanguage(nextPref);
      if (!active) return;

      setPref(nextPref);
      setLang(resolved);

      try {
        await AsyncStorage.multiSet([
          [I18N_PREF_KEY, nextPref],
          [I18N_RESOLVED_KEY, resolved],
        ]);
      } catch {}
    }

    loadLanguage();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        loadLanguage();
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cachedResolved = await AsyncStorage.getItem(I18N_RESOLVED_KEY);
        if (isValidSupported(cachedResolved)) {
          setLang(cachedResolved);
        }
      } catch {}
    })();
  }, []);

  const t = useCallback(
    (key: string) => getFromDict(DICTS[lang], key) ?? getFromDict(DICTS.en, key) ?? key,
    [lang]
  );

  const setPreferredLanguage = useCallback(async (next: PreferredLang) => {
    setPref(next);

    const resolved = resolveLanguage(next);
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
          .update({ ui_language: next })
          .eq("id", uid);
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
