import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      return;
    }

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notificationList = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setNotifications(notificationList);
      },
      (error) => {
        console.log("NOTIFICATIONS ERROR:", error.message);
      }
    );

    return () => unsubscribe();
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      });
    } catch (error) {
      Alert.alert("Notification Error", error.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(
        (item) => item.read === false
      );

      for (const item of unreadNotifications) {
        await updateDoc(doc(db, "notifications", item.id), {
          read: true,
        });
      }
    } catch (error) {
      Alert.alert("Notification Error", error.message);
    }
  };

  const getIcon = (type) => {
    if (type === "donation") {
      return "🎁";
    }

    if (type === "request") {
      return "🙏";
    }

    return "🔔";
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.heading}>Notifications</Text>

          {notifications.length > 0 && (
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markAll}>Mark All Read</Text>
            </TouchableOpacity>
          )}
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>

            <Text style={styles.emptyTitle}>
              No Notifications Yet
            </Text>

            <Text style={styles.emptyText}>
              Updates about your donations, requests, and account activity will appear here.
            </Text>
          </View>
        ) : (
          notifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.notificationCard,
                item.read === false && styles.unreadCard,
              ]}
              onPress={() => markAsRead(item.id)}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>
                  {getIcon(item.type)}
                </Text>
              </View>

              <View style={styles.content}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>
                    {item.title}
                  </Text>

                  {item.read === false && (
                    <View style={styles.unreadDot} />
                  )}
                </View>

                <Text style={styles.message}>
                  {item.message}
                </Text>

                <Text style={styles.time}>
                  {item.createdAt?.toDate
                    ? item.createdAt.toDate().toLocaleString()
                    : "Recently"}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 100 }} />

      </ScrollView>
    </SafeAreaView>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 25,
  },

  heading: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
  },

  markAll: {
    color: "#2563EB",
    fontWeight: "600",
  },

  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#22C55E",
  },

  iconContainer: {
    width: 55,
    height: 55,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },

  icon: {
    fontSize: 24,
  },

  content: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
    marginRight: 8,
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },

  message: {
    color: "#64748B",
    marginTop: 5,
    lineHeight: 20,
  },

  time: {
    marginTop: 8,
    color: "#94A3B8",
    fontSize: 12,
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    marginTop: 100,
  },

  emptyIcon: {
    fontSize: 70,
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
  },

  emptyText: {
    color: "#64748B",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 24,
  },
});