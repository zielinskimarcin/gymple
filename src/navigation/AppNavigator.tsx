import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootTabs } from "./RootTabs";
import { WorkoutDetailScreen } from "../screens/WorkoutDetailScreen";
import { AddExerciseModal } from "../screens/AddExerciseModal";
import { SearchExerciseModal } from "../screens/SearchExerciseModal";
import { EditCustomExerciseModal } from "../screens/EditCustomExerciseModal";

export type RootStackParamList = {
  Tabs: undefined;
  WorkoutDetail: { workoutId?: string; preview?: any; mode?: "preview" | "saved" };
  AddExercise: undefined;
  SearchExercise: undefined;
  EditCustomExercise: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={RootTabs} />
    <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
    <Stack.Screen name="AddExercise" component={AddExerciseModal} options={{ presentation: "modal" }} />
    <Stack.Screen name="SearchExercise" component={SearchExerciseModal} options={{ presentation: "modal" }} />
    <Stack.Screen name="EditCustomExercise" component={EditCustomExerciseModal} options={{ presentation: "modal" }} />
  </Stack.Navigator>
);
