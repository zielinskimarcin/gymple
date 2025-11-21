import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme, Theme } from "@react-navigation/native";

import { AppNavigator } from "./src/navigation/AppNavigator";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { AuthStack } from "./src/auth/AuthStack";
import { OnboardingNavigator } from "./src/onboarding/OnboardingNavigator";

import { colors } from "./src/theme";

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

function GuardedRoot() {
  const { session, loading, needsOnboarding } = useAuth();

  // Minimal loading guard (no extra side-effects)
  if (loading) {
    return <StatusBar style="light" />;
  }

  return (
    <NavigationContainer theme={appTheme}>
      <StatusBar style="light" />
      {session ? (
        needsOnboarding ? <OnboardingNavigator /> : <AppNavigator />
      ) : (
        <AuthStack initialRouteName="SignUp" />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GuardedRoot />
    </AuthProvider>
  );
}