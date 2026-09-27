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

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { auth, db } from "../firebaseConfig";

const Notifications = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  /*
    ----------------------------------------------------
    ERROR HANDLER
    ----------------------------------------------------
  */

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

  /*
    ----------------------------------------------------
    LOAD NOTIFICATIONS
    ----------------------------------------------------
  */

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

  /*
    ----------------------------------------------------
    UNREAD COUNT
    ----------------------------------------------------
  */

  const unreadCount = notifications.filter(
    (item) => item.read === false
  ).length;

  /*
    ----------------------------------------------------
    MARK ONE AS READ
    ----------------------------------------------------
  */

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

  /*
    ----------------------------------------------------
    OPEN NOTIFICATION
    ----------------------------------------------------
  */

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

  /*
    ----------------------------------------------------
    MARK ALL AS READ
    ----------------------------------------------------
  */

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

  /*
    ----------------------------------------------------
    NOTIFICATION ICONS
    ----------------------------------------------------
  */

  const getIcon = (type) => {
    switch (type) {
      case "donation":
        return "card-giftcard";

      case "request":
        return "volunteer-activism";

      case "campaign":
        return "campaign";

      case "message":
        return "chat";

      case "account":
        return "person";

      default:
        return "notifications";
    }
  };

  /*
    ----------------------------------------------------
    ICON BACKGROUNDS
    ----------------------------------------------------
  */

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

  /*
    ----------------------------------------------------
    ICON COLOURS
    ----------------------------------------------------
  */

  const getIconColor = (type) => {
    switch (type) {
      case "donation":
        return "#16A34A";

      case "request":
        return "#2563EB";

      case "campaign":
        return "#D97706";

      case "message":
        return "#7C3AED";

      case "account":
        return "#64748B";

      default:
        return "#2563EB";
    }
  };

  /*
    ----------------------------------------------------
    FORMAT TIME
    ----------------------------------------------------
  */

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

  /*
    ----------------------------------------------------
    LOADING
    ----------------------------------------------------
  */

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <View style={styles.loadingIconContainer}>
          <MaterialIcons
            name="notifications"
            size={32}
            color="#2563EB"
          />
        </View>

        <ActivityIndicator
          size="small"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Loading notifications...
        </Text>
      </SafeAreaView>
    );
  }

  /*
    ----------------------------------------------------
    MAIN UI
    ----------------------------------------------------
  */

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <View style={styles.headingRow}>
              <Text style={styles.heading}>
                Notifications
              </Text>

              {unreadCount > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>
                    {unreadCount > 99
                      ? "99+"
                      : unreadCount}
                  </Text>
                </View>
              )}
            </View>

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

          <View style={styles.headerIcon}>
            <MaterialIcons
              name={
                unreadCount > 0
                  ? "notifications-active"
                  : "notifications-none"
              }
              size={25}
              color={
                unreadCount > 0
                  ? "#2563EB"
                  : "#64748B"
              }
            />

            {unreadCount > 0 && (
              <View style={styles.headerDot} />
            )}
          </View>
        </View>

        {/* MARK ALL */}

        {unreadCount > 0 && (
          <TouchableOpacity
            style={[
              styles.markAllButton,
              markingAll &&
                styles.disabledButton,
            ]}
            onPress={markAllAsRead}
            disabled={markingAll}
            activeOpacity={0.8}
          >
            {markingAll ? (
              <ActivityIndicator
                size="small"
                color="#2563EB"
              />
            ) : (
              <MaterialIcons
                name="done-all"
                size={18}
                color="#2563EB"
              />
            )}

            <Text style={styles.markAll}>
              {markingAll
                ? "Updating..."
                : "Mark all as read"}
            </Text>
          </TouchableOpacity>
        )}

        {/* NOTIFICATIONS */}

        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View
              style={styles.emptyIconContainer}
            >
              <MaterialIcons
                name="notifications-none"
                size={55}
                color="#2563EB"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No Notifications Yet
            </Text>

            <Text style={styles.emptyText}>
              Updates about your donations, help
              requests, messages, and account activity
              will appear here.
            </Text>

            <View style={styles.emptyHint}>
              <MaterialIcons
                name="notifications-none"
                size={16}
                color="#64748B"
              />

              <Text style={styles.emptyHintText}>
                We'll keep you updated
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.notificationList}>
            {notifications.map((item) => {
              const isUnread =
                item.read === false;

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.82}
                  style={[
                    styles.notificationCard,

                    isUnread &&
                      styles.unreadCard,
                  ]}
                  onPress={() =>
                    handleNotificationPress(
                      item
                    )
                  }
                >
                  {/* ICON */}

                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor:
                          getIconBackground(
                            item.type
                          ),
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={getIcon(item.type)}
                      size={24}
                      color={getIconColor(
                        item.type
                      )}
                    />

                    {isUnread && (
                      <View
                        style={styles.iconUnreadDot}
                      />
                    )}
                  </View>

                  {/* CONTENT */}

                  <View style={styles.content}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[
                          styles.title,

                          isUnread &&
                            styles.unreadTitle,
                        ]}
                        numberOfLines={2}
                      >
                        {item.title ||
                          "Ubuntu Connect Update"}
                      </Text>

                      {isUnread && (
                        <View
                          style={
                            styles.unreadDot
                          }
                        />
                      )}
                    </View>

                    <Text
                      style={styles.message}
                      numberOfLines={3}
                    >
                      {item.message ||
                        "You have a new update."}
                    </Text>

                    <View
                      style={
                        styles.notificationFooter
                      }
                    >
                      <View
                        style={
                          styles.timeContainer
                        }
                      >
                        <MaterialIcons
                          name="schedule"
                          size={13}
                          color="#94A3B8"
                        />

                        <Text
                          style={styles.time}
                        >
                          {formatNotificationTime(
                            item.createdAt
                          )}
                        </Text>
                      </View>

                      {item.type ===
                      "message" ? (
                        <View
                          style={
                            styles.actionContainer
                          }
                        >
                          <Text
                            style={
                              styles.openChatText
                            }
                          >
                            Open chat
                          </Text>

                          <MaterialIcons
                            name="chevron-right"
                            size={18}
                            color="#2563EB"
                          />
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.readStatusContainer,

                            isUnread &&
                              styles.unreadStatusContainer,
                          ]}
                        >
                          <MaterialIcons
                            name={
                              isUnread
                                ? "mark-email-unread"
                                : "done"
                            }
                            size={13}
                            color={
                              isUnread
                                ? "#16A34A"
                                : "#94A3B8"
                            }
                          />

                          <Text
                            style={[
                              styles.readStatus,

                              isUnread &&
                                styles.unreadStatus,
                            ]}
                          >
                            {isUnread
                              ? "Unread"
                              : "Read"}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  /*
    ----------------------------------------------------
    GENERAL
    ----------------------------------------------------
  */

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 18,
  },

  /*
    ----------------------------------------------------
    LOADING
    ----------------------------------------------------
  */

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  loadingText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },

  /*
    ----------------------------------------------------
    HEADER
    ----------------------------------------------------
  */

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 17,
  },

  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },

  headingRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
  },

  headerBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },

  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 5,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    position: "relative",
  },

  headerDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1,
    borderColor: "#EFF6FF",
  },

  /*
    ----------------------------------------------------
    MARK ALL
    ----------------------------------------------------
  */

  markAllButton: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  disabledButton: {
    opacity: 0.6,
  },

  markAll: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 6,
  },

  /*
    ----------------------------------------------------
    NOTIFICATION LIST
    ----------------------------------------------------
  */

  notificationList: {
    paddingTop: 2,
  },

  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 20,
    marginBottom: 11,

    borderWidth: 1,
    borderColor: "#E2E8F0",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 2,
  },

  unreadCard: {
    backgroundColor: "#F8FFFB",
    borderColor: "#DCFCE7",
    borderLeftWidth: 4,
    borderLeftColor: "#22C55E",
    paddingLeft: 12,
  },

  /*
    ----------------------------------------------------
    NOTIFICATION ICON
    ----------------------------------------------------
  */

  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
    position: "relative",
  },

  iconUnreadDot: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },

  /*
    ----------------------------------------------------
    CONTENT
    ----------------------------------------------------
  */

  content: {
    flex: 1,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  title: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    color: "#334155",
    marginRight: 7,
  },

  unreadTitle: {
    color: "#1E293B",
    fontWeight: "800",
  },

  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    marginTop: 5,
  },

  message: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  /*
    ----------------------------------------------------
    FOOTER
    ----------------------------------------------------
  */

  notificationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },

  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  time: {
    color: "#94A3B8",
    fontSize: 11,
    marginLeft: 4,
  },

  /*
    ----------------------------------------------------
    OPEN CHAT
    ----------------------------------------------------
  */

  actionContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  openChatText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "800",
  },

  /*
    ----------------------------------------------------
    READ STATUS
    ----------------------------------------------------
  */

  readStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  unreadStatusContainer: {
    backgroundColor: "#F0FDF4",
  },

  readStatus: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 3,
  },

  unreadStatus: {
    color: "#16A34A",
    fontWeight: "800",
  },

  /*
    ----------------------------------------------------
    EMPTY STATE
    ----------------------------------------------------
  */

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    marginTop: 85,
  },

  emptyIconContainer: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,

    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  emptyTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
  },

  emptyText: {
    color: "#64748B",
    textAlign: "center",
    marginTop: 9,
    lineHeight: 22,
    fontSize: 14,
  },

  emptyHint: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 20,
  },

  emptyHintText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 5,
  },
});