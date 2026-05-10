import React, { useEffect } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "./src/auth/AuthProvider";
import { PremiumProvider } from "./src/premium/PremiumProvider";
import { I18nProvider } from "./src/i18n";
import { colors } from "./src/theme";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { configureRevenueCat } from "./src/premium/revenuecat";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  useEffect(() => {
    configureRevenueCat();
  }, []);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

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
