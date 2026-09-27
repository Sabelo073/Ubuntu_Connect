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

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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
    ----------------------------------------------------
    GET OTHER PARTICIPANT
    ----------------------------------------------------
  */

  const getOtherParticipant = (chat) => {
    const currentUserId = auth.currentUser?.uid;

    const participantIds = Array.isArray(
      chat?.participantIds
    )
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

  /*
    ----------------------------------------------------
    UNREAD COUNT
    ----------------------------------------------------
  */

  const getUnreadCount = (chat) => {
    const currentUserId = auth.currentUser?.uid;

    if (!currentUserId) {
      return 0;
    }

    const count =
      chat?.unreadCounts?.[currentUserId];

    return typeof count === "number" ? count : 0;
  };

  /*
    ----------------------------------------------------
    FORMAT CHAT TIME
    ----------------------------------------------------
  */

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

  /*
    ----------------------------------------------------
    LOAD CHATS
    ----------------------------------------------------
  */

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
    ----------------------------------------------------
    SEARCH
    ----------------------------------------------------
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

  /*
    ----------------------------------------------------
    OPEN CHAT
    ----------------------------------------------------
  */

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

  /*
    ----------------------------------------------------
    RENDER CHAT
    ----------------------------------------------------
  */

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
        activeOpacity={0.82}
        onPress={() => openChat(item)}
      >
        {/* Avatar */}

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {avatarLetter}
          </Text>

          <View style={styles.statusDot}>
            <MaterialIcons
              name="chat"
              size={8}
              color="#FFFFFF"
            />
          </View>
        </View>

        {/* Conversation Content */}

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

          {/* Request context */}

          {item.requestItem ? (
            <View style={styles.requestContextRow}>
              <MaterialIcons
                name="volunteer-activism"
                size={13}
                color="#7C3AED"
              />

              <Text
                style={styles.requestContext}
                numberOfLines={1}
              >
                Help request: {item.requestItem}
              </Text>
            </View>
          ) : null}

          {/* Last message */}

          <View style={styles.bottomRow}>
            <View style={styles.messagePreview}>
              <MaterialIcons
                name="chat-bubble-outline"
                size={14}
                color={
                  unreadCount > 0
                    ? "#475569"
                    : "#94A3B8"
                }
              />

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
            </View>

            <View style={styles.chatArrowContainer}>
              {unreadCount > 0 ? (
                <View
                  style={styles.unreadBadge}
                >
                  <Text
                    style={styles.unreadText}
                  >
                    {unreadCount > 99
                      ? "99+"
                      : unreadCount}
                  </Text>
                </View>
              ) : (
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color="#CBD5E1"
                />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
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
        edges={["top", "left", "right"]}
      >
        <View style={styles.loadingIconContainer}>
          <MaterialIcons
            name="chat"
            size={32}
            color="#2563EB"
          />
        </View>

        <ActivityIndicator
          size="small"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Loading conversations...
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
      {/* Header */}

      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>
            Messages
          </Text>

          <Text style={styles.subtitle}>
            Stay connected with your community.
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <MaterialIcons
            name="chat-bubble"
            size={24}
            color="#2563EB"
          />
        </View>
      </View>

      {/* Search */}

      <View style={styles.searchContainer}>
        <MaterialIcons
          name="search"
          size={21}
          color="#64748B"
        />

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
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="close"
              size={20}
              color="#64748B"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Results header */}

      <View style={styles.resultsHeader}>
        <View style={styles.resultsTitleRow}>
          <MaterialIcons
            name="forum"
            size={18}
            color="#2563EB"
          />

          <Text style={styles.resultsTitle}>
            Conversations
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {filteredChats.length}
          </Text>
        </View>
      </View>

      {/* Conversations */}

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
              <MaterialIcons
                name="forum"
                size={48}
                color="#2563EB"
              />
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
                activeOpacity={0.85}
              >
                <MaterialIcons
                  name="close"
                  size={18}
                  color="#FFFFFF"
                />

                <Text
                  style={styles.resetSearchText}
                >
                  Clear Search
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyHint}>
                <MaterialIcons
                  name="volunteer-activism"
                  size={16}
                  color="#22C55E"
                />

                <Text style={styles.emptyHintText}>
                  Start helping your community
                </Text>
              </View>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default Messages;

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
    marginBottom: 18,
  },

  heading: {
    fontSize: 29,
    fontWeight: "800",
    color: "#1E293B",
  },

  subtitle: {
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
  },

  /*
    ----------------------------------------------------
    SEARCH
    ----------------------------------------------------
  */

  searchContainer: {
    height: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    marginBottom: 17,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },

  searchInput: {
    flex: 1,
    color: "#1E293B",
    fontSize: 15,
    height: "100%",
    marginLeft: 10,
  },

  clearButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  /*
    ----------------------------------------------------
    RESULTS HEADER
    ----------------------------------------------------
  */

  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 11,
    paddingHorizontal: 2,
  },

  resultsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  resultsTitle: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 7,
  },

  countBadge: {
    minWidth: 27,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#E0E7FF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },

  countText: {
    color: "#4F46E5",
    fontSize: 11,
    fontWeight: "800",
  },

  /*
    ----------------------------------------------------
    CHAT LIST
    ----------------------------------------------------
  */

  listContainer: {
    paddingTop: 2,
    paddingBottom: 100,
  },

  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
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

  unreadChatCard: {
    backgroundColor: "#F8FFFB",
    borderColor: "#DCFCE7",
    borderLeftWidth: 4,
    borderLeftColor: "#22C55E",
    paddingLeft: 11,
  },

  /*
    ----------------------------------------------------
    AVATAR
    ----------------------------------------------------
  */

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
    position: "relative",
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },

  statusDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  /*
    ----------------------------------------------------
    CHAT CONTENT
    ----------------------------------------------------
  */

  chatContent: {
    flex: 1,
    minWidth: 0,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },

  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginRight: 8,
  },

  unreadName: {
    fontWeight: "800",
  },

  time: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "500",
  },

  unreadTime: {
    color: "#16A34A",
    fontWeight: "700",
  },

  /*
    ----------------------------------------------------
    REQUEST CONTEXT
    ----------------------------------------------------
  */

  requestContextRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  requestContext: {
    flex: 1,
    color: "#7C3AED",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },

  /*
    ----------------------------------------------------
    MESSAGE PREVIEW
    ----------------------------------------------------
  */

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  messagePreview: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  message: {
    flex: 1,
    color: "#64748B",
    fontSize: 13,
    marginLeft: 5,
    marginRight: 6,
  },

  unreadMessage: {
    color: "#334155",
    fontWeight: "700",
  },

  chatArrowContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },

  unreadBadge: {
    minWidth: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },

  unreadText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 10,
  },

  /*
    ----------------------------------------------------
    EMPTY STATE
    ----------------------------------------------------
  */

  emptyListContainer: {
    flexGrow: 1,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 80,
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
    color: "#1E293B",
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyText: {
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 9,
    fontSize: 14,
  },

  resetSearchButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 20,
  },

  resetSearchText: {
    color: "#FFFFFF",
    fontWeight: "700",
    marginLeft: 6,
  },

  emptyHint: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 20,
  },

  emptyHintText: {
    color: "#15803D",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 5,
  },
});