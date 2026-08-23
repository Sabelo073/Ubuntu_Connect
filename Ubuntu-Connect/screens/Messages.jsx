import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

const Messages = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  /*
    This function must appear before filteredChats.
    It finds the person who is not the current user.
  */
  const getOtherParticipant = (chat) => {
    const currentUserId = auth.currentUser?.uid;

    const participantIds = Array.isArray(chat?.participantIds)
      ? chat.participantIds
      : [];

    const participantNames =
      chat?.participantNames &&
      typeof chat.participantNames === "object"
        ? chat.participantNames
        : {};

    const otherUserId =
      participantIds.find(
        (participantId) =>
          participantId !== currentUserId
      ) || "";

    const otherUserName =
      participantNames[otherUserId] ||
      chat?.organizationName ||
      "Ubuntu Connect User";

    return {
      id: otherUserId,
      name: otherUserName,
    };
  };

  const getUnreadCount = (chat) => {
    const currentUserId = auth.currentUser?.uid;

    if (!currentUserId) {
      return 0;
    }

    const count =
      chat?.unreadCounts?.[currentUserId];

    return typeof count === "number" ? count : 0;
  };

  const formatChatTime = (timestamp) => {
    if (!timestamp) {
      return "";
    }

    const date =
      typeof timestamp.toDate === "function"
        ? timestamp.toDate()
        : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const now = new Date();

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    const difference =
      now.getTime() - date.getTime();

    const days = Math.floor(
      difference / 86400000
    );

    if (days === 1) {
      return "Yesterday";
    }

    if (days >= 0 && days < 7) {
      return date.toLocaleDateString([], {
        weekday: "short",
      });
    }

    return date.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
    });
  };

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setChats([]);
      setLoading(false);
      return;
    }

    const chatsQuery = query(
      collection(db, "chats"),
      where(
        "participantIds",
        "array-contains",
        user.uid
      ),
      orderBy("lastMessageAt", "desc")
    );

    const unsubscribe = onSnapshot(
      chatsQuery,
      (snapshot) => {
        const chatList = snapshot.docs.map(
          (document) => ({
            id: document.id,
            ...document.data(),
          })
        );

        setChats(chatList);
        setLoading(false);
      },
      (error) => {
        console.log(
          "CHATS ERROR CODE:",
          error.code
        );

        console.log(
          "CHATS ERROR MESSAGE:",
          error.message
        );

        setLoading(false);

        Alert.alert(
          "Messages Error",
          error.message ||
            "Conversations could not be loaded."
        );
      }
    );

    return () => unsubscribe();
  }, []);

  /*
    Search by:
    1. Participant name
    2. Last message
    3. Request item
  */
  const filteredChats = useMemo(() => {
    const searchValue =
      searchText.trim().toLowerCase();

    if (!searchValue) {
      return chats;
    }

    return chats.filter((chat) => {
      const otherParticipant =
        getOtherParticipant(chat);

      const participantName =
        otherParticipant.name
          ?.toLowerCase() || "";

      const lastMessage =
        chat?.lastMessage
          ?.toLowerCase() || "";

      const requestItem =
        chat?.requestItem
          ?.toLowerCase() || "";

      return (
        participantName.includes(searchValue) ||
        lastMessage.includes(searchValue) ||
        requestItem.includes(searchValue)
      );
    });
  }, [chats, searchText]);

  const openChat = (chat) => {
    const otherParticipant =
      getOtherParticipant(chat);

    if (!chat?.id) {
      Alert.alert(
        "Chat Error",
        "This conversation does not have a valid chat ID."
      );
      return;
    }

    if (!otherParticipant.id) {
      Alert.alert(
        "Chat Error",
        "The other participant could not be found."
      );
      return;
    }

    navigation.navigate("Chat", {
      chatId: chat.id,
      otherUserId: otherParticipant.id,
      otherUserName: otherParticipant.name,
    });
  };

  const renderChat = ({ item }) => {
    const otherParticipant =
      getOtherParticipant(item);

    const unreadCount =
      getUnreadCount(item);

    const avatarLetter =
      otherParticipant.name
        ?.charAt(0)
        ?.toUpperCase() || "U";

    return (
      <TouchableOpacity
        style={[
          styles.chatCard,
          unreadCount > 0 &&
            styles.unreadChatCard,
        ]}
        activeOpacity={0.8}
        onPress={() => openChat(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {avatarLetter}
          </Text>

          <View style={styles.statusDot} />
        </View>

        <View style={styles.chatContent}>
          <View style={styles.topRow}>
            <Text
              style={[
                styles.name,
                unreadCount > 0 &&
                  styles.unreadName,
              ]}
              numberOfLines={1}
            >
              {otherParticipant.name}
            </Text>

            <Text
              style={[
                styles.time,
                unreadCount > 0 &&
                  styles.unreadTime,
              ]}
            >
              {formatChatTime(
                item.lastMessageAt
              )}
            </Text>
          </View>

          {item.requestItem ? (
            <Text
              style={styles.requestContext}
              numberOfLines={1}
            >
              Help request: {item.requestItem}
            </Text>
          ) : null}

          <View style={styles.bottomRow}>
            <Text
              style={[
                styles.message,
                unreadCount > 0 &&
                  styles.unreadMessage,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage ||
                "Start the conversation"}
            </Text>

            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
        edges={["top", "left", "right"]}
      >
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Loading conversations...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <Text style={styles.heading}>
        Messages
      </Text>

      <Text style={styles.subtitle}>
        Coordinate donations, requests, and collections.
      </Text>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>
          🔍
        </Text>

        <TextInput
          placeholder="Search conversations..."
          placeholderTextColor="#94A3B8"
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />

        {searchText.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchText("")}
          >
            <Text style={styles.clearText}>
              ✕
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={renderChat}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          filteredChats.length === 0
            ? styles.emptyListContainer
            : styles.listContainer
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View
              style={styles.emptyIconContainer}
            >
              <Text style={styles.emptyIcon}>
                💬
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              {searchText.trim()
                ? "No Conversations Found"
                : "No Messages Yet"}
            </Text>

            <Text style={styles.emptyText}>
              {searchText.trim()
                ? `No conversation matched "${searchText.trim()}".`
                : "Your conversations with donors, recipients, and organizations will appear here."}
            </Text>

            {searchText.trim() ? (
              <TouchableOpacity
                style={styles.resetSearchButton}
                onPress={() =>
                  setSearchText("")
                }
              >
                <Text
                  style={styles.resetSearchText}
                >
                  Clear Search
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
};


export default Messages;

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

  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 20,
  },

  subtitle: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 20,
  },

  searchContainer: {
    height: 55,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  searchIcon: {
    fontSize: 17,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    color: "#1E293B",
    fontSize: 15,
    height: "100%",
  },

  clearButton: {
    padding: 6,
  },

  clearText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "700",
  },

  listContainer: {
    paddingBottom: 100,
  },

  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 15,
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

  unreadChatCard: {
    backgroundColor: "#F8FFFB",
    borderLeftWidth: 4,
    borderLeftColor: "#22C55E",
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    position: "relative",
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },

  statusDot: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  chatContent: {
    flex: 1,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },

  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginRight: 10,
  },

  unreadName: {
    fontWeight: "800",
  },

  time: {
    color: "#94A3B8",
    fontSize: 12,
  },

  unreadTime: {
    color: "#16A34A",
    fontWeight: "700",
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  message: {
    flex: 1,
    color: "#64748B",
    marginRight: 8,
  },

  unreadMessage: {
    color: "#334155",
    fontWeight: "600",
  },

  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },

  unreadText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 11,
  },

  emptyListContainer: {
    flexGrow: 1,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 100,
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
    fontSize: 52,
  },

  emptyTitle: {
    color: "#1E293B",
    fontSize: 22,
    fontWeight: "700",
  },

  emptyText: {
    color: "#64748B",
    textAlign: "center",
    lineHeight: 23,
    marginTop: 10,
  },
});