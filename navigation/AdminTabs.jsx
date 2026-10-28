
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";

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
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#777777",

        tabBarStyle: {
          height: 65,
          paddingTop: 7,
          paddingBottom: 7,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },

        tabBarIcon: ({ color, size }) => (
          <MaterialIcons
            name={tabIcons[route.name]}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboard}
      />

      <Tab.Screen
        name="Campaigns"
        component={Campaigns}
      />

      <Tab.Screen
        name="Charities"
        component={Charities}
      />

      <Tab.Screen
        name="Reports"
        component={AdminReports}
      />

      <Tab.Screen
        name="Audit Log"
        component={AuditLog}
      />
    </Tab.Navigator>
  );
}
