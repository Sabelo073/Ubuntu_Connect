import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

// Normalize text for comparison.
const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

// Treat equivalent category names as the same category.
const getCategory = (item) => {
  const category = normalize(
    item?.category ||
      item?.itemCategory ||
      item?.type ||
      item?.donationCategory ||
      item?.requestCategory
  );

  const categoryAliases = {
    clothes: "clothing",
    clothing: "clothing",
    foods: "food",
    food: "food",
  };

  return categoryAliases[category] || category;
};

// Normalize item names so t-shirt, tshirt and tshirts match.
const normalizeItemName = (value) => {
  const item = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, "");

  const itemAliases = {
    tshirt: "tshirt",
    tshirts: "tshirt",
  };

  return itemAliases[item] || item;
};

// Find the specific item name in a donation or request.
const getSpecificItemName = (item, isDonation = false) => {
  const possibleNames = isDonation
    ? [
        item?.itemName,
        item?.donationName,
        item?.productName,
        item?.itemType,
        item?.title,
        item?.item,
        item?.name,
      ]
    : [
        item?.itemNeeded,
        item?.requestedItem,
        item?.itemName,
        item?.productName,
        item?.itemType,
        item?.requestName,
        item?.title,
        item?.item,
        item?.name,
      ];

  const itemName = possibleNames.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
  );

  return normalizeItemName(itemName);
};

// Get the display name for a donation or request.
const getName = (item, isDonation = false) => {
  const possibleNames = isDonation
    ? [
        item?.itemName,
        item?.donationName,
        item?.productName,
        item?.itemType,
        item?.title,
        item?.item,
        item?.name,
      ]
    : [
        item?.itemNeeded,
        item?.requestedItem,
        item?.itemName,
        item?.productName,
        item?.itemType,
        item?.requestName,
        item?.title,
        item?.item,
        item?.name,
      ];

  return (
    possibleNames.find(
      (value) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    ) ||
    item?.category ||
    (isDonation ? "Donation" : "Help request")
  );
};

// Find the owner of a document.
const getOwnerId = (item) =>
  item?.userId ||
  item?.createdBy ||
  item?.ownerId ||
  item?.donorId ||
  item?.recipientId ||
  item?.uid ||
  "";

// Check whether a donation is available.
const isDonationAvailable = (donation) => {
  const status = normalize(donation?.status);

  const unavailableStatuses = [
    "claimed",
    "collected",
    "completed",
    "cancelled",
    "canceled",
    "unavailable",
    "deleted",
  ];

  return !unavailableStatuses.includes(status);
};

// Check whether a request is active.
const isRequestActive = (request) => {
  const status = normalize(request?.status);

  const inactiveStatuses = [
    "completed",
    "fulfilled",
    "cancelled",
    "canceled",
    "closed",
    "rejected",
    "deleted",
  ];

  return !inactiveStatuses.includes(status);
};

export default function CommunityMatching() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [interests, setInterests] = useState([]);
  const [donorInterests, setDonorInterests] = useState([]);

  const [loadingDonations, setLoadingDonations] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingInterests, setLoadingInterests] = useState(true);
  const [loadingDonorInterests, setLoadingDonorInterests] =
    useState(true);

  const [activeTab, setActiveTab] = useState("Matches");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submittingId, setSubmittingId] = useState("");
  const [respondingId, setRespondingId] = useState("");

  /* Space taken by the phone's system buttons / gesture bar.
     This screen sits inside the bottom tabs, which already handle it,
     so only add the inset when there is no tab bar. */
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const bottomPadding = tabBarHeight
    ? 28
    : Math.max(insets.bottom, 8) + 28;

  // Listen for authentication changes.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  // Listen for donations.
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "donations"),
      (snapshot) => {
        setDonations(
          snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );
        setLoadingDonations(false);
      },
      (error) => {
        console.error("Error loading donations:", error);
        setErrorMessage(
          "Unable to load donations. Check your Firebase permissions."
        );
        setLoadingDonations(false);
      }
    );

    return unsubscribe;
  }, []);

  // Listen for requests.
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "requests"),
      (snapshot) => {
        setRequests(
          snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );
        setLoadingRequests(false);
      },
      (error) => {
        console.error("Error loading requests:", error);
        setErrorMessage(
          "Unable to load requests. Check your Firebase permissions."
        );
        setLoadingRequests(false);
      }
    );

    return unsubscribe;
  }, []);

  // Listen for interests expressed by the signed-in recipient.
  useEffect(() => {
    if (!currentUser?.uid) {
      setInterests([]);
      setLoadingInterests(false);
      return;
    }

    setLoadingInterests(true);

    const interestsQuery = query(
      collection(db, "matches"),
      where("recipientId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      interestsQuery,
      (snapshot) => {
        setInterests(
          snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );
        setLoadingInterests(false);
      },
      (error) => {
        console.error("Error loading recipient interests:", error);
        setErrorMessage(
          "Unable to load your interests. Check your Firebase permissions."
        );
        setLoadingInterests(false);
      }
    );

    return unsubscribe;
  }, [currentUser?.uid]);

  // Listen for interests received by the signed-in donor.
  useEffect(() => {
    if (!currentUser?.uid) {
      setDonorInterests([]);
      setLoadingDonorInterests(false);
      return;
    }

    setLoadingDonorInterests(true);

    const donorQuery = query(
      collection(db, "matches"),
      where("donorId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      donorQuery,
      (snapshot) => {
        setDonorInterests(
          snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );
        setLoadingDonorInterests(false);
      },
      (error) => {
        console.error("Error loading donor interests:", error);
        setErrorMessage(
          "Unable to load interests received by this donor."
        );
        setLoadingDonorInterests(false);
      }
    );

    return unsubscribe;
  }, [currentUser?.uid]);

  // Filter available donations and active requests.
  const availableDonations = useMemo(
    () => donations.filter(isDonationAvailable),
    [donations]
  );

  const activeRequests = useMemo(
    () => requests.filter(isRequestActive),
    [requests]
  );

  // Match items using normalized categories and item names.
  const generatedMatches = useMemo(() => {
    const results = [];

    availableDonations.forEach((donation) => {
      activeRequests.forEach((request) => {
        const donationCategory = getCategory(donation);
        const requestCategory = getCategory(request);

        const donationItem = getSpecificItemName(donation, true);
        const requestItem = getSpecificItemName(request, false);

        const donorId = getOwnerId(donation);
        const recipientId = getOwnerId(request);

        if (!donationCategory || !requestCategory) return;
        if (!donationItem || !requestItem) return;
        if (donationCategory !== requestCategory) return;
        if (donationItem !== requestItem) return;

        // Prevent users from matching their own donations.
        if (donorId && recipientId && donorId === recipientId) {
          return;
        }

        results.push({
          id: `${donation.id}_${request.id}`,
          donation,
          request,
          donationId: donation.id,
          requestId: request.id,
          donationName: getName(donation, true),
          requestName: getName(request, false),
          category: donationCategory,
          donorId,
          recipientId,
        });
      });
    });

    return results;
  }, [availableDonations, activeRequests]);

  // Show matches for requests owned by the signed-in user.
  const userMatches = useMemo(() => {
    if (!currentUser?.uid) return [];

    return generatedMatches.filter(
      (match) => match.recipientId === currentUser.uid
    );
  }, [generatedMatches, currentUser?.uid]);

  // Identify matches where the current recipient already expressed interest.
  const interestedMatchIds = useMemo(
    () =>
      new Set(
        interests.map(
          (interest) =>
            `${interest.donationId}_${interest.requestId}`
        )
      ),
    [interests]
  );

  // Express interest in a matching donation.
  const expressInterest = async (match) => {
    if (!currentUser?.uid) {
      setErrorMessage("Please sign in before expressing interest.");
      return;
    }

    if (match.recipientId !== currentUser.uid) {
      setErrorMessage(
        "You can only express interest in your own request."
      );
      return;
    }

    if (!match.donorId || !match.requestId || !match.donationId) {
      setErrorMessage(
        "This match is missing required owner or document information."
      );
      return;
    }

    if (match.donorId === currentUser.uid) {
      setErrorMessage("You cannot express interest in your own donation.");
      return;
    }

    const matchKey = `${match.donationId}_${match.requestId}`;

    if (interestedMatchIds.has(matchKey)) {
      setSuccessMessage("You have already expressed interest.");
      return;
    }

    setSubmittingId(match.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const interestId =
        `${match.donationId}_${match.requestId}_${currentUser.uid}`;

      await setDoc(doc(db, "matches", interestId), {
        donationId: match.donationId,
        donationName: String(match.donationName),
        donorId: match.donorId,
        requestId: match.requestId,
        requestName: String(match.requestName),
        recipientId: currentUser.uid,
        category: match.category,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setSuccessMessage(
        "Your interest has been recorded successfully."
      );
    } catch (error) {
      console.error(
        "Error expressing interest:",
        error.code,
        error.message
      );

      setErrorMessage(
        `Firebase error: ${error.code || "unknown"} - ${
          error.message || "Could not save your interest."
        }`
      );
    } finally {
      setSubmittingId("");
    }
  };

  // Allow the donor to accept or decline a pending interest.
  // On acceptance, create the chat and notify the recipient.
  const respondToInterest = async (interest, response) => {
    if (!currentUser?.uid) {
      setErrorMessage("Please sign in first.");
      return;
    }

    if (interest.donorId !== currentUser.uid) {
      setErrorMessage(
        "Only the donor can respond to this interest."
      );
      return;
    }

    if (!["accepted", "declined"].includes(response)) {
      setErrorMessage("Invalid response.");
      return;
    }

    if (interest.status !== "pending") {
      setErrorMessage(
        "You have already responded to this interest."
      );
      return;
    }

    if (
      !interest.id ||
      !interest.recipientId ||
      !interest.donationId
    ) {
      setErrorMessage(
        "The interest is missing required information."
      );
      return;
    }

    setRespondingId(interest.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const donorName =
        currentUser.displayName ||
        currentUser.email ||
        "Ubuntu Connect User";

      const chatId = interest.id;
      const notificationId = `${interest.id}_${response}`;

      console.log("RESPONDING TO INTEREST:", {
        matchId: interest.id,
        response,
        donorId: currentUser.uid,
        recipientId: interest.recipientId,
      });

      // 1. Update the match with the donor's decision.
      await updateDoc(doc(db, "matches", interest.id), {
        status: response,
        respondedBy: currentUser.uid,
        respondedAt: serverTimestamp(),
      });

      // 2. If accepted, create or reuse the private chat.
      if (response === "accepted") {
        await setDoc(
          doc(db, "chats", chatId),
          {
            participantIds: [
              interest.donorId,
              interest.recipientId,
            ],
            matchId: interest.id,
            donationId: interest.donationId,
            createdAt: serverTimestamp(),
            unreadCounts: {
              [interest.donorId]: 0,
              [interest.recipientId]: 0,
            },
          },
          { merge: true }
        );

        console.log("CHAT CREATED OR UPDATED:", chatId);
      }

      // 3. Create a notification for the recipient.
      const notification = {
        userId: interest.recipientId,
        senderId: currentUser.uid,
        senderName: donorName,
        title:
          response === "accepted"
            ? "Donation Interest Accepted"
            : "Donation Interest Declined",
        message:
          response === "accepted"
            ? `Your interest in ${
                interest.donationName || "this donation"
              } was accepted. You can now chat with the donor.`
            : `Your interest in ${
                interest.donationName || "this donation"
              } was declined.`,
        type: "donation",
        status: response,
        matchId: interest.id,
        read: false,
        createdAt: serverTimestamp(),
      };

      // These fields are essential for opening Chat.jsx.
      if (response === "accepted") {
        notification.chatId = chatId;
        notification.otherUserId = currentUser.uid;
        notification.otherUserName = donorName;
      }

      console.log("CREATING NOTIFICATION:", {
        notificationId,
        type: notification.type,
        status: notification.status,
        chatId: notification.chatId,
        otherUserId: notification.otherUserId,
        recipientId: notification.userId,
      });

      await setDoc(
        doc(db, "notifications", notificationId),
        notification
      );

      console.log("NOTIFICATION CREATED:", notificationId);

      setSuccessMessage(
        response === "accepted"
          ? "Interest accepted. The chat was created and the recipient was notified."
          : "Interest declined. The recipient was notified."
      );
    } catch (error) {
      console.error(
        "ERROR RESPONDING TO INTEREST:",
        error.code,
        error.message
      );

      setErrorMessage(
        `The response could not be completed: ${
          error.code || error.message || "Unknown error"
        }. Check the console and Firestore rules.`
      );
    } finally {
      setRespondingId("");
    }
  };


  const isLoading =
    authLoading ||
    loadingDonations ||
    loadingRequests ||
    loadingInterests;

  // Render a donation card.
  const renderDonationCard = (donation) => (
    <View key={donation.id} style={styles.card}>
      <View style={styles.cardIcon}>
        <MaterialIcons
          name="volunteer-activism"
          size={26}
          color="#2563EB"
        />
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>
          {getName(donation, true)}
        </Text>

        <Text style={styles.cardText}>
          Category:{" "}
          {donation.category ||
            donation.itemCategory ||
            donation.type ||
            "Not specified"}
        </Text>

        {donation.description ? (
          <Text style={styles.cardText}>
            {donation.description}
          </Text>
        ) : null}

        <Text style={styles.statusText}>
          Status: {donation.status || "Available"}
        </Text>
      </View>
    </View>
  );

  // Render a request card.
  const renderRequestCard = (request) => (
    <View key={request.id} style={styles.card}>
      <View style={styles.cardIcon}>
        <MaterialIcons
          name="volunteer-activism"
          size={26}
          color="#7C3AED"
        />
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>
          {getName(request, false)}
        </Text>

        <Text style={styles.cardText}>
          Category:{" "}
          {request.category ||
            request.itemCategory ||
            request.type ||
            "Not specified"}
        </Text>

        {request.description ? (
          <Text style={styles.cardText}>
            {request.description}
          </Text>
        ) : null}

        <Text style={styles.statusText}>
          Status: {request.status || "Active"}
        </Text>
      </View>
    </View>
  );

  // Render a match for the recipient.
  const renderMatchCard = (match) => {
    const alreadyInterested = interestedMatchIds.has(
      `${match.donationId}_${match.requestId}`
    );

    return (
      <View key={match.id} style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <MaterialIcons
            name="check-circle"
            size={25}
            color="#16A34A"
          />
          <Text style={styles.matchTitle}>
            Matching items found!
          </Text>
        </View>

        <View style={styles.matchDetail}>
          <Text style={styles.detailLabel}>Donation</Text>
          <Text style={styles.detailValue}>
            {match.donationName}
          </Text>
        </View>

        <View style={styles.matchDetail}>
          <Text style={styles.detailLabel}>Request</Text>
          <Text style={styles.detailValue}>
            {match.requestName}
          </Text>
        </View>

        <View style={styles.matchDetail}>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.detailValue}>
            {match.category}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.interestButton,
            (alreadyInterested || submittingId === match.id) &&
              styles.disabledButton,
          ]}
          onPress={() => expressInterest(match)}
          disabled={
            alreadyInterested || submittingId === match.id
          }
          activeOpacity={0.8}
        >
          {submittingId === match.id ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons
                name={alreadyInterested ? "check" : "favorite"}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.interestButtonText}>
                {alreadyInterested
                  ? "Interest Sent"
                  : "I'm Interested"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Render an interest received by the donor.
  const renderDonorInterestCard = (interest) => {
    const status = normalize(interest.status || "pending");
    const isPending = status === "pending";
    const isResponding = respondingId === interest.id;

    return (
      <View key={interest.id} style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <MaterialIcons
            name="favorite"
            size={24}
            color="#7C3AED"
          />
          <Text style={styles.matchTitle}>
            Someone is interested!
          </Text>
        </View>

        <View style={styles.matchDetail}>
          <Text style={styles.detailLabel}>Your donation</Text>
          <Text style={styles.detailValue}>
            {interest.donationName || "Donation"}
          </Text>
        </View>

        <View style={styles.matchDetail}>
          <Text style={styles.detailLabel}>Requested item</Text>
          <Text style={styles.detailValue}>
            {interest.requestName || "Help request"}
          </Text>
        </View>

        <View style={styles.matchDetail}>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.detailValue}>
            {interest.category || "Not specified"}
          </Text>
        </View>

        <Text style={styles.statusText}>
          Status: {status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>

        {isPending ? (
          <View style={styles.responseButtons}>
            <TouchableOpacity
              style={[
                styles.acceptButton,
                isResponding && styles.disabledButton,
              ]}
              disabled={isResponding}
              onPress={() => respondToInterest(interest, "accepted")}
              activeOpacity={0.8}
            >
              {isResponding ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons
                    name="check"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.interestButtonText}>
                    Accept
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.declineButton,
                isResponding && styles.disabledButton,
              ]}
              disabled={isResponding}
              onPress={() => respondToInterest(interest, "declined")}
              activeOpacity={0.8}
            >
              {isResponding ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons
                    name="close"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.interestButtonText}>
                    Decline
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  if (authLoading) {
    return (
      <SafeAreaView
        style={styles.centered}
        edges={["top", "bottom", "left", "right"]}
      >
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>
          Checking your account...
        </Text>
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView
        style={styles.centered}
        edges={["top", "bottom", "left", "right"]}
      >
        <StatusBar style="dark" />
        <MaterialIcons
          name="account-circle"
          size={54}
          color="#64748B"
        />
        <Text style={styles.emptyTitle}>Sign in required</Text>
        <Text style={styles.emptyText}>
          Please sign in to view community matches.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      {/* Dark icons (time, battery, wifi, sim) on the light status area */}
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Community Matching</Text>

        <Text style={styles.pageSubtitle}>
          Connect donations with people who need them.
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <MaterialIcons
              name="volunteer-activism"
              size={25}
              color="#2563EB"
            />
            <Text style={styles.summaryNumber}>
              {availableDonations.length}
            </Text>
            <Text style={styles.summaryLabel}>Donations</Text>
          </View>

          <View style={styles.summaryCard}>
            <MaterialIcons
              name="favorite-border"
              size={25}
              color="#7C3AED"
            />
            <Text style={styles.summaryNumber}>
              {activeRequests.length}
            </Text>
            <Text style={styles.summaryLabel}>Requests</Text>
          </View>

          <View style={styles.summaryCard}>
            <MaterialIcons
              name="check-circle-outline"
              size={25}
              color="#16A34A"
            />
            <Text style={styles.summaryNumber}>
              {userMatches.length}
            </Text>
            <Text style={styles.summaryLabel}>My Matches</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          {["Matches", "Donations", "Requests", "My Interests"].map(
            (tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton,
                  activeTab === tab && styles.activeTabButton,
                ]}
                onPress={() => {
                  setActiveTab(tab);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <MaterialIcons
              name="error-outline"
              size={20}
              color="#B91C1C"
            />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View style={styles.successBox}>
            <MaterialIcons
              name="check-circle-outline"
              size={20}
              color="#166534"
            />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>
              Loading community data...
            </Text>
          </View>
        ) : (
          <>
            {activeTab === "Matches" && (
              <View>
                <Text style={styles.sectionTitle}>Your Matches</Text>

                <Text style={styles.sectionSubtitle}>
                  Donations matching the category and item in your
                  requests.
                </Text>

                {userMatches.length > 0 ? (
                  userMatches.map(renderMatchCard)
                ) : (
                  <View style={styles.emptyCard}>
                    <MaterialIcons
                      name="search"
                      size={45}
                      color="#94A3B8"
                    />
                    <Text style={styles.emptyTitle}>
                      No matches found
                    </Text>
                    <Text style={styles.emptyText}>
                      A match appears when an available donation and
                      your active request have the same category and
                      item name. Check that the records are loading
                      and the item names are recognized.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === "Donations" && (
              <View>
                <Text style={styles.sectionTitle}>
                  Available Donations
                </Text>

                {availableDonations.length > 0 ? (
                  availableDonations.map(renderDonationCard)
                ) : (
                  <View style={styles.emptyCard}>
                    <MaterialIcons
                      name="volunteer-activism"
                      size={45}
                      color="#94A3B8"
                    />
                    <Text style={styles.emptyTitle}>
                      No donations available
                    </Text>
                    <Text style={styles.emptyText}>
                      Available donations will appear here.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === "Requests" && (
              <View>
                <Text style={styles.sectionTitle}>
                  Active Requests
                </Text>

                {activeRequests.length > 0 ? (
                  activeRequests.map(renderRequestCard)
                ) : (
                  <View style={styles.emptyCard}>
                    <MaterialIcons
                      name="list-alt"
                      size={45}
                      color="#94A3B8"
                    />
                    <Text style={styles.emptyTitle}>
                      No active requests
                    </Text>
                    <Text style={styles.emptyText}>
                      Active community requests will appear here.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === "My Interests" && (
              <View>
                <Text style={styles.sectionTitle}>
                  Interests in My Donations
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Review people interested in your donations and
                  accept or decline their requests.
                </Text>

                {loadingDonorInterests ? (
                  <ActivityIndicator
                    size="large"
                    color="#2563EB"
                  />
                ) : donorInterests.length > 0 ? (
                  donorInterests.map(renderDonorInterestCard)
                ) : (
                  <View style={styles.emptyCard}>
                    <MaterialIcons
                      name="favorite-border"
                      size={45}
                      color="#94A3B8"
                    />
                    <Text style={styles.emptyTitle}>
                      No interests received yet
                    </Text>
                    <Text style={styles.emptyText}>
                      When someone expresses interest in your
                      donation, their interest will appear here.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        <Text style={styles.footerText}>
          Community Matching helps connect available donations
          with community needs.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 35,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F8FAFC",
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 20,
    lineHeight: 21,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
    textAlign: "center",
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    gap: 3,
  },
  tabButton: {
    flexGrow: 1,
    flexBasis: "22%",
    paddingHorizontal: 8,
    paddingVertical: 11,
    borderRadius: 9,
    alignItems: "center",
  },
  activeTabButton: {
    backgroundColor: "#FFFFFF",
    elevation: 1,
  },
  tabText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  activeTabText: {
    color: "#1D4ED8",
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
    marginBottom: 15,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 7,
  },
  cardText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 8,
  },
  matchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  matchHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 8,
  },
  matchTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#166534",
  },
  matchDetail: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "700",
  },
  interestButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  responseButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  declineButton: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  disabledButton: {
    backgroundColor: "#64748B",
  },
  interestButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 25,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 7,
  },
  emptyText: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
    textAlign: "center",
  },
  loadingContainer: {
    padding: 35,
    alignItems: "center",
  },
  loadingText: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
    marginBottom: 15,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#B91C1C",
    lineHeight: 19,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    padding: 12,
    marginBottom: 15,
    gap: 8,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: "#166534",
    lineHeight: 19,
  },
  footerText: {
    color: "#94A3B8",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 25,
  },
});