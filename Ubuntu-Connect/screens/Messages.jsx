import React from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

const chats = [
  {
    id: 1,
    name: "Ubuntu Shelter",
    message: "Thank you for your blanket donation.",
    time: "10:45",
    unread: 2,
    online: true,
  },
  {
    id: 2,
    name: "Hope Foundation",
    message: "Pickup scheduled for tomorrow.",
    time: "09:20",
    unread: 0,
    online: false,
  },
  {
    id: 3,
    name: "Smile Children's Home",
    message: "We appreciate your support ❤️",
    time: "Yesterday",
    unread: 1,
    online: true,
  },
];

const Messages = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Messages</Text>

      <TextInput
        placeholder="Search conversations..."
        placeholderTextColor="#94A3B8"
        style={styles.searchInput}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {chats.map((chat) => (
          <TouchableOpacity key={chat.id} style={styles.chatCard}>
            
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {chat.name.charAt(0)}
              </Text>

              {chat.online && (
                <View style={styles.onlineDot} />
              )}
            </View>

            <View style={styles.chatContent}>
              <View style={styles.topRow}>
                <Text style={styles.name}>
                  {chat.name}
                </Text>

                <Text style={styles.time}>
                  {chat.time}
                </Text>
              </View>

              <View style={styles.bottomRow}>
                <Text
                  style={styles.message}
                  numberOfLines={1}
                >
                  {chat.message}
                </Text>

                {chat.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                      {chat.unread}
                    </Text>
                  </View>
                )}
              </View>
            </View>

          </TouchableOpacity>
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>
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

  heading: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 20,
    marginBottom: 20,
  },

  searchInput: {
    height: 55,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    marginBottom: 20,
    color: "#1E293B",
  },

  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 15,
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

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    position: "relative",
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },

  onlineDot: {
    position: "absolute",
    right: 2,
    bottom: 2,
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
    marginBottom: 6,
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },

  time: {
    color: "#64748B",
    fontSize: 12,
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
    fontWeight: "700",
    fontSize: 12,
  },
});