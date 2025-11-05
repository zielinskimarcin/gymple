// App.tsx
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme, Theme } from "@react-navigation/native";

import { AppNavigator } from "./src/navigation/AppNavigator";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { AuthStack } from "./src/auth/AuthStack";
import { OnboardingNavigator } from "./src/onboarding/OnboardingNavigator";

import { colors } from "./src/theme";
import { isAfterSignupNeeded, onboardingEvents } from "./src/storage/onboarding";

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
  const { session, loading } = useAuth();
  const [afterSignup, setAfterSignup] = useState<boolean | null>(null);

  // Wczytaj flagę „po rejestracji pokaż Onboarding” po zmianie usera
  useEffect(() => {
    let alive = true;
    (async () => {
      const need = await isAfterSignupNeeded();
      if (alive) setAfterSignup(need);
    })();
    return () => {
      alive = false;
    };
  }, [session?.user?.id]);

  // Gdy Onboarding zakończy się (markOnboardingDone → emit), zgaś flagę
  useEffect(() => {
    const sub = onboardingEvents.addListener("doneChanged", (done) => {
      if (done) setAfterSignup(false);
    });
    return () => sub.remove();
  }, []);

  // Dopóki ładujemy sesję / nie wiemy o afterSignup
  if (loading || afterSignup === null) {
    return <StatusBar style="light" />;
  }

  return (
    <NavigationContainer theme={appTheme}>
      <StatusBar style="light" />
      {session ? (
        // świeża rejestracja → Onboarding
        afterSignup ? (
          <OnboardingNavigator />
        ) : (
          // zalogowany normalnie → appka
          <AppNavigator />
        )
      ) : (
        // niezalogowany → Auth (SignUp pierwszy)
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