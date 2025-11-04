import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme, Theme } from "@react-navigation/native";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { colors } from "./src/theme";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { AuthStack } from "./src/auth/AuthStack";

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

function Root() {
  const { session, loading } = useAuth();

  // (Optional) simple splash while checking session
  if (loading) {
    return (
      <>
        <StatusBar style="light" />
      </>
    );
  }

  if (!session) {
    // Logged out → show auth flow (SignIn/SignUp)
    return (
      <>
        <StatusBar style="light" />
        <NavigationContainer theme={appTheme}>
          <AuthStack />
        </NavigationContainer>
      </>
    );
  }

  // Logged in → show main app
  return (
    <NavigationContainer theme={appTheme}>
      <StatusBar style="light" />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}