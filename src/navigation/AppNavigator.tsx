// src/navigation/AppNavigator.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme";

import { RootTabs } from "./RootTabs";
import { WorkoutDetailScreen } from "../screens/WorkoutDetailScreen";
import { AddExerciseModal } from "../screens/AddExerciseModal";
import { SearchExerciseModal } from "../screens/SearchExerciseModal";
import { EditCustomExerciseModal } from "../screens/EditCustomExerciseModal";
import { TemplateEditorModal } from "../screens/TemplateEditorModal";

import { SignInScreen, SignUpScreen } from "../auth/AuthScreens";
import { useAuth } from "../auth/AuthProvider";

import { ProfileScreen } from "../screens/ProfileScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

export type RootStackParamList = {
  // Auth
  SignIn: undefined;
  SignUp: undefined;

  // App
  Tabs: undefined;
  WorkoutDetail: { workoutId?: string; preview?: any; mode?: "preview" | "saved" };
  AddExercise: undefined;
  SearchExercise: undefined;
  EditCustomExercise: { id: string };
  TemplateEditor: { id?: string } | undefined;
  Profile: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ color: colors.text, marginTop: 8 }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    // AUTH STACK
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
      </Stack.Navigator>
    );
  }

  // APP STACK
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={RootTabs} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      <Stack.Screen name="AddExercise" component={AddExerciseModal} options={{ presentation: "modal" }} />
      <Stack.Screen name="SearchExercise" component={SearchExerciseModal} options={{ presentation: "modal" }} />
      <Stack.Screen name="EditCustomExercise" component={EditCustomExerciseModal} options={{ presentation: "modal" }} />
      <Stack.Screen name="TemplateEditor" component={TemplateEditorModal} options={{ presentation: "modal" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ presentation: "modal" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ presentation: "modal" }} />
    </Stack.Navigator>
  );
};