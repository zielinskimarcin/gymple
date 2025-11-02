import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { TrainScreen } from "../screens/TrainScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { ExercisesScreen } from "../screens/ExercisesScreen";
import { colors } from "../theme";
import { Ionicons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();

export const RootTabs = () => (
  <Tab.Navigator
    initialRouteName="Train"
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: "#8A8F98",
      tabBarIcon: ({ color, size }) => {
        const map: Record<string, keyof typeof Ionicons.glyphMap> = {
          History: "time-outline",
          Train: "barbell-outline",
          Exercises: "list-outline",
        };
        return <Ionicons name={map[route.name]} size={size} color={color} />;
      },
    })}
  >
    {/* KOLEJNOŚĆ => Train w środku */}
    <Tab.Screen name="History" component={HistoryScreen} />
    <Tab.Screen name="Train" component={TrainScreen} />
    <Tab.Screen name="Exercises" component={ExercisesScreen} />
  </Tab.Navigator>
);
