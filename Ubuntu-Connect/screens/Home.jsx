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

import { SafeAreaView } from "react-native-safe-area-context";

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
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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

  const currentUser = auth.currentUser;

  const displayName =
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "Change Maker";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* =========================================
            HEADER
        ========================================= */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.welcomeRow}>
              <Text style={styles.greeting}>
                Good to see you
              </Text>

              <MaterialIcons
                name="waving-hand"
                size={18}
                color="#F59E0B"
                style={styles.waveIcon}
              />
            </View>

            <Text style={styles.name}>
              {displayName}
            </Text>

            <Text style={styles.headerSubtitle}>
              Together, we can make a difference.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() =>
              navigation.navigate("Notifications")
            }
          >
            <MaterialIcons
              name="notifications-none"
              size={27}
              color="#1E293B"
            />

            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* =========================================
            IMPACT HERO
        ========================================= */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIconBox}>
              <MaterialIcons
                name="volunteer-activism"
                size={28}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.heroText}>
              <Text style={styles.heroSmallTitle}>
                YOUR COMMUNITY IMPACT
              </Text>

              <Text style={styles.heroTitle}>
                Every action counts.
              </Text>
            </View>
          </View>

          <Text style={styles.heroDescription}>
            Donate what you can, offer your skills,
            or support someone who needs a helping hand.
          </Text>

          <TouchableOpacity
            style={styles.heroButton}
            onPress={() =>
              navigation.navigate("Donate")
            }
          >
            <Text style={styles.heroButtonText}>
              Make an Impact
            </Text>

            <MaterialIcons
              name="arrow-forward"
              size={19}
              color="#7C3AED"
            />
          </TouchableOpacity>
        </View>

        {/* =========================================
            COMMUNITY STATS
        ========================================= */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Community Activity
            </Text>

            <Text style={styles.sectionSubtitle}>
              See what's happening around you
            </Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: "#EFF6FF" },
              ]}
            >
              <MaterialIcons
                name="card-giftcard"
                size={21}
                color="#2563EB"
              />
            </View>

            <Text style={styles.statNumber}>
              {donations.length}
            </Text>

            <Text style={styles.statLabel}>
              Donations
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: "#F0FDF4" },
              ]}
            >
              <MaterialIcons
                name="volunteer-activism"
                size={21}
                color="#22C55E"
              />
            </View>

            <Text style={styles.statNumber}>
              {requests.length}
            </Text>

            <Text style={styles.statLabel}>
              Help Requests
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: "#FFF7ED" },
              ]}
            >
              <MaterialIcons
                name="access-time"
                size={21}
                color="#F97316"
              />
            </View>

            <Text style={styles.statNumber}>
              12
            </Text>

            <Text style={styles.statLabel}>
              Volunteer Hours
            </Text>
          </View>
        </View>

        {/* =========================================
            QUICK ACTIONS
        ========================================= */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              What would you like to do?
            </Text>

            <Text style={styles.sectionSubtitle}>
              Take action in your community
            </Text>
          </View>
        </View>

        <View style={styles.actionGrid}>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              navigation.navigate("Donate")
            }
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: "#EFF6FF" },
              ]}
            >
              <MaterialIcons
                name="card-giftcard"
                size={27}
                color="#2563EB"
              />
            </View>

            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>
                Donate
              </Text>

              <Text style={styles.actionDescription}>
                Give items to someone in need
              </Text>
            </View>

            <MaterialIcons
              name="chevron-right"
              size={22}
              color="#94A3B8"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              navigation.navigate("RequestHelp")
            }
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: "#F0FDF4" },
              ]}
            >
              <MaterialIcons
                name="help-outline"
                size={27}
                color="#22C55E"
              />
            </View>

            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>
                Request Help
              </Text>

              <Text style={styles.actionDescription}>
                Ask your community for support
              </Text>
            </View>

            <MaterialIcons
              name="chevron-right"
              size={22}
              color="#94A3B8"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              navigation.navigate("Campaigns")
            }
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: "#FFF7ED" },
              ]}
            >
              <MaterialIcons
                name="campaign"
                size={27}
                color="#F97316"
              />
            </View>

            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>
                Campaigns
              </Text>

              <Text style={styles.actionDescription}>
                Support community initiatives
              </Text>
            </View>

            <MaterialIcons
              name="chevron-right"
              size={22}
              color="#94A3B8"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              navigation.navigate("Charities")
            }
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: "#F5F3FF" },
              ]}
            >
              <MaterialIcons
                name="groups"
                size={27}
                color="#7C3AED"
              />
            </View>

            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>
                Charities
              </Text>

              <Text style={styles.actionDescription}>
                Discover organisations near you
              </Text>
            </View>

            <MaterialIcons
              name="chevron-right"
              size={22}
              color="#94A3B8"
            />
          </TouchableOpacity>

        </View>

        {/* =========================================
            URGENT NEED
        ========================================= */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Urgent Need
            </Text>

            <Text style={styles.sectionSubtitle}>
              Someone in your community needs help
            </Text>
          </View>

          <View style={styles.urgentLabel}>
            <MaterialIcons
              name="priority-high"
              size={14}
              color="#DC2626"
            />

            <Text style={styles.urgentLabelText}>
              URGENT
            </Text>
          </View>
        </View>

        <View style={styles.urgentCard}>
          <View style={styles.urgentIconBox}>
            <MaterialIcons
              name="checkroom"
              size={30}
              color="#2563EB"
            />
          </View>

          <View style={styles.urgentContent}>
            <Text style={styles.needTitle}>
              Winter Products Needed
            </Text>

            <View style={styles.locationRow}>
              <MaterialIcons
                name="location-on"
                size={16}
                color="#64748B"
              />

              <Text style={styles.needLocation}>
                Johannesburg Community Shelter
              </Text>
            </View>

            <Text style={styles.needDescription}>
              Help provide warm clothing and winter
              essentials to people in need.
            </Text>

            <TouchableOpacity
              style={styles.donateBtn}
              onPress={() =>
                navigation.navigate("Donate")
              }
            >
              <Text style={styles.donateBtnText}>
                Donate Now
              </Text>

              <MaterialIcons
                name="arrow-forward"
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* =========================================
            RECENT DONATIONS
        ========================================= */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Recent Donations
            </Text>

            <Text style={styles.sectionSubtitle}>
              Latest items shared by the community
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate("MyActivity")
            }
          >
            <Text style={styles.viewAllText}>
              View All
            </Text>
          </TouchableOpacity>
        </View>

        {donations.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <MaterialIcons
                name="card-giftcard"
                size={27}
                color="#94A3B8"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No donations yet
            </Text>

            <Text style={styles.emptyText}>
              Be the first person to share something
              with your community.
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
                    <MaterialIcons
                      name="image-not-supported"
                      size={25}
                      color="#94A3B8"
                    />

                    <Text style={styles.noImageText}>
                      No image
                    </Text>
                  </View>
                )}

                <View style={styles.donationContent}>

                  <View style={styles.donationTopRow}>
                    <View style={styles.itemTitleRow}>
                      <View style={styles.smallIconBox}>
                        <MaterialIcons
                          name="card-giftcard"
                          size={17}
                          color="#2563EB"
                        />
                      </View>

                      <Text
                        style={styles.donationTitle}
                        numberOfLines={1}
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

                  <View style={styles.metaRow}>
                    <MaterialIcons
                      name="category"
                      size={15}
                      color="#7C3AED"
                    />

                    <Text style={styles.donationCategory}>
                      {donation.category}
                    </Text>

                    <View style={styles.metaDot} />

                    <MaterialIcons
                      name="verified"
                      size={15}
                      color="#22C55E"
                    />

                    <Text style={styles.conditionText}>
                      {donation.condition}
                    </Text>
                  </View>

                  <Text
                    style={styles.donationDescription}
                    numberOfLines={2}
                  >
                    {donation.description}
                  </Text>

                  <View style={styles.infoRow}>
                    <MaterialIcons
                      name="location-on"
                      size={16}
                      color="#64748B"
                    />

                    <Text
                      style={styles.donationLocation}
                      numberOfLines={1}
                    >
                      {donation.address}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <MaterialIcons
                      name="local-shipping"
                      size={16}
                      color="#64748B"
                    />

                    <Text style={styles.donationMethod}>
                      {donation.deliveryMethod}
                    </Text>
                  </View>

                </View>
              </View>
            );
          })
        )}

        {/* =========================================
            RECENT HELP REQUESTS
        ========================================= */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              People Who Need Help
            </Text>

            <Text style={styles.sectionSubtitle}>
              You could make someone's day better
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate("RequestHelp")
            }
          >
            <Text style={styles.viewAllText}>
              View All
            </Text>
          </TouchableOpacity>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <MaterialIcons
                name="volunteer-activism"
                size={27}
                color="#94A3B8"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No help requests
            </Text>

            <Text style={styles.emptyText}>
              There are currently no community requests
              waiting for support.
            </Text>
          </View>
        ) : (
          requests.map((request) => {
            const isOwnRequest =
              request.userId ===
              auth.currentUser?.uid;

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

                  <View style={styles.requestTitleArea}>
                    <View style={styles.requestIconBox}>
                      <MaterialIcons
                        name="volunteer-activism"
                        size={20}
                        color="#22C55E"
                      />
                    </View>

                    <Text
                      style={styles.requestTitle}
                      numberOfLines={2}
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
                    {request.urgency === "Urgent" && (
                      <MaterialIcons
                        name="priority-high"
                        size={13}
                        color="#DC2626"
                      />
                    )}

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

                <View style={styles.requestMetaRow}>
                  <MaterialIcons
                    name="category"
                    size={15}
                    color="#7C3AED"
                  />

                  <Text style={styles.requestCategory}>
                    {request.category}
                  </Text>

                  <View style={styles.metaDot} />

                  <MaterialIcons
                    name="inventory-2"
                    size={15}
                    color="#64748B"
                  />

                  <Text style={styles.quantityText}>
                    Qty: {request.quantity}
                  </Text>
                </View>

                <Text
                  style={styles.requestDescription}
                  numberOfLines={2}
                >
                  {request.description}
                </Text>

                <View style={styles.infoRow}>
                  <MaterialIcons
                    name="location-on"
                    size={16}
                    color="#64748B"
                  />

                  <Text
                    style={styles.requestLocation}
                    numberOfLines={1}
                  >
                    {request.location}
                  </Text>
                </View>

                <View style={styles.requestStatusRow}>
                  <View style={styles.statusLabelRow}>
                    <MaterialIcons
                      name="info-outline"
                      size={15}
                      color="#64748B"
                    />

                    <Text style={styles.requestStatusLabel}>
                      Status
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
                      {request.status || "Pending"}
                    </Text>
                  </View>
                </View>

                {isOwnRequest ? (
                  <View style={styles.ownRequestNotice}>
                    <MaterialIcons
                      name="person"
                      size={17}
                      color="#2563EB"
                    />

                    <Text
                      style={styles.ownRequestNoticeText}
                    >
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
                      <View
                        style={
                          styles.loadingButtonContent
                        }
                      >
                        <ActivityIndicator
                          size="small"
                          color="#FFFFFF"
                        />

                        <Text
                          style={
                            styles.offerHelpButtonText
                          }
                        >
                          Starting Chat...
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={
                          styles.offerHelpButtonContent
                        }
                      >
                        <MaterialIcons
                          name="chat"
                          size={19}
                          color="#FFFFFF"
                        />

                        <Text
                          style={
                            styles.offerHelpButtonText
                          }
                        >
                          Offer Help
                        </Text>

                        <MaterialIcons
                          name="arrow-forward"
                          size={18}
                          color="#FFFFFF"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.rejectedNotice}>
                    <MaterialIcons
                      name="block"
                      size={17}
                      color="#DC2626"
                    />

                    <Text
                      style={styles.rejectedNoticeText}
                    >
                      This request is no longer available
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* =========================================
            CHARITIES
        ========================================= */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Discover Organisations
            </Text>

            <Text style={styles.sectionSubtitle}>
              Support organisations making a difference
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate("Charities")
            }
          >
            <Text style={styles.viewAllText}>
              View All
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.charityCard}
          onPress={() =>
            navigation.navigate("Charities")
          }
        >
          <View
            style={[
              styles.charityIcon,
              { backgroundColor: "#EFF6FF" },
            ]}
          >
            <MaterialIcons
              name="groups"
              size={27}
              color="#2563EB"
            />
          </View>

          <View style={styles.charityContent}>
            <View style={styles.charityNameRow}>
              <Text style={styles.charityName}>
                Ubuntu Community Center
              </Text>

              <MaterialIcons
                name="verified"
                size={17}
                color="#22C55E"
              />
            </View>

            <View style={styles.charityLocationRow}>
              <MaterialIcons
                name="location-on"
                size={15}
                color="#64748B"
              />

              <Text style={styles.charityAddress}>
                2.5 km away
              </Text>
            </View>

            <Text style={styles.charityDescription}>
              Community support, food assistance and
              essential services.
            </Text>
          </View>

          <MaterialIcons
            name="chevron-right"
            size={23}
            color="#94A3B8"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.charityCard}
          onPress={() =>
            navigation.navigate("Charities")
          }
        >
          <View
            style={[
              styles.charityIcon,
              { backgroundColor: "#F5F3FF" },
            ]}
          >
            <MaterialIcons
              name="volunteer-activism"
              size={27}
              color="#7C3AED"
            />
          </View>

          <View style={styles.charityContent}>
            <View style={styles.charityNameRow}>
              <Text style={styles.charityName}>
                Hope Foundation
              </Text>

              <MaterialIcons
                name="verified"
                size={17}
                color="#22C55E"
              />
            </View>

            <View style={styles.charityLocationRow}>
              <MaterialIcons
                name="location-on"
                size={15}
                color="#64748B"
              />

              <Text style={styles.charityAddress}>
                4.1 km away
              </Text>
            </View>

            <Text style={styles.charityDescription}>
              Supporting families through food,
              clothing and community programmes.
            </Text>
          </View>

          <MaterialIcons
            name="chevron-right"
            size={23}
            color="#94A3B8"
          />
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={{ height: 70 }} />

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

  scrollContent: {
    paddingBottom: 20,
  },

  /* =========================================
     HEADER
  ========================================= */

  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerLeft: {
    flex: 1,
    paddingRight: 15,
  },

  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  greeting: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },

  waveIcon: {
    marginLeft: 6,
  },

  name: {
    color: "#0F172A",
    fontSize: 29,
    fontWeight: "800",
    marginTop: 3,
  },

  headerSubtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 5,
  },

  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    position: "relative",
  },

  notificationDot: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    top: 10,
    right: 10,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  /* =========================================
     HERO
  ========================================= */

  heroCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 26,
    padding: 22,
    backgroundColor: "#7C3AED",
    shadowColor: "#7C3AED",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  heroText: {
    flex: 1,
  },

  heroSmallTitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 3,
  },

  heroDescription: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 17,
    marginBottom: 18,
  },

  heroButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  heroButtonText: {
    color: "#7C3AED",
    fontSize: 14,
    fontWeight: "800",
    marginRight: 7,
  },

  /* =========================================
     SECTION HEADERS
  ========================================= */

  sectionHeader: {
    marginHorizontal: 20,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  sectionTitle: {
    color: "#0F172A",
    fontSize: 19,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },

  viewAllText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
  },

  /* =========================================
     STATS
  ========================================= */

  statsCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 7,
  },

  statNumber: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "800",
  },

  statLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },

  statDivider: {
    width: 1,
    height: 55,
    backgroundColor: "#E2E8F0",
  },

  /* =========================================
     QUICK ACTIONS
  ========================================= */

  actionGrid: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },

  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    padding: 15,
    marginBottom: 11,
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  actionTextContainer: {
    flex: 1,
    paddingRight: 8,
  },

  actionTitle: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "800",
  },

  actionDescription: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  /* =========================================
     URGENT NEED
  ========================================= */

  urgentLabel: {
    backgroundColor: "#FEE2E2",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
  },

  urgentLabelText: {
    color: "#DC2626",
    fontSize: 9,
    fontWeight: "900",
    marginLeft: 3,
  },

  urgentCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 23,
    padding: 17,
    marginBottom: 30,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#FECACA",
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },

  urgentIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  urgentContent: {
    flex: 1,
  },

  needTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  needLocation: {
    color: "#64748B",
    fontSize: 11,
    marginLeft: 4,
    flex: 1,
  },

  needDescription: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
    marginBottom: 13,
  },

  donateBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 13,
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  donateBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    marginRight: 7,
  },

  /* =========================================
     DONATIONS
  ========================================= */

  donationCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  donationImage: {
    width: "100%",
    height: 175,
    backgroundColor: "#E2E8F0",
  },

  noImageBox: {
    width: "100%",
    height: 130,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },

  noImageText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 5,
  },

  donationContent: {
    padding: 16,
  },

  donationTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  itemTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },

  smallIconBox: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  donationTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 10,
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

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
    marginBottom: 8,
  },

  donationCategory: {
    color: "#7C3AED",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 4,
  },

  conditionText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 8,
  },

  donationDescription: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  donationLocation: {
    color: "#475569",
    fontSize: 11,
    marginLeft: 5,
    flex: 1,
  },

  donationMethod: {
    color: "#64748B",
    fontSize: 11,
    marginLeft: 5,
  },

  /* =========================================
     EMPTY STATES
  ========================================= */

  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 25,
    alignItems: "center",
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  emptyTitle: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "800",
  },

  emptyText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 5,
    maxWidth: 280,
  },

  /* =========================================
     HELP REQUESTS
  ========================================= */

  requestCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
    borderLeftColor: "#22C55E",
  },

  requestTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  requestTitleArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },

  requestIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  requestTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
  },

  requestBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
  },

  requestBadgeText: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "800",
  },

  urgentBadge: {
    backgroundColor: "#FEE2E2",
  },

  urgentBadgeText: {
    color: "#DC2626",
    marginLeft: 2,
  },

  requestMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
    marginBottom: 8,
  },

  requestCategory: {
    color: "#7C3AED",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 4,
  },

  quantityText: {
    color: "#64748B",
    fontSize: 11,
    marginLeft: 4,
    fontWeight: "600",
  },

  requestDescription: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 9,
  },

  requestLocation: {
    color: "#475569",
    fontSize: 11,
    marginLeft: 5,
    flex: 1,
  },

  requestStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  statusLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  requestStatusLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },

  offerHelpButton: {
    backgroundColor: "#22C55E",
    borderRadius: 13,
    minHeight: 46,
    marginTop: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  offerHelpButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  offerHelpButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    marginHorizontal: 7,
  },

  disabledButton: {
    opacity: 0.65,
  },

  loadingButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  ownRequestNotice: {
    backgroundColor: "#EFF6FF",
    borderRadius: 13,
    minHeight: 43,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },

  ownRequestNoticeText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 6,
  },

  rejectedNotice: {
    backgroundColor: "#FEF2F2",
    borderRadius: 13,
    minHeight: 43,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },

  rejectedNoticeText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 6,
  },

  /* =========================================
     CHARITIES
  ========================================= */

  charityCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 21,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  charityIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  charityContent: {
    flex: 1,
    paddingRight: 8,
  },

  charityNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  charityName: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
    marginRight: 5,
  },

  charityLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  charityAddress: {
    color: "#64748B",
    fontSize: 11,
    marginLeft: 3,
  },

  charityDescription: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
});