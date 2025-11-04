import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootTabs } from "./RootTabs";
import { WorkoutDetailScreen } from "../screens/WorkoutDetailScreen";
import { AddExerciseModal } from "../screens/AddExerciseModal";
import { SearchExerciseModal } from "../screens/SearchExerciseModal";
import { EditCustomExerciseModal } from "../screens/EditCustomExerciseModal";
import { TemplateEditor } from "../screens/TemplateEditor";
import { SettingsScreen } from "../screens/SettingsScreen";
import { AccountScreen } from "../screens/AccountScreen";

export type RootStackParamList = {
  Tabs: undefined;
  WorkoutDetail: { workoutId?: string; preview?: any; mode?: "preview" | "saved" };
  AddExercise: undefined;
  SearchExercise: undefined;
  EditCustomExercise: { id: string };
  TemplateEditor: { id?: string };
  Settings: undefined;
  Account: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={RootTabs} />
    <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
    <Stack.Screen name="AddExercise" component={AddExerciseModal} options={{ presentation: "modal" }} />
    <Stack.Screen name="SearchExercise" component={SearchExerciseModal} options={{ presentation: "modal" }} />
    <Stack.Screen name="EditCustomExercise" component={EditCustomExerciseModal} options={{ presentation: "modal" }} />
    <Stack.Screen name="TemplateEditor" component={TemplateEditor} options={{ presentation: "modal" }} />
    {/* NEW */}
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ presentation: "modal" }} />
    <Stack.Screen name="Account" component={AccountScreen} options={{ presentation: "modal" }} />
  </Stack.Navigator>
);