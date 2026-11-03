import React from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";


function ActivityCard({ title, description, icon, onPress, badge }) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.iconBox}>
        <MaterialIcons name={icon} size={25} color="#2563EB" />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      {badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
      <MaterialIcons name="chevron-right" size={24} color="#94A3B8" />
    </TouchableOpacity>
  );
}

export default function MyActivity({
  navigation,
  unreadMessageCount = 0,
  unreadNotificationCount = 0,
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.GoBack();
            } else {
              navigation.navigate("MainTabs");
            }
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "bold" }}>
          </Text>
        </TouchableOpacity>
        <Text style={styles.heading}>My Activity</Text>
        <Text style={styles.subtitle}>
          Track your donations, confirmations, and conversations.
        </Text>

        <ActivityCard
          title="My Donations"
          description="View donation status, progress, and history."
          icon="inventory-2"
          onPress={() => navigation.navigate("My Donations")}
        />

        <ActivityCard
          title="Recipient Confirmations"
          description="Confirm donations that have been delivered to you."
          icon="fact-check"
          onPress={() => navigation.navigate("Recipient Confirmations")}
        />

        <ActivityCard
          title="Messages"
          description="Open your conversations with other users."
          icon="chat"
          badge={unreadMessageCount}
          onPress={() => navigation.navigate("Messages")}
        />

        <ActivityCard
          title="Notifications"
          description="Review donation updates and other alerts."
          icon="notifications"
          badge={unreadNotificationCount}
          onPress={() => navigation.navigate("Notifications")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 20,
    paddingBottom: 35,
  },
  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: "#64748B",
    marginTop: 6,
    marginBottom: 22,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 12,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
    marginTop: 4,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    marginRight: 7,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
});
