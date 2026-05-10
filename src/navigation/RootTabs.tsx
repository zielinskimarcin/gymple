import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Animated, Easing } from "react-native";
import { TrainScreen } from "../screens/TrainScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { ExercisesScreen } from "../screens/ExercisesScreen";
import { colors } from "../theme";
import { Ionicons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();
const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  History: "time-outline",
  Train: "barbell-outline",
  Exercises: "list-outline",
};

const TabIcon = ({
  name,
  color,
  size,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  focused: boolean;
}) => {
  const progress = React.useRef(new Animated.Value(focused ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: 130,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [focused, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }),
        transform: [
          {
            scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }),
          },
        ],
      }}
    >
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
};

export const RootTabs = () => (
  <Tab.Navigator
    initialRouteName="Train"
    detachInactiveScreens={false}
    screenOptions={({ route }) => ({
      headerShown: false,
      lazy: false,
      animation: "none",
      freezeOnBlur: false,
      sceneStyle: { backgroundColor: colors.bg },
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: "#8A8F98",
      tabBarIcon: ({ color, size, focused }) => (
        <TabIcon name={TAB_ICONS[route.name]} size={size} color={color} focused={focused} />
      ),
    })}
  >
    <Tab.Screen name="History" component={HistoryScreen} />
    <Tab.Screen name="Train" component={TrainScreen} />
    <Tab.Screen name="Exercises" component={ExercisesScreen} />
  </Tab.Navigator>
);
