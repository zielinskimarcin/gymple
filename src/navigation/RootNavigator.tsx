import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { DarkTheme, NavigationContainer, type Theme } from "@react-navigation/native";

import { useAuth } from "../auth/AuthProvider";
import { AuthStack } from "../auth/AuthStack";
import { AppNavigator } from "./AppNavigator";
import { OnboardingScreen } from "../onboarding/OnboardingScreen";
import { supabase } from "../lib/supabase";
import { colors } from "../theme";

type ProfileRow = {
  id: string;
  onboarding_done: boolean | null;
};

const NAV_THEME: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

const SignedInGate: React.FC = () => {
  const { session } = useAuth() as any;
  const userId: string | null = session?.user?.id ?? null;

  const [profileLoading, setProfileLoading] = useState(false);
  const [hasProfileCheck, setHasProfileCheck] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!userId) {
        setHasProfileCheck(true);
        setNeedsOnboarding(false);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, onboarding_done")
          .eq("id", userId)
          .maybeSingle<ProfileRow>();

        if (!alive) return;

        if (error) {
          setNeedsOnboarding(false);
        } else {
          if (!data || !data.onboarding_done) {
            setNeedsOnboarding(true);
          } else {
            setNeedsOnboarding(false);
          }
        }
      } catch {
        if (!alive) return;
        setNeedsOnboarding(false);
      } finally {
        if (alive) {
          setProfileLoading(false);
          setHasProfileCheck(true);
        }
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [userId]);

  if (!hasProfileCheck || profileLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (needsOnboarding) {
    return (
      <OnboardingScreen
        onDone={() => {
          setNeedsOnboarding(false);
        }}
      />
    );
  }

  return <AppNavigator />;
};

export const RootNavigator: React.FC = () => {
  const { session, loading } = useAuth() as any;

  if (loading) {
    return (
      <NavigationContainer theme={NAV_THEME}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator />
        </View>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={NAV_THEME}>
      {session ? <SignedInGate /> : <AuthStack />}
    </NavigationContainer>
  );
};
