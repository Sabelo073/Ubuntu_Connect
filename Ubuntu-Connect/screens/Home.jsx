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
import { Ionicons } from "@expo/vector-icons";

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
        `${error.code || "Unknown error"}\n\n${error.message ||
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
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.greeting}>Hello </Text>
            <Ionicons
              name="hand-left"
              size={18}
              color="#F59E0B"
            />
          </View>

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
            <Ionicons
              name="gift"
              size={34}
              color="#2563EB"
            />
            <Text style={styles.actionText}>Donate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("RequestHelp")}
          >
            <Ionicons
              name="help-circle"
              size={34}
              color="#22C55E"
            />
            <Text style={styles.actionText}>Request</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Campaigns")}
          >
            <Ionicons
              name="megaphone"
              size={34}
              color="#F97316"
            />

            <Text style={styles.actionText}>Campaigns</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Charities")}
          >
            <Ionicons
              name="people"
              size={34}
              color="#8B5CF6"
            />
            <Text style={styles.actionText}>Charities</Text>
          </TouchableOpacity>
        </View>

        {/* Urgent Need */}
        <Text style={styles.sectionTitle}>
          Urgent Needs
        </Text>

        <View style={styles.needCard}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons
              name="shirt"
              size={20}
              color="#2563EB"
            />
            <Text
              style={[
                styles.needTitle,
                { marginLeft: 8 },
              ]}
            >
              Winter Products Needed
            </Text>
          </View>

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
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons
                        name="image-outline"
                        size={20}
                        color="#64748B"
                      />
                      <Text
                        style={[
                          styles.noImageText,
                          { marginLeft: 6 },
                        ]}
                      >
                        No image added
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.donationTopRow}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <Ionicons
                      name="gift"
                      size={18}
                      color="#2563EB"
                    />
                    <Text
                      style={[
                        styles.donationTitle,
                        { marginLeft: 6 },
                      ]}
                    >
                      {donation.itemName}
                    </Text>
                  </View>

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

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <Ionicons
                    name="location"
                    size={14}
                    color="#475569"
                  />
                  <Text
                    style={[
                      styles.donationLocation,
                      { marginLeft: 4 }
                    ]}
                  >
                    {donation.address}
                  </Text>
                </View>

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
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <Ionicons
                      name="help-circle"
                      size={18}
                      color="#22C55E"
                    />
                    <Text
                      style={[
                        styles.requestTitle,
                        { marginLeft: 6 },
                      ]}
                    >
                      {request.itemNeeded}
                    </Text>
                  </View>

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

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Ionicons
                    name="location"
                    size={14}
                    color="#475569"
                  />
                  <Text
                    style={[
                      styles.requestLocation,
                      { marginLeft: 4 }
                    ]}
                  >
                    {request.location}
                  </Text>
                </View>

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
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons
                          name="chatbubble"
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text
                          style={[
                            styles.offerHelpButtonText,
                            { marginLeft: 8 },
                          ]}
                        >
                          Offer Help
                        </Text>
                      </View>
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
    paddingHorizontal: 24,
    paddingTop: 24,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  greeting: {
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.3,
  },

  name: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },

  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "#EC4899",
  },

  impactCard: {
    marginHorizontal: 20,
    borderRadius: 30,
    padding: 24,
    marginBottom: 28,

    backgroundColor: "#7C3AED",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",

    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 24,
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
    fontSize: 28,
    fontWeight: "800",
  },

  statText: {
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
    fontSize: 12,
    textAlign: "center",
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginHorizontal: 20,
    marginBottom: 18,
  },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 28,
  },

  actionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 28,

    borderRadius: 28,
    alignItems: "center",
    marginBottom: 14,

    borderWidth: 1,
    borderColor: "#F1F5F9",

    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  actionText: {
    marginTop: 14,
    fontWeight: "700",
    color: "#1E293B",
    fontSize: 15,
  },

  needCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,

    borderRadius: 28,
    padding: 22,
    marginBottom: 25,

    borderWidth: 1,
    borderColor: "#F1F5F9",

    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },

  needTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },

  needLocation: {
    color: "#64748B",
    marginTop: 10,
    marginBottom: 18,
    fontSize: 14,
  },

  donateBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",

    shadowColor: "#22C55E",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },

  donateBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  donationCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,

    borderRadius: 28,
    padding: 18,
    marginBottom: 16,

    borderWidth: 1,
    borderColor: "#F1F5F9",

    shadowColor: "#7C3AED",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },

  donationImage: {
    width: "100%",
    height: 190,
    borderRadius: 22,
    marginBottom: 14,
    backgroundColor: "#E2E8F0",
  },

  donationTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  donationTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
    marginRight: 10,
  },

  donationCategory: {
    color: "#7C3AED",
    fontWeight: "700",
    marginBottom: 8,
  },

  donationDescription: {
    color: "#64748B",
    lineHeight: 22,
    marginBottom: 10,
    fontSize: 14,
  },

  donationLocation: {
    color: "#475569",
    marginBottom: 6,
  },

  donationMethod: {
    color: "#64748B",
    fontSize: 13,
  },

  featuredBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FCE7F3",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },

  featuredBadgeText: {
    color: "#EC4899",
    fontSize: 12,
    fontWeight: "800",
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 30,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "800",
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

    borderRadius: 28,
    padding: 20,
    marginBottom: 15,

    borderLeftWidth: 5,
    borderLeftColor: "#2563EB",

    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },

  requestTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  requestTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
    marginRight: 10,
  },

  requestCategory: {
    color: "#7C3AED",
    fontWeight: "700",
    marginBottom: 8,
  },

  requestDescription: {
    color: "#64748B",
    lineHeight: 22,
    marginBottom: 10,
    fontSize: 14,
  },

  requestLocation: {
    color: "#475569",
    marginBottom: 8,
  },

  requestStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  requestStatusLabel: {
    color: "#64748B",
    fontSize: 13,
    marginRight: 8,
  },

  requestBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 30,
  },

  requestBadgeText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "800",
  },

  urgentBadge: {
    backgroundColor: "#FEE2E2",
  },

  urgentBadgeText: {
    color: "#DC2626",
  },

  offerHelpButton: {
    backgroundColor: "#22C55E",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,

    shadowColor: "#22C55E",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },

  offerHelpButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  disabledButton: {
    opacity: 0.65,
  },

  loadingButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  ownRequestNotice: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 15,
  },

  ownRequestNoticeText: {
    color: "#2563EB",
    fontWeight: "700",
  },

  rejectedNotice: {
    backgroundColor: "#FEE2E2",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 15,
  },

  rejectedNoticeText: {
    color: "#DC2626",
    fontWeight: "700",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,

    borderRadius: 28,
    padding: 30,
    alignItems: "center",

    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },

  emptyText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 14,
  },

  charityCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 20,

    borderRadius: 28,

    borderWidth: 1,
    borderColor: "#F1F5F9",

    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },

  charityName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  charityAddress: {
    marginTop: 6,
    color: "#64748B",
    fontSize: 14,
  },

  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",

    backgroundColor: "#FCE7F3",

    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,

    marginTop: 8,
  },

  verifiedBadgeText: {
    color: "#EC4899",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 4,
  },

  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -5,

    minWidth: 22,
    height: 22,

    backgroundColor: "#EC4899",

    justifyContent: "center",
    alignItems: "center",

    borderRadius: 11,

    shadowColor: "#EC4899",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
});