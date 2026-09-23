import React from "react";

import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";

import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

import Splash from "../screens/Splash";
import LogIn from "../screens/LogIn";
import Register from "../screens/Register";

import Donate from "../screens/Donate";
import RequestHelp from "../screens/RequestHelp";
import Charities from "../screens/Charities";
import Campaigns from "../screens/Campaigns";
import Messages from "../screens/Messages";
import Notifications from "../screens/Notifications";

import AdminDashboard from "../screens/AdminDashboard";
import MainTabs from "./MainTabs";
import Chat from "../screens/Chat";

import CreateCampaign from "../screens/CreateCampaign";
import UpdateCampaign from "../screens/UpdateCampaign";
import CreateCharity from "../screens/CreateCharity";

import MyActivity from "../screens/MyActivity";
import EditProfile from "../screens/EditProfile";
import DeleteAccount from "../screens/DeleteAccount";
import AuditLog from "../screens/AuditLog";

import {
  SessionProvider,
  useSession,
} from "../context/SessionContext";

const Stack = createNativeStackNavigator();

export const navigationRef =
  createNavigationContainerRef();

function NavigationContent() {
  const { recordActivity } =
    useSession();

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={recordActivity}
      onReady={recordActivity}
    >
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Splash"
          component={Splash}
        />

        <Stack.Screen
          name="Login"
          component={LogIn}
        />

        <Stack.Screen
          name="Register"
          component={Register}
        />

        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
        />

        <Stack.Screen
          name="Chat"
          component={Chat}
          options={{
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="Donate"
          component={Donate}
        />

        <Stack.Screen
          name="RequestHelp"
          component={RequestHelp}
        />

        <Stack.Screen
          name="Charities"
          component={Charities}
        />

        <Stack.Screen
          name="Campaigns"
          component={Campaigns}
        />

        <Stack.Screen
          name="Messages"
          component={Messages}
        />

        <Stack.Screen
          name="Notifications"
          component={Notifications}
        />

        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboard}
        />

        <Stack.Screen
          name="AuditLog"
          component={AuditLog}
        />

        <Stack.Screen
          name="CreateCampaign"
          component={CreateCampaign}
        />

        <Stack.Screen
          name="UpdateCampaign"
          component={UpdateCampaign}
        />

        <Stack.Screen
          name="CreateCharity"
          component={CreateCharity}
        />

        <Stack.Screen
          name="MyActivity"
          component={MyActivity}
        />

        <Stack.Screen
          name="EditProfile"
          component={EditProfile}
        />

        <Stack.Screen
          name="DeleteAccount"
          component={DeleteAccount}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function AppNavigator() {
  return (
    <SessionProvider
      navigationRef={navigationRef}
    >
      <NavigationContent />
    </SessionProvider>
  );
}