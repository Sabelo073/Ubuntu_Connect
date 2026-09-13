import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

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

  const currentUser = auth.currentUser;

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
    navigation.setOptions({
      headerShown: true,
      title: otherUserName,
      headerTintColor: "#1E293B",

      headerStyle: {
        backgroundColor: "#FFFFFF",
      },

      headerTitleStyle: {
        fontWeight: "700",
      },

      headerShadowVisible: false,
    });
  }, [navigation, otherUserName]);

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

      /*
        The message was already sent successfully.
        A notification failure should not make the
        user send the same message again.
      */
    }
  };

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

          <View style={styles.messageDetails}>
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

            {isMyMessage && (
              <Text
                style={[
                  styles.deliveryStatus,

                  item.read === true &&
                    styles.readDeliveryStatus,
                ]}
              >
                {item.read === true
                  ? "✓✓ Read"
                  : "✓ Sent"}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (!chatId || !currentUser) {
    return (
      <SafeAreaView
        style={styles.centerContainer}
      >
        <Text style={styles.errorIcon}>
          💬
        </Text>

        <Text style={styles.errorTitle}>
          Conversation Unavailable
        </Text>

        <Text style={styles.errorText}>
          This conversation could not be opened.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
        keyboardVerticalOffset={
          Platform.OS === "ios" ? 90 : 0
        }
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator
              size="large"
              color="#2563EB"
            />

            <Text style={styles.loadingText}>
              Loading conversation...
            </Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            inverted
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={[
              styles.messageList,

              messages.length === 0 &&
                styles.emptyMessageList,
            ]}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View
                  style={
                    styles.emptyIconContainer
                  }
                >
                  <Text
                    style={styles.emptyIcon}
                  >
                    💬
                  </Text>
                </View>

                <Text style={styles.emptyTitle}>
                  Start the Conversation
                </Text>

                <Text style={styles.emptyText}>
                  Send a message to coordinate the
                  donation, collection, or help
                  request.
                </Text>
              </View>
            }
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Type a message..."
            placeholderTextColor="#94A3B8"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            autoCorrect
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
          >
            {sending ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={styles.sendButtonText}
              >
                ➤
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Chat;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  keyboardContainer: {
    flex: 1,
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
    marginTop: 12,
    fontWeight: "600",
  },

  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  emptyMessageList: {
    flexGrow: 1,
    justifyContent: "center",
  },

  messageRow: {
    width: "100%",
    marginBottom: 10,
  },

  myMessageRow: {
    alignItems: "flex-end",
  },

  otherMessageRow: {
    alignItems: "flex-start",
  },

  messageBubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 7,
  },

  myMessageBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 5,

    shadowColor: "#2563EB",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
  },

  otherMessageBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",

    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
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

  messageTime: {
    fontSize: 10,
    textAlign: "right",
    color: "#94A3B8",
  },

  myMessageTime: {
    color: "#DBEAFE",
  },

  deliveryStatus: {
    color: "#BFDBFE",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 7,
  },

  readDeliveryStatus: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 110,
    backgroundColor: "#F1F5F9",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 13,
    paddingBottom: 12,
    color: "#1E293B",
    fontSize: 15,
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  disabledSendButton: {
    backgroundColor: "#CBD5E1",
  },

  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },

  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 30,
  },

  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  emptyIcon: {
    fontSize: 48,
  },

  emptyTitle: {
    color: "#1E293B",
    fontSize: 21,
    fontWeight: "700",
  },

  emptyText: {
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 8,
  },

  errorIcon: {
    fontSize: 60,
  },

  errorTitle: {
    color: "#1E293B",
    fontSize: 21,
    fontWeight: "700",
    marginTop: 15,
  },

  errorText: {
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
  },

  backButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 13,
    marginTop: 22,
  },

  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});