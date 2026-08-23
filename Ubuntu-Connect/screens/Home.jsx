import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

const Home = ({ navigation }) => {
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [startingChatId, setStartingChatId] = useState(null);

  useEffect(() => {
    const donationsQuery = query(
      collection(db, "donations"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const requestsQuery = query(
      collection(db, "requests"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsubscribeDonations = onSnapshot(
      donationsQuery,
      (snapshot) => {
        const donationList = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setDonations(donationList);
      },
      (error) => {
        console.log("DONATIONS ERROR:", error.message);
      }
    );

    const unsubscribeRequests = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const requestList = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setRequests(requestList);
      },
      (error) => {
        console.log("REQUESTS ERROR:", error.message);
      }
    );

    return () => {
      unsubscribeDonations();
      unsubscribeRequests();
    };
  }, []);

 const startHelpConversation = async (request) => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    Alert.alert(
      "Login Required",
      "Please log in before offering help."
    );
    return;
  }

  if (!request?.id || !request?.userId) {
    Alert.alert(
      "Chat Error",
      "The request or request owner could not be found."
    );
    return;
  }

  if (request.userId === currentUser.uid) {
    Alert.alert(
      "Your Request",
      "You cannot start a conversation with yourself."
    );
    return;
  }

  try {
    setStartingChatId(request.id);

    const currentUserReference = doc(
      db,
      "users",
      currentUser.uid
    );

    const requestOwnerReference = doc(
      db,
      "users",
      request.userId
    );

    const [
      currentUserSnapshot,
      requestOwnerSnapshot,
    ] = await Promise.all([
      getDoc(currentUserReference),
      getDoc(requestOwnerReference),
    ]);

    if (!requestOwnerSnapshot.exists()) {
      Alert.alert(
        "Chat Error",
        "The request owner's profile could not be found."
      );
      return;
    }

    const currentUserData = currentUserSnapshot.exists()
      ? currentUserSnapshot.data()
      : {};

    const requestOwnerData =
      requestOwnerSnapshot.data();

    const currentUserName =
      currentUserData.fullName ||
      currentUser.displayName ||
      currentUser.email ||
      "Ubuntu Connect User";

    const requestOwnerName =
      requestOwnerData.fullName ||
      requestOwnerData.email ||
      "Ubuntu Connect User";

    const participantIds = [
      currentUser.uid,
      request.userId,
    ].sort();

    const chatId =
      `${participantIds.join("_")}_${request.id}`;

    const chatReference = doc(
      db,
      "chats",
      chatId
    );

    /*
      No getDoc(chatReference) is needed here.

      setDoc with merge creates a chat if it is new,
      and safely reuses the chat if it already exists.
    */
    await setDoc(
      chatReference,
      {
        participantIds,

        participantNames: {
          [currentUser.uid]: currentUserName,
          [request.userId]: requestOwnerName,
        },

        requestId: request.id,
        requestItem: request.itemNeeded || "",
        requestCategory: request.category || "",

        lastMessage: "",
        lastMessageAt: serverTimestamp(),
        lastSenderId: "",

        unreadCounts: {
          [currentUser.uid]: 0,
          [request.userId]: 0,
        },

        createdAt: serverTimestamp(),
      },
      {
        merge: true,
      }
    );

    navigation.navigate("Chat", {
      chatId,
      otherUserId: request.userId,
      otherUserName: requestOwnerName,
    });
  } catch (error) {
    console.log(
      "START CHAT ERROR CODE:",
      error.code
    );

    console.log(
      "START CHAT ERROR MESSAGE:",
      error.message
    );

    Alert.alert(
      "Chat Error",
      `${error.code || "Unknown error"}\n\n${
        error.message ||
        "The conversation could not be started."
      }`
    );
  } finally {
    setStartingChatId(null);
  }
};

  const getStatusStyle = (status) => {
    switch (status) {
      case "Approved":
        return {
          container: styles.approvedStatusBadge,
          text: styles.approvedStatusText,
        };

      case "Rejected":
        return {
          container: styles.rejectedStatusBadge,
          text: styles.rejectedStatusText,
        };

      default:
        return {
          container: styles.pendingStatusBadge,
          text: styles.pendingStatusText,
        };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello 👋</Text>
          <Text style={styles.name}>Change Maker</Text>
        </View>

        {/* Impact Card */}
        <View style={styles.impactCard}>
          <Text style={styles.cardTitle}>
            Community Activity
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>
                {donations.length}
              </Text>

              <Text style={styles.statText}>
                Donations
              </Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statNumber}>
                {requests.length}
              </Text>

              <Text style={styles.statText}>
                Requests
              </Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statNumber}>12</Text>

              <Text style={styles.statText}>
                Volunteer Hours
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>
          Quick Actions
        </Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Donate")}
          >
            <Text style={styles.actionEmoji}>🎁</Text>
            <Text style={styles.actionText}>Donate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("RequestHelp")}
          >
            <Text style={styles.actionEmoji}>🙏</Text>
            <Text style={styles.actionText}>Request</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Campaigns")}
          >
            <Text style={styles.actionEmoji}>📢</Text>
            <Text style={styles.actionText}>Campaigns</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Charities")}
          >
            <Text style={styles.actionEmoji}>🤝</Text>
            <Text style={styles.actionText}>Charities</Text>
          </TouchableOpacity>
        </View>

        {/* Urgent Need */}
        <Text style={styles.sectionTitle}>
          Urgent Needs
        </Text>

        <View style={styles.needCard}>
          <Text style={styles.needTitle}>
            🧥 Winter Blankets Needed
          </Text>

          <Text style={styles.needLocation}>
            Johannesburg Community Shelter
          </Text>

          <TouchableOpacity
            style={styles.donateBtn}
            onPress={() => navigation.navigate("Donate")}
          >
            <Text style={styles.donateBtnText}>
              Donate Now
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Donations */}
        <Text style={styles.sectionTitle}>
          Recent Donations
        </Text>

        {donations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No donations submitted yet.
            </Text>
          </View>
        ) : (
          donations.map((donation) => {
            const statusStyle = getStatusStyle(
              donation.status
            );

            return (
              <View
                key={donation.id}
                style={styles.donationCard}
              >
                {donation.imageBase64 ? (
                  <Image
                    source={{
                      uri: `data:image/jpeg;base64,${donation.imageBase64}`,
                    }}
                    style={styles.donationImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.noImageBox}>
                    <Text style={styles.noImageText}>
                      🎁 No image added
                    </Text>
                  </View>
                )}

                <View style={styles.donationTopRow}>
                  <Text style={styles.donationTitle}>
                    🎁 {donation.itemName}
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,
                      statusStyle.container,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        statusStyle.text,
                      ]}
                    >
                      {donation.status || "Pending"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.donationCategory}>
                  {donation.category} • {donation.condition}
                </Text>

                <Text
                  style={styles.donationDescription}
                  numberOfLines={2}
                >
                  {donation.description}
                </Text>

                <Text style={styles.donationLocation}>
                  📍 {donation.address}
                </Text>

                <Text style={styles.donationMethod}>
                  Method: {donation.deliveryMethod}
                </Text>
              </View>
            );
          })
        )}

        {/* Recent Help Requests */}
        <Text style={styles.sectionTitle}>
          Recent Help Requests
        </Text>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No help requests submitted yet.
            </Text>
          </View>
        ) : (
          requests.map((request) => {
            const isOwnRequest =
              request.userId === auth.currentUser?.uid;

            const isStartingChat =
              startingChatId === request.id;

            const statusStyle = getStatusStyle(
              request.status
            );

            return (
              <View
                key={request.id}
                style={styles.requestCard}
              >
                <View style={styles.requestTopRow}>
                  <Text style={styles.requestTitle}>
                    🙏 {request.itemNeeded}
                  </Text>

                  <View
                    style={[
                      styles.requestBadge,
                      request.urgency === "Urgent" &&
                        styles.urgentBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.requestBadgeText,
                        request.urgency === "Urgent" &&
                          styles.urgentBadgeText,
                      ]}
                    >
                      {request.urgency || "Normal"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.requestCategory}>
                  {request.category} • Quantity:{" "}
                  {request.quantity}
                </Text>

                <Text
                  style={styles.requestDescription}
                  numberOfLines={2}
                >
                  {request.description}
                </Text>

                <Text style={styles.requestLocation}>
                  📍 {request.location}
                </Text>

                <View style={styles.requestStatusRow}>
                  <Text style={styles.requestStatusLabel}>
                    Status:
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,
                      statusStyle.container,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        statusStyle.text,
                      ]}
                    >
                      {request.status || "Pending"}
                    </Text>
                  </View>
                </View>

                {isOwnRequest ? (
                  <View style={styles.ownRequestNotice}>
                    <Text style={styles.ownRequestNoticeText}>
                      This is your help request
                    </Text>
                  </View>
                ) : request.status !== "Rejected" ? (
                  <TouchableOpacity
                    style={[
                      styles.offerHelpButton,
                      isStartingChat &&
                        styles.disabledButton,
                    ]}
                    onPress={() =>
                      startHelpConversation(request)
                    }
                    disabled={isStartingChat}
                  >
                    {isStartingChat ? (
                      <View style={styles.loadingButtonContent}>
                        <ActivityIndicator
                          size="small"
                          color="#FFFFFF"
                        />

                        <Text
                          style={styles.offerHelpButtonText}
                        >
                          Starting Chat...
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.offerHelpButtonText}>
                        💬 Offer Help
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.rejectedNotice}>
                    <Text style={styles.rejectedNoticeText}>
                      This request is no longer available
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* Nearby Charities */}
        <Text style={styles.sectionTitle}>
          Nearby Charities
        </Text>

        <TouchableOpacity
          style={styles.charityCard}
          onPress={() => navigation.navigate("Charities")}
        >
          <Text style={styles.charityName}>
            Ubuntu Community Center
          </Text>

          <Text style={styles.charityAddress}>
            2.5 km away
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.charityCard}
          onPress={() => navigation.navigate("Charities")}
        >
          <Text style={styles.charityName}>
            Hope Foundation
          </Text>

          <Text style={styles.charityAddress}>
            4.1 km away
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 20,
  },

  greeting: {
    color: "#64748B",
    fontSize: 16,
  },

  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 3,
  },

  impactCard: {
    backgroundColor: "#2563EB",
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    marginBottom: 25,
  },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  stat: {
    alignItems: "center",
    flex: 1,
  },

  statNumber: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },

  statText: {
    color: "#E2E8F0",
    marginTop: 5,
    fontSize: 12,
    textAlign: "center",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginHorizontal: 20,
    marginBottom: 15,
  },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 25,
  },

  actionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 25,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },

  actionEmoji: {
    fontSize: 30,
  },

  actionText: {
    marginTop: 10,
    fontWeight: "600",
    color: "#1E293B",
  },

  needCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
  },

  needTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },

  needLocation: {
    color: "#64748B",
    marginTop: 10,
    marginBottom: 15,
  },

  donateBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },

  donateBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  donationCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  donationImage: {
    width: "100%",
    height: 170,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: "#E2E8F0",
  },

  noImageBox: {
    width: "100%",
    height: 120,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },

  noImageText: {
    color: "#64748B",
    fontWeight: "600",
  },

  donationTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  donationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
    marginRight: 8,
  },

  donationCategory: {
    color: "#2563EB",
    fontWeight: "600",
    marginBottom: 6,
  },

  donationDescription: {
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 8,
  },

  donationLocation: {
    color: "#475569",
    marginBottom: 4,
  },

  donationMethod: {
    color: "#64748B",
    fontSize: 13,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  pendingStatusBadge: {
    backgroundColor: "#FEF3C7",
  },

  pendingStatusText: {
    color: "#D97706",
  },

  approvedStatusBadge: {
    backgroundColor: "#DCFCE7",
  },

  approvedStatusText: {
    color: "#16A34A",
  },

  rejectedStatusBadge: {
    backgroundColor: "#FEE2E2",
  },

  rejectedStatusText: {
    color: "#DC2626",
  },

  requestCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },

  requestTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  requestTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
    marginRight: 8,
  },

  requestCategory: {
    color: "#2563EB",
    fontWeight: "600",
    marginBottom: 6,
  },

  requestDescription: {
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 8,
  },

  requestLocation: {
    color: "#475569",
    marginBottom: 8,
  },

  requestStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },

  requestStatusLabel: {
    color: "#64748B",
    fontSize: 13,
    marginRight: 8,
  },

  requestBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  requestBadgeText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },

  urgentBadge: {
    backgroundColor: "#FEE2E2",
  },

  urgentBadgeText: {
    color: "#DC2626",
  },

  offerHelpButton: {
    backgroundColor: "#22C55E",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 15,
  },

  offerHelpButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  disabledButton: {
    opacity: 0.65,
  },

  loadingButtonContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  ownRequestNotice: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 15,
  },

  ownRequestNoticeText: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 13,
  },

  rejectedNotice: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 15,
  },

  rejectedNoticeText: {
    color: "#DC2626",
    fontWeight: "600",
    fontSize: 13,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },

  emptyText: {
    color: "#64748B",
    fontWeight: "500",
  },

  charityCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 18,
    borderRadius: 18,
  },

  charityName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },

  charityAddress: {
    marginTop: 4,
    color: "#64748B",
  },
});