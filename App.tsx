import React, { useEffect, useState, useCallback } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "./src/auth/AuthProvider";
import { PremiumProvider } from "./src/premium/PremiumProvider";
import { I18nProvider } from "./src/i18n";
import { colors } from "./src/theme";
import { AppSplash } from "./src/splash/AppSplash";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { configureRevenueCat } from "./src/premium/revenuecat";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const MIN_SPLASH_MS = 2200;
  const [animDone, setAnimDone] = useState(false);
  const [minTimeDone, setMinTimeDone] = useState(false);
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    configureRevenueCat();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setNavReady(true);
  }, []);

  useEffect(() => {
    if (animDone && minTimeDone && navReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [animDone, minTimeDone, navReady]);

  const handleSplashAnimComplete = useCallback(() => setAnimDone(true), []);

  if (!(animDone && minTimeDone)) {
    return <AppSplash durationMs={MIN_SPLASH_MS} onComplete={handleSplashAnimComplete} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <I18nProvider>
          <AuthProvider>
            <PremiumProvider freeLimit={5}>
              <StatusBar style="light" />
              <RootNavigator />
            </PremiumProvider>
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </View>
  );
}
