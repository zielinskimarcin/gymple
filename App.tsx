// App.tsx
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme, Theme } from "@react-navigation/native";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { colors } from "./src/theme";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { AuthStack } from "./src/auth/AuthStack";

import { OnboardingNavigator } from "./src/onboarding/OnboardingNavigator";
import { isOnboardingDone } from "./src/storage/onboarding";
import { onboardingEvents } from "./src/storage/onboarding";

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
  const [onbDone, setOnbDone] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => setOnbDone(await isOnboardingDone()))();
    const handler = (done: boolean) => setOnbDone(done);
    onboardingEvents.addListener("doneChanged", handler);
    return () => onboardingEvents.removeListener("doneChanged", handler);
  }, []);

  if (loading || onbDone === null) {
    return <StatusBar style="light" />;
  }

  return (
    <NavigationContainer theme={appTheme}>
      <StatusBar style="light" />
      {!onbDone ? (
        <OnboardingNavigator />
      ) : !session ? (
        // ⬇️ po onboardingu od razu SignUp
        <AuthStack initialRouteName="SignUp" />
      ) : (
        <AppNavigator />
      )}
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