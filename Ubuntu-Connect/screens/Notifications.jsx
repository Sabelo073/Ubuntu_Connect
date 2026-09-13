import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

const Notifications = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const showError = (title, message) => {
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined"
    ) {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
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
        const notificationList = snapshot.docs.map(
          (document) => ({
            id: document.id,
            ...document.data(),
          })
        );

        setNotifications(notificationList);
        setLoading(false);
      },
      (error) => {
        console.log(
          "NOTIFICATIONS ERROR:",
          error.code,
          error.message
        );

        setLoading(false);

        showError(
          "Notifications Error",
          error.message ||
            "Notifications could not be loaded."
        );
      }
    );

    return () => unsubscribe();
  }, []);

  const unreadCount = notifications.filter(
    (item) => item.read === false
  ).length;

  const markAsRead = async (notification) => {
    if (
      !notification?.id ||
      notification.read === true
    ) {
      return;
    }

    await updateDoc(
      doc(db, "notifications", notification.id),
      {
        read: true,
      }
    );
  };

  const handleNotificationPress = async (
    notification
  ) => {
    try {
      await markAsRead(notification);

      if (notification.type !== "message") {
        return;
      }

      if (!notification.chatId) {
        showError(
          "Chat Unavailable",
          "This notification does not contain a valid conversation."
        );
        return;
      }

      if (!notification.otherUserId) {
        showError(
          "Chat Unavailable",
          "The message sender could not be found."
        );
        return;
      }

      navigation.navigate("Chat", {
        chatId: notification.chatId,
        otherUserId: notification.otherUserId,
        otherUserName:
          notification.otherUserName ||
          notification.senderName ||
          "Ubuntu Connect User",
      });
    } catch (error) {
      console.log(
        "NOTIFICATION PRESS ERROR:",
        error.code,
        error.message
      );

      showError(
        "Notification Error",
        error.message ||
          "The notification could not be opened."
      );
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications =
      notifications.filter(
        (item) => item.read === false
      );

    if (unreadNotifications.length === 0) {
      return;
    }

    try {
      setMarkingAll(true);

      const batch = writeBatch(db);

      unreadNotifications.forEach(
        (notification) => {
          const notificationReference = doc(
            db,
            "notifications",
            notification.id
          );

          batch.update(notificationReference, {
            read: true,
          });
        }
      );

      await batch.commit();
    } catch (error) {
      console.log(
        "MARK ALL READ ERROR:",
        error.code,
        error.message
      );

      showError(
        "Notification Error",
        error.message ||
          "Notifications could not be updated."
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "donation":
        return "🎁";

      case "request":
        return "🙏";

      case "campaign":
        return "📢";

      case "message":
        return "💬";

      case "account":
        return "👤";

      default:
        return "🔔";
    }
  };

  const getIconBackground = (type) => {
    switch (type) {
      case "donation":
        return "#DCFCE7";

      case "request":
        return "#DBEAFE";

      case "campaign":
        return "#FEF3C7";

      case "message":
        return "#F3E8FF";

      case "account":
        return "#E2E8F0";

      default:
        return "#EFF6FF";
    }
  };

  const formatNotificationTime = (createdAt) => {
    if (!createdAt) {
      return "Recently";
    }

    const date =
      typeof createdAt.toDate === "function"
        ? createdAt.toDate()
        : new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return "Recently";
    }

    const now = new Date();

    const difference =
      now.getTime() - date.getTime();

    const minutes = Math.floor(
      difference / 60000
    );

    const hours = Math.floor(
      difference / 3600000
    );

    const days = Math.floor(
      difference / 86400000
    );

    if (minutes < 1) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes} min ago`;
    }

    if (hours < 24) {
      return `${hours} ${
        hours === 1 ? "hour" : "hours"
      } ago`;
    }

    if (days < 7) {
      return `${days} ${
        days === 1 ? "day" : "days"
      } ago`;
    }

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Loading notifications...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.heading}>
              Notifications
            </Text>

            <Text style={styles.headerSubtitle}>
              {unreadCount > 0
                ? `${unreadCount} unread ${
                    unreadCount === 1
                      ? "notification"
                      : "notifications"
                  }`
                : "You're all caught up"}
            </Text>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              style={[
                styles.markAllButton,
                markingAll &&
                  styles.disabledButton,
              ]}
              onPress={markAllAsRead}
              disabled={markingAll}
            >
              <Text style={styles.markAll}>
                {markingAll
                  ? "Updating..."
                  : "Mark all read"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View
              style={styles.emptyIconContainer}
            >
              <Text style={styles.emptyIcon}>
                🔔
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              No Notifications Yet
            </Text>

            <Text style={styles.emptyText}>
              Updates about your donations, help
              requests, messages, and account activity
              will appear here.
            </Text>
          </View>
        ) : (
          notifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              style={[
                styles.notificationCard,
                item.read === false &&
                  styles.unreadCard,
              ]}
              onPress={() =>
                handleNotificationPress(item)
              }
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor:
                      getIconBackground(item.type),
                  },
                ]}
              >
                <Text style={styles.icon}>
                  {getIcon(item.type)}
                </Text>
              </View>

              <View style={styles.content}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.title,
                      item.read === false &&
                        styles.unreadTitle,
                    ]}
                  >
                    {item.title ||
                      "Ubuntu Connect Update"}
                  </Text>

                  {item.read === false && (
                    <View
                      style={styles.unreadDot}
                    />
                  )}
                </View>

                <Text style={styles.message}>
                  {item.message ||
                    "You have a new update."}
                </Text>

                <View
                  style={styles.notificationFooter}
                >
                  <Text style={styles.time}>
                    {formatNotificationTime(
                      item.createdAt
                    )}
                  </Text>

                  {item.type === "message" ? (
                    <Text
                      style={styles.openChatText}
                    >
                      Open conversation ›
                    </Text>
                  ) : (
                    <Text
                      style={[
                        styles.readStatus,
                        item.read === false &&
                          styles.unreadStatus,
                      ]}
                    >
                      {item.read === false
                        ? "Unread"
                        : "Read"}
                    </Text>
                  )}
                </View>
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

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 14,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 25,
  },

  headerTextContainer: {
    flex: 1,
    marginRight: 10,
  },

  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
  },

  headerSubtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 5,
  },

  markAllButton: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  disabledButton: {
    opacity: 0.6,
  },

  markAll: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 12,
  },

  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  unreadCard: {
    backgroundColor: "#F8FFFB",
    borderLeftWidth: 4,
    borderLeftColor: "#22C55E",
  },

  iconContainer: {
    width: 55,
    height: 55,
    borderRadius: 16,
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
    fontWeight: "600",
    color: "#334155",
    flex: 1,
    marginRight: 8,
  },

  unreadTitle: {
    color: "#1E293B",
    fontWeight: "800",
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },

  message: {
    color: "#64748B",
    marginTop: 6,
    lineHeight: 20,
  },

  notificationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },

  time: {
    color: "#94A3B8",
    fontSize: 12,
  },

  readStatus: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },

  openChatText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "700",
  },

  unreadStatus: {
    color: "#16A34A",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    marginTop: 90,
  },

  emptyIconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  emptyIcon: {
    fontSize: 55,
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