import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SignInScreen, SignUpScreen } from "./AuthScreens";

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

type Props = {
  initialRouteName?: keyof AuthStackParamList;
};

export const AuthStack: React.FC<Props> = ({ initialRouteName = "SignUp" }) => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRouteName}
    >
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
};
