import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

import Home from "../screens/Home";
import Donate from "../screens/Donate";
import Messages from "../screens/Messages";
import Notifications from "../screens/Notifications";
import Profile from "../screens/Profile";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setUnreadCount(0);
      return;
    }

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const unreadNotifications = snapshot.docs.filter(
          (document) => document.data().read === false
        );

        setUnreadCount(unreadNotifications.length);
      },
      (error) => {
        console.log(
          "NOTIFICATION BADGE ERROR:",
          error.message
        );

        setUnreadCount(0);
      }
    );

    return () => unsubscribe();
  }, []);

  const badgeValue =
    unreadCount > 99 ? "99+" : unreadCount;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#94A3B8",

        tabBarHideOnKeyboard: true,

        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: "#000000",
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },

        tabBarIcon: ({ focused }) => {
          let emoji = "❔";

          if (route.name === "Home") {
            emoji = "🏠";
          } else if (route.name === "Donate") {
            emoji = "🎁";
          } else if (route.name === "Messages") {
            emoji = "💬";
          } else if (route.name === "Notifications") {
            emoji = "🔔";
          } else if (route.name === "Profile") {
            emoji = "👤";
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
      <Tab.Screen
        name="Home"
        component={Home}
      />

      <Tab.Screen
        name="Donate"
        component={Donate}
      />

      <Tab.Screen
        name="Messages"
        component={Messages}
      />

      <Tab.Screen
        name="Notifications"
        component={Notifications}
        options={{
          tabBarBadge:
            unreadCount > 0 ? badgeValue : undefined,

          tabBarBadgeStyle: {
            backgroundColor: "#EF4444",
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: "800",
            minWidth: 18,
            height: 18,
            lineHeight: 18,
          },
        }}
      />

      <Tab.Screen
        name="Profile"
        component={Profile}
      />
    </Tab.Navigator>
  );
}