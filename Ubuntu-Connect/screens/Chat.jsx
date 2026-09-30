import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";

import {
  KeyboardAwareFlatList,
} from "react-native-keyboard-aware-scroll-view";

import { SafeAreaView } from "react-native-safe-area-context";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  increment,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

const Chat = ({ route, navigation }) => {
  const {
    chatId,
    otherUserId,
    otherUserName = "Ubuntu Connect User",
  } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  // Controls the report menu
  const [menuVisible, setMenuVisible] = useState(false);

  const currentUser = auth.currentUser;

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
    REPORT USER
    ----------------------------------------------------
  */

  const openReportUser = () => {
    setMenuVisible(false);

    if (!otherUserId) {
      showError(
        "Report Error",
        "The user information could not be found."
      );
      return;
    }

    navigation.navigate("ReportUser", {
      reportedUserId: otherUserId,
      reportedUserName: otherUserName,
    });
  };

  /*
    ----------------------------------------------------
    CHAT HEADER
    ----------------------------------------------------
  */

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,

      headerTitle: () => (
        <View style={styles.headerContainer}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {otherUserName?.charAt(0)?.toUpperCase() || "U"}
            </Text>

            <View style={styles.onlineDot} />
          </View>

          <View style={styles.headerTextContainer}>
            <Text
              style={styles.headerName}
              numberOfLines={1}
            >
              {otherUserName}
            </Text>

            <Text style={styles.headerStatus}>
              Ubuntu Connect
            </Text>
          </View>
        </View>
      ),

      headerTintColor: "#1E293B",

      headerStyle: {
        backgroundColor: "#FFFFFF",
      },

      headerTitleStyle: {
        fontWeight: "700",
      },

      headerShadowVisible: false,

      /*
        -----------------------------------------------
        BACK BUTTON
        -----------------------------------------------
      */

      headerLeft: () => (
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => {
            setMenuVisible(false);
            navigation.goBack();
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color="#1E293B"
          />
        </TouchableOpacity>
      ),

      /*
        -----------------------------------------------
        THREE DOT BUTTON ONLY
        -----------------------------------------------
      */

      headerRight: () => (
        <TouchableOpacity
          style={styles.headerMenuButton}
          onPress={() =>
            setMenuVisible(
              (previous) => !previous
            )
          }
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="more-vert"
            size={27}
            color="#1E293B"
          />
        </TouchableOpacity>
      ),
    });
  }, [
    navigation,
    otherUserName,
  ]);

  /*
    ----------------------------------------------------
    MARK RECEIVED MESSAGES AS READ
    ----------------------------------------------------
  */

  const markReceivedMessagesAsRead = async (
    receivedMessages
  ) => {
    if (
      !currentUser ||
      !chatId ||
      markingRead
    ) {
      return;
    }

    const unreadReceivedMessages =
      receivedMessages.filter(
        (message) =>
          message.receiverId === currentUser.uid &&
          message.senderId !== currentUser.uid &&
          message.read === false
      );

    if (unreadReceivedMessages.length === 0) {
      return;
    }

    try {
      setMarkingRead(true);

      const batch = writeBatch(db);

      unreadReceivedMessages.forEach((message) => {
        const messageReference = doc(
          db,
          "chats",
          chatId,
          "messages",
          message.id
        );

        batch.update(messageReference, {
          read: true,
        });
      });

      const chatReference = doc(
        db,
        "chats",
        chatId
      );

      batch.update(chatReference, {
        [`unreadCounts.${currentUser.uid}`]: 0,
      });

      await batch.commit();
    } catch (error) {
      console.log(
        "MARK MESSAGES READ ERROR:",
        error.code,
        error.message
      );
    } finally {
      setMarkingRead(false);
    }
  };

  /*
    ----------------------------------------------------
    LOAD MESSAGES
    ----------------------------------------------------
  */

  useEffect(() => {
    if (!chatId || !currentUser) {
      setLoading(false);
      return;
    }

    const messagesQuery = query(
      collection(
        db,
        "chats",
        chatId,
        "messages"
      ),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      messagesQuery,

      (snapshot) => {
        const messageList = snapshot.docs.map(
          (messageDocument) => ({
            id: messageDocument.id,
            ...messageDocument.data(),
          })
        );

        setMessages(messageList);
        setLoading(false);

        markReceivedMessagesAsRead(messageList);
      },

      (error) => {
        console.log(
          "CHAT MESSAGES ERROR:",
          error.code,
          error.message
        );

        setLoading(false);

        showError(
          "Chat Error",
          error.message ||
            "The conversation could not be loaded."
        );
      }
    );

    return () => unsubscribe();
  }, [chatId, currentUser?.uid]);

  /*
    ----------------------------------------------------
    MESSAGE NOTIFICATION
    ----------------------------------------------------
  */

  const createMessageNotification = async (
    cleanMessage
  ) => {
    if (!otherUserId || !currentUser) {
      return;
    }

    const senderName =
      currentUser.displayName ||
      currentUser.email ||
      "Ubuntu Connect User";

    try {
      await addDoc(
        collection(db, "notifications"),
        {
          userId: otherUserId,

          senderId: currentUser.uid,
          senderName,

          title: "New Message",

          message:
            `${senderName} sent you a message: ` +
            `"${cleanMessage}"`,

          type: "message",

          chatId,

          otherUserId: currentUser.uid,
          otherUserName: senderName,

          read: false,
          createdAt: serverTimestamp(),
        }
      );
    } catch (error) {
      console.log(
        "MESSAGE NOTIFICATION ERROR:",
        error.code,
        error.message
      );
    }
  };

  /*
    ----------------------------------------------------
    SEND MESSAGE
    ----------------------------------------------------
  */

  const sendMessage = async () => {
    const cleanMessage = messageText.trim();

    if (
      !cleanMessage ||
      !chatId ||
      !currentUser ||
      !otherUserId ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);
      setMessageText("");

      await addDoc(
        collection(
          db,
          "chats",
          chatId,
          "messages"
        ),
        {
          senderId: currentUser.uid,
          receiverId: otherUserId,
          text: cleanMessage,
          read: false,
          createdAt: serverTimestamp(),
        }
      );

      await updateDoc(
        doc(db, "chats", chatId),
        {
          lastMessage: cleanMessage,
          lastMessageAt: serverTimestamp(),
          lastSenderId: currentUser.uid,

          [`unreadCounts.${otherUserId}`]:
            increment(1),

          [`unreadCounts.${currentUser.uid}`]:
            0,
        }
      );

      await createMessageNotification(
        cleanMessage
      );
    } catch (error) {
      console.log(
        "SEND MESSAGE ERROR:",
        error.code,
        error.message
      );

      setMessageText(cleanMessage);

      showError(
        "Message Error",
        error.message ||
          "Your message could not be sent. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  /*
    ----------------------------------------------------
    FORMAT MESSAGE TIME
    ----------------------------------------------------
  */

  const formatMessageTime = (createdAt) => {
    if (!createdAt) {
      return "Sending...";
    }

    const date =
      typeof createdAt.toDate === "function"
        ? createdAt.toDate()
        : new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /*
    ----------------------------------------------------
    MESSAGE STATUS ICON
    ----------------------------------------------------
  */

  const renderMessageStatus = (item) => {
    if (item.read === true) {
      return (
        <View style={styles.readStatus}>
          <MaterialIcons
            name="done-all"
            size={15}
            color="#DBEAFE"
          />

          <Text style={styles.readStatusText}>
            Read
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.sentStatus}>
        <MaterialIcons
          name="done"
          size={14}
          color="#DBEAFE"
        />

        <Text style={styles.sentStatusText}>
          Sent
        </Text>
      </View>
    );
  };

  /*
    ----------------------------------------------------
    RENDER MESSAGE
    ----------------------------------------------------
  */

  const renderMessage = ({ item }) => {
    const isMyMessage =
      item.senderId === currentUser?.uid;

    return (
      <View
        style={[
          styles.messageRow,

          isMyMessage
            ? styles.myMessageRow
            : styles.otherMessageRow,
        ]}
      >
        {!isMyMessage && (
          <View style={styles.smallAvatar}>
            <Text style={styles.smallAvatarText}>
              {otherUserName
                ?.charAt(0)
                ?.toUpperCase() || "U"}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.messageBubble,

            isMyMessage
              ? styles.myMessageBubble
              : styles.otherMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,

              isMyMessage
                ? styles.myMessageText
                : styles.otherMessageText,
            ]}
          >
            {item.text}
          </Text>

          <View
            style={[
              styles.messageDetails,

              !isMyMessage &&
                styles.otherMessageDetails,
            ]}
          >
            <Text
              style={[
                styles.messageTime,

                isMyMessage &&
                  styles.myMessageTime,
              ]}
            >
              {formatMessageTime(
                item.createdAt
              )}
            </Text>

            {isMyMessage &&
              renderMessageStatus(item)}
          </View>
        </View>
      </View>
    );
  };

  /*
    ----------------------------------------------------
    EMPTY / ERROR STATE
    ----------------------------------------------------
  */

  if (!chatId || !currentUser) {
    return (
      <SafeAreaView
        style={styles.centerContainer}
      >
        <View style={styles.errorIconContainer}>
          <MaterialIcons
            name="chat-bubble-outline"
            size={42}
            color="#2563EB"
          />
        </View>

        <Text style={styles.errorTitle}>
          Conversation Unavailable
        </Text>

        <Text style={styles.errorText}>
          This conversation could not be opened.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <MaterialIcons
            name="arrow-back"
            size={19}
            color="#FFFFFF"
          />

          <Text style={styles.backButtonText}>
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  /*
    ----------------------------------------------------
    MAIN CHAT UI
    ----------------------------------------------------
  */

  return (
    <SafeAreaView
      style={styles.container}
      edges={["left", "right", "bottom"]}
    >
      {/* ---------------------------------------------
          REPORT MENU
          --------------------------------------------- */}

      {menuVisible && (
        <>
          {/* Invisible area used to close the menu */}
          <TouchableOpacity
            style={styles.menuBackdrop}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          />

          {/* Actual report menu */}
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={openReportUser}
              activeOpacity={0.75}
            >
              <View style={styles.menuIconContainer}>
                <MaterialIcons
                  name="flag"
                  size={20}
                  color="#EF4444"
                />
              </View>

              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemText}>
                  Report User
                </Text>

                <Text style={styles.menuItemSubtext}>
                  Report inappropriate behaviour
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
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
            Loading conversation...
          </Text>
        </View>
      ) : (
        <KeyboardAwareFlatList
          style={styles.chatList}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          enableOnAndroid={true}
          extraScrollHeight={20}
          extraHeight={100}
          contentContainerStyle={[
            styles.messageList,
            messages.length === 0 &&
              styles.emptyMessageList,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View
                style={styles.emptyIconContainer}
              >
                <MaterialIcons
                  name="chat-bubble-outline"
                  size={46}
                  color="#2563EB"
                />
              </View>

              <Text style={styles.emptyTitle}>
                Start the Conversation
              </Text>

              <Text style={styles.emptyText}>
                Connect with {otherUserName} to
                coordinate the donation, collection,
                or help request.
              </Text>

              <View style={styles.emptyHint}>
                <MaterialIcons
                  name="lock-outline"
                  size={16}
                  color="#64748B"
                />

                <Text
                  style={styles.emptyHintText}
                >
                  Your conversation is private
                </Text>
              </View>
            </View>
          }
        />
      )}

      {/* MESSAGE INPUT */}

      <View style={styles.inputArea}>
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            activeOpacity={0.7}
            onPress={() => {
              showError(
                "Coming Soon",
                "Attachment support will be available in a future update."
              );
            }}
          >
            <MaterialIcons
              name="add"
              size={24}
              color="#64748B"
            />
          </TouchableOpacity>

          <TextInput
            placeholder="Message..."
            placeholderTextColor="#94A3B8"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            autoCorrect
            textAlignVertical="top"
            style={styles.input}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() ||
                sending) &&
                styles.disabledSendButton,
            ]}
            onPress={sendMessage}
            disabled={
              !messageText.trim() || sending
            }
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <MaterialIcons
                name="send"
                size={21}
                color="#FFFFFF"
              />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.chatSafetyText}>
          <MaterialIcons
            name="verified-user"
            size={12}
            color="#94A3B8"
          />{" "}
          Keep conversations respectful and safe
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default Chat;

const styles = StyleSheet.create({
  /*
    ----------------------------------------------------
    GENERAL
    ----------------------------------------------------
  */

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",

    // Important for the floating report menu
    position: "relative",
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    backgroundColor: "#F8FAFC",
  },

  loadingText: {
    color: "#64748B",
    marginTop: 10,
    fontWeight: "600",
    fontSize: 14,
  },

  /*
    ----------------------------------------------------
    CHAT HEADER
    ----------------------------------------------------
  */

  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 230,
  },

  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    position: "relative",
  },

  headerAvatarText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "800",
  },

  onlineDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    right: -1,
    bottom: -1,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  headerTextContainer: {
    flexShrink: 1,
  },

  headerName: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "800",
  },

  headerStatus: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 1,
  },

  headerBackButton: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },

  headerMenuButton: {
    width: 46,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 3,
  },

  /*
    ----------------------------------------------------
    FLOATING REPORT MENU
    ----------------------------------------------------
  */

  menuBackdrop: {
    position: "absolute",

    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    backgroundColor: "transparent",

    zIndex: 1000,
    elevation: 10,
  },

  menuContainer: {
    position: "absolute",

    top: 8,
    right: 12,

    width: 250,

    backgroundColor: "#FFFFFF",

    borderRadius: 15,

    borderWidth: 1,
    borderColor: "#E2E8F0",

    paddingVertical: 5,

    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 12,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 15,

    zIndex: 2000,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  menuIconContainer: {
    width: 38,
    height: 38,

    borderRadius: 19,

    backgroundColor: "#FEF2F2",

    justifyContent: "center",
    alignItems: "center",
  },

  menuTextContainer: {
    marginLeft: 11,
    flex: 1,
  },

  menuItemText: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "800",
  },

  menuItemSubtext: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 3,
  },

  /*
    ----------------------------------------------------
    MESSAGES
    ----------------------------------------------------
  */

  chatList: {
    flex: 1,
  },

  messageList: {
    paddingHorizontal: 14,
    paddingVertical: 18,
  },

  emptyMessageList: {
    flexGrow: 1,
    justifyContent: "center",
  },

  messageRow: {
    width: "100%",
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "flex-end",
  },

  myMessageRow: {
    justifyContent: "flex-end",
  },

  otherMessageRow: {
    justifyContent: "flex-start",
  },

  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E0E7FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 7,
    marginBottom: 2,
  },

  smallAvatarText: {
    color: "#4F46E5",
    fontSize: 12,
    fontWeight: "800",
  },

  messageBubble: {
    maxWidth: "78%",
    borderRadius: 19,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 7,
  },

  myMessageBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 5,

    shadowColor: "#2563EB",
    shadowOpacity: 0.14,
    shadowRadius: 6,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  otherMessageBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 5,

    borderWidth: 1,
    borderColor: "#E2E8F0",

    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 5,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 1,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },

  myMessageText: {
    color: "#FFFFFF",
  },

  otherMessageText: {
    color: "#1E293B",
  },

  messageDetails: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 5,
  },

  otherMessageDetails: {
    justifyContent: "flex-end",
  },

  messageTime: {
    fontSize: 10,
    color: "#94A3B8",
  },

  myMessageTime: {
    color: "#DBEAFE",
  },

  sentStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 6,
  },

  sentStatusText: {
    color: "#DBEAFE",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 2,
  },

  readStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 6,
  },

  readStatusText: {
    color: "#DBEAFE",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 2,
  },

  /*
    ----------------------------------------------------
    INPUT AREA
    ----------------------------------------------------
  */

  inputArea: {
    backgroundColor: "#FFFFFF",

    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",

    paddingTop: 9,
    paddingHorizontal: 12,

    paddingBottom:
      Platform.OS === "ios" ? 8 : 7,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",

    backgroundColor: "#F1F5F9",

    borderRadius: 27,

    minHeight: 52,

    paddingLeft: 4,
    paddingRight: 5,
  },

  attachButton: {
    width: 44,
    height: 48,

    justifyContent: "center",
    alignItems: "center",
  },

  input: {
    flex: 1,

    minHeight: 48,
    maxHeight: 115,

    paddingHorizontal: 8,
    paddingTop: 13,
    paddingBottom: 11,

    color: "#1E293B",

    fontSize: 15,
    lineHeight: 20,
  },

  sendButton: {
    width: 44,
    height: 44,

    borderRadius: 22,

    backgroundColor: "#22C55E",

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 4,
  },

  disabledSendButton: {
    backgroundColor: "#CBD5E1",
  },

  chatSafetyText: {
    color: "#94A3B8",

    fontSize: 10,

    textAlign: "center",

    marginTop: 6,
  },

  /*
    ----------------------------------------------------
    EMPTY STATE
    ----------------------------------------------------
  */

  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
  },

  emptyIconContainer: {
    width: 92,
    height: 92,

    borderRadius: 46,

    backgroundColor: "#EFF6FF",

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 18,

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

    lineHeight: 21,

    marginTop: 8,

    fontSize: 14,
  },

  emptyHint: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#F1F5F9",

    borderRadius: 20,

    paddingHorizontal: 13,
    paddingVertical: 8,

    marginTop: 17,
  },

  emptyHintText: {
    color: "#64748B",

    fontSize: 11,

    fontWeight: "600",

    marginLeft: 5,
  },

  /*
    ----------------------------------------------------
    ERROR STATE
    ----------------------------------------------------
  */

  errorIconContainer: {
    width: 90,
    height: 90,

    borderRadius: 45,

    backgroundColor: "#EFF6FF",

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 5,
  },

  errorTitle: {
    color: "#1E293B",

    fontSize: 21,

    fontWeight: "800",

    marginTop: 15,
  },

  errorText: {
    color: "#64748B",

    textAlign: "center",

    marginTop: 8,

    lineHeight: 21,
  },

  backButton: {
    backgroundColor: "#2563EB",

    borderRadius: 14,

    paddingHorizontal: 22,
    paddingVertical: 13,

    marginTop: 22,

    flexDirection: "row",
    alignItems: "center",
  },

  backButtonText: {
    color: "#FFFFFF",

    fontWeight: "700",

    marginLeft: 7,
  },

  /*
    ----------------------------------------------------
    LOADING
    ----------------------------------------------------
  */

  loadingIconContainer: {
    width: 70,
    height: 70,

    borderRadius: 35,

    backgroundColor: "#EFF6FF",

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 18,
  },
});

