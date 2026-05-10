// App.tsx
import React, { useEffect, useState, useCallback } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme, Theme } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppNavigator } from "./src/navigation/AppNavigator";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { AuthStack } from "./src/auth/AuthStack";
import { AppSplash } from "./src/splash/AppSplash";
import { colors } from "./src/theme";
import { PremiumProvider } from "./src/premium/PremiumProvider";
import { I18nProvider } from "./src/i18n"; // 🆕 nowy provider

SplashScreen.preventAutoHideAsync().catch(() => {});

const appTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
    notification: colors.accent,
  },
};

function GuardedRoot({ onReady }: { onReady: () => void }) {
  const { session, loading } = useAuth();
  if (loading) return null;

  return (
    <NavigationContainer theme={appTheme} onReady={onReady}>
      <StatusBar style="light" />
      {session ? <AppNavigator /> : <AuthStack initialRouteName="SignUp" />}
    </NavigationContainer>
  );
}

export default function App() {
  const MIN_SPLASH_MS = 2200;
  const [animDone, setAnimDone] = useState(false);
  const [minTimeDone, setMinTimeDone] = useState(false);
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (animDone && minTimeDone && navReady) SplashScreen.hideAsync().catch(() => {});
  }, [animDone, minTimeDone, navReady]);

  const handleSplashAnimComplete = useCallback(() => setAnimDone(true), []);
  const handleNavReady = useCallback(() => setNavReady(true), []);

  if (!(animDone && minTimeDone)) {
    return <AppSplash durationMs={MIN_SPLASH_MS} onComplete={handleSplashAnimComplete} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <I18nProvider>
          <AuthProvider>
            <PremiumProvider freeLimit={5}>
              <GuardedRoot onReady={handleNavReady} />
            </PremiumProvider>
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </View>
  );
}