import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import Home from "../screens/Home";
import Donate from "../screens/Donate";
import Messages from "../screens/Messages";
import Notifications from "../screens/Notifications";
import Profile from "../screens/Profile";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#94A3B8",

        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          elevation: 10,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },

        tabBarIcon: ({ focused }) => {
          let emoji;

          if (route.name === "Home") {
            emoji = "🏠";
          } else if (route.name === "Donate") {
            emoji = "🎁";
          } else if (route.name === "Messages") {
            emoji = "💬";
          } else if (route.name === "Notifications") {
            emoji = "🔔";
          }

          return (
            <Text
              style={{
                fontSize: focused ? 26 : 22,
              }}
            >
              {emoji}
            </Text>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Donate" component={Donate} />
      <Tab.Screen name="Messages" component={Messages} />
      <Tab.Screen name="Notifications" component={Notifications} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}