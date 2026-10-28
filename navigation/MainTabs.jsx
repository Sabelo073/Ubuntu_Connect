
import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

import Home from "../screens/Home";
import Donate from "../screens/Donate";
import Profile from "../screens/Profile";
import MyDonations from "../screens/MyDonations";
import Messages from "../screens/Messages";
import Notifications from "../screens/Notifications";
import RecipientConfirmations from "../screens/RecipientConfirmation";
import MyActivity from "../screens/MyActivity";
import CommunityMatching from "../screens/CommunityMatching";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setUnreadNotificationCount(0);
      setUnreadMessageCount(0);
      return undefined;
    }

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );

    const unsubscribeNotifications = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const unread = snapshot.docs.filter(
          (document) => document.data().read === false
        );

        setUnreadNotificationCount(unread.length);
      },
      (error) => {
        console.log("NOTIFICATION BADGE ERROR:", error.message);
        setUnreadNotificationCount(0);
      }
    );

    const chatsQuery = query(
      collection(db, "chats"),
      where("participantIds", "array-contains", user.uid)
    );

    const unsubscribeChats = onSnapshot(
      chatsQuery,
      (snapshot) => {
        let totalUnreadMessages = 0;

        snapshot.docs.forEach((document) => {
          const chatData = document.data();
          totalUnreadMessages += chatData.unreadCounts?.[user.uid] || 0;
        });

        setUnreadMessageCount(totalUnreadMessages);
      },
      (error) => {
        console.log("MESSAGE BADGE ERROR:", error.message);
        setUnreadMessageCount(0);
      }
    );

    return () => {
      unsubscribeNotifications();
      unsubscribeChats();
    };
  }, []);

  const activityBadgeCount =
    unreadNotificationCount + unreadMessageCount;

  const activityBadgeValue =
    activityBadgeCount > 99 ? "99+" : activityBadgeCount;

  const badgeStyle = {
    backgroundColor: "#EF4444",
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    minWidth: 18,
    height: 18,
    lineHeight: 18,
  };

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
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },

        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Home: "home",
            Donate: "card-giftcard",
            "My Activity": "assignment",
            Profile: "person",
            "Ubuntu Match": "volunteer-activism",
          };

          return (
            <MaterialIcons
              name={icons[route.name] || "circle"}
              size={focused ? 26 : 22}
              color={color}
            />
          );
        },
      })}
    >
      {/* Main visible bottom tabs */}
      <Tab.Screen name="Home" component={Home} />

      <Tab.Screen name="Donate" component={Donate} />

      <Tab.Screen
        name="Ubuntu Match"
        component={CommunityMatching}
      />

      <Tab.Screen
        name="My Activity"
        options={{
          tabBarBadge:
            activityBadgeCount > 0
              ? activityBadgeValue
              : undefined,
          tabBarBadgeStyle: badgeStyle,
        }}
      >
        {(props) => (
          <MyActivity
            {...props}
            unreadMessageCount={unreadMessageCount}
            unreadNotificationCount={unreadNotificationCount}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Profile" component={Profile} />

      {/* Screens accessed from My Activity, not shown as bottom tabs */}
      <Tab.Screen
        name="My Donations"
        component={MyDonations}
        options={{ tabBarButton: () => null }}
      />

      <Tab.Screen
        name="Recipient Confirmations"
        component={RecipientConfirmations}
        options={{ tabBarButton: () => null }}
      />

      <Tab.Screen
        name="Messages"
        component={Messages}
        options={{ tabBarButton: () => null }}
      />

      <Tab.Screen
        name="Notifications"
        component={Notifications}
        options={{ tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
}
