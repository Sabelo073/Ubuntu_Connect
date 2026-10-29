import React from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AdminDashboard from "../screens/AdminDashboard";
import AdminReports from "../screens/AdminReports";
import AuditLog from "../screens/AuditLog";
import Campaigns from "../screens/Campaigns";
import Charities from "../screens/Charities";

const Tab = createBottomTabNavigator();

const tabIcons = {
  Dashboard: "dashboard",
  Campaigns: "campaign",
  Charities: "volunteer-activism",
  Reports: "assessment",
  "Audit Log": "history",
};

export default function AdminTabs() {
  // Space taken by the phone's system navigation (gesture bar / 3-button nav).
  // On Android some devices report 0 even when the system buttons overlap
  // the app, so keep a safe minimum there.
  const insets = useSafeAreaInsets();
  const bottomInset =
    Platform.OS === "android"
      ? Math.max(insets.bottom, 24)
      : Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#777777",

        tabBarStyle: {
          height: 58 + bottomInset,
          paddingTop: 7,
          paddingBottom: bottomInset,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
          borderTopWidth: 0.5,
        },

        tabBarItemStyle: {
          flex: 1,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },

        tabBarIcon: ({ color, size }) => (
          <MaterialIcons
            name={tabIcons[route.name] || "circle"}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboard} />

      <Tab.Screen name="Campaigns" component={Campaigns} />

      <Tab.Screen name="Charities" component={Charities} />

      <Tab.Screen name="Reports" component={AdminReports} />

      <Tab.Screen name="Audit Log" component={AuditLog} />
    </Tab.Navigator>
  );
}
