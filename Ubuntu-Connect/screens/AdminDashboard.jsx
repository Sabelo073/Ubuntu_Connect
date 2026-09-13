import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { signOut } from "firebase/auth";

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
  updateDoc,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

const AdminDashboard = ({ navigation }) => {
  const [adminData, setAdminData] = useState(null);
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [charities, setCharities] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [processingId, setProcessingId] = useState(null);

  /*
    Displays a message on Web, Android, and iOS.
  */
  const showMessage = (title, message) => {
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
    Checks whether the logged-in user is an admin.
  */
  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      navigation.replace("Login");
      return;
    }

    const checkAdminAccess = async () => {
      try {
        const userReference = doc(
          db,
          "users",
          user.uid
        );

        const userSnapshot = await getDoc(
          userReference
        );

        if (!userSnapshot.exists()) {
          showMessage(
            "Access Denied",
            "Your user profile could not be found."
          );

          navigation.replace("Login");
          return;
        }

        const userData = userSnapshot.data();
        const userRole = userData.role?.trim();

        if (userRole !== "Admin") {
          showMessage(
            "Access Denied",
            "Only administrators can access this dashboard."
          );

          navigation.replace("MainTabs");
          return;
        }

        setAdminData(userData);
      } catch (error) {
        console.log(
          "ADMIN ACCESS ERROR:",
          error.code,
          error.message
        );

        showMessage(
          "Admin Error",
          error.message ||
            "Administrator access could not be checked."
        );

        navigation.replace("MainTabs");
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [navigation]);

  /*
    Loads donations, requests, and user count.
  */
  useEffect(() => {
    if (loading || !adminData) {
      return;
    }

    const donationsQuery = query(
      collection(db, "donations"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const requestsQuery = query(
      collection(db, "requests"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const campaignsQuery = query(
  collection(db, "campaigns"),
  orderBy("createdAt", "desc"),
  limit(20)
);
const charitiesQuery = query(
  collection(db, "charities"),
  orderBy("createdAt", "desc"),
  limit(20)
);

    const unsubscribeDonations = onSnapshot(
      donationsQuery,
      (snapshot) => {
        const donationList = snapshot.docs.map(
          (document) => ({
            id: document.id,
            ...document.data(),
          })
        );

        setDonations(donationList);
      },
      (error) => {
        console.log(
          "ADMIN DONATIONS ERROR:",
          error.code,
          error.message
        );
      }
    );

    const unsubscribeRequests = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const requestList = snapshot.docs.map(
          (document) => ({
            id: document.id,
            ...document.data(),
          })
        );

        setRequests(requestList);
      },
      (error) => {
        console.log(
          "ADMIN REQUESTS ERROR:",
          error.code,
          error.message
        );
      }
    );

    const unsubscribeCampaigns = onSnapshot(
  campaignsQuery,
  (snapshot) => {
    const campaignList = snapshot.docs.map(
      (document) => ({
        id: document.id,
        ...document.data(),
      })
    );

    setCampaigns(campaignList);
  },
  (error) => {
    console.log(
      "ADMIN CAMPAIGNS ERROR:",
      error.code,
      error.message
    );
  }
);

const unsubscribeCharities = onSnapshot(
  charitiesQuery,
  (snapshot) => {
    const charityList = snapshot.docs.map(
      (document) => ({
        id: document.id,
        ...document.data(),
      })
    );

    setCharities(charityList);
  },
  (error) => {
    console.log(
      "ADMIN CHARITIES ERROR:",
      error.code,
      error.message
    );
  }
);

    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setUsersCount(snapshot.size);
      },
      (error) => {
        console.log(
          "ADMIN USERS ERROR:",
          error.code,
          error.message
        );
      }
    );

  return () => {
  unsubscribeDonations();
  unsubscribeRequests();
  unsubscribeCampaigns();
  unsubscribeCharities();
  unsubscribeUsers();
};
  }, [loading, adminData]);

  /*
    Creates a notification for the owner.
  */
  const createNotification = async (
    userId,
    title,
    message,
    type
  ) => {
    if (!userId) {
      console.log(
        "NOTIFICATION SKIPPED: User ID is missing."
      );
      return;
    }

    try {
      await addDoc(
        collection(db, "notifications"),
        {
          userId,
          title,
          message,
          type,
          read: false,
          createdAt: serverTimestamp(),
        }
      );
    } catch (error) {
      console.log(
        "NOTIFICATION ERROR:",
        error.code,
        error.message
      );

      /*
        The status update should still succeed even
        when notification creation fails.
      */
    }
  };

  /*
    Approves or rejects a donation.
  */
  const updateDonationStatus = async (
    donation,
    newStatus
  ) => {
    if (!donation?.id) {
      showMessage(
        "Update Error",
        "The donation ID could not be found."
      );
      return;
    }

    try {
      setProcessingId(donation.id);

      console.log(
        "UPDATING DONATION:",
        donation.id,
        newStatus
      );

      await updateDoc(
        doc(db, "donations", donation.id),
        {
          status: newStatus,
          reviewedAt: serverTimestamp(),
          reviewedBy: auth.currentUser?.uid || "",
        }
      );

      await createNotification(
        donation.userId,
        `Donation ${newStatus}`,
        `Your donation "${donation.itemName}" has been ${newStatus.toLowerCase()}.`,
        "donation"
      );

      showMessage(
        "Success",
        `Donation ${newStatus.toLowerCase()} successfully.`
      );
    } catch (error) {
      console.log(
        "DONATION UPDATE ERROR:",
        error.code,
        error.message
      );

      showMessage(
        "Update Error",
        `${error.code || "Unknown error"}\n\n${
          error.message ||
          "The donation could not be updated."
        }`
      );
    } finally {
      setProcessingId(null);
    }
  };

  /*
    Approves or rejects a help request.
  */
  const updateRequestStatus = async (
    request,
    newStatus
  ) => {
    if (!request?.id) {
      showMessage(
        "Update Error",
        "The request ID could not be found."
      );
      return;
    }

    try {
      setProcessingId(request.id);

      console.log(
        "UPDATING REQUEST:",
        request.id,
        newStatus
      );

      await updateDoc(
        doc(db, "requests", request.id),
        {
          status: newStatus,
          reviewedAt: serverTimestamp(),
          reviewedBy: auth.currentUser?.uid || "",
        }
      );

      await createNotification(
        request.userId,
        `Request ${newStatus}`,
        `Your request for "${request.itemNeeded}" has been ${newStatus.toLowerCase()}.`,
        "request"
      );

      showMessage(
        "Success",
        `Request ${newStatus.toLowerCase()} successfully.`
      );
    } catch (error) {
      console.log(
        "REQUEST UPDATE ERROR:",
        error.code,
        error.message
      );

      showMessage(
        "Update Error",
        `${error.code || "Unknown error"}\n\n${
          error.message ||
          "The request could not be updated."
        }`
      );
    } finally {
      setProcessingId(null);
    }
  };

  /*
    Performs the actual donation deletion.
  */
  const performDonationDelete = async (
    donation
  ) => {
    if (!donation?.id) {
      showMessage(
        "Delete Error",
        "The donation ID could not be found."
      );
      return;
    }

    try {
      setProcessingId(donation.id);

      console.log(
        "DELETING DONATION:",
        donation.id
      );

      await createNotification(
        donation.userId,
        "Donation Deleted",
        `Your donation "${donation.itemName}" was deleted by an administrator.`,
        "donation"
      );

      await deleteDoc(
        doc(db, "donations", donation.id)
      );

      showMessage(
        "Deleted",
        "Donation deleted successfully."
      );
    } catch (error) {
      console.log(
        "DONATION DELETE ERROR:",
        error.code,
        error.message
      );

      showMessage(
        "Delete Error",
        `${error.code || "Unknown error"}\n\n${
          error.message ||
          "The donation could not be deleted."
        }`
      );
    } finally {
      setProcessingId(null);
    }
  };

  /*
    Uses window.confirm on Web and Alert.alert
    on Android and iOS.
  */
  const deleteDonation = (donation) => {
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined"
    ) {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${donation.itemName}"?`
      );

      if (confirmed) {
        performDonationDelete(donation);
      }

      return;
    }

    Alert.alert(
      "Delete Donation",
      "Are you sure you want to delete this donation?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            performDonationDelete(donation),
        },
      ]
    );
  };

  /*
    Performs the actual request deletion.
  */
  const performRequestDelete = async (
    request
  ) => {
    if (!request?.id) {
      showMessage(
        "Delete Error",
        "The request ID could not be found."
      );
      return;
    }

    try {
      setProcessingId(request.id);

      console.log(
        "DELETING REQUEST:",
        request.id
      );

      await createNotification(
        request.userId,
        "Request Deleted",
        `Your request for "${request.itemNeeded}" was deleted by an administrator.`,
        "request"
      );

      await deleteDoc(
        doc(db, "requests", request.id)
      );

      showMessage(
        "Deleted",
        "Request deleted successfully."
      );
    } catch (error) {
      console.log(
        "REQUEST DELETE ERROR:",
        error.code,
        error.message
      );

      showMessage(
        "Delete Error",
        `${error.code || "Unknown error"}\n\n${
          error.message ||
          "The request could not be deleted."
        }`
      );
    } finally {
      setProcessingId(null);
    }
  };

  const deleteRequest = (request) => {
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined"
    ) {
      const confirmed = window.confirm(
        `Are you sure you want to delete the request for "${request.itemNeeded}"?`
      );

      if (confirmed) {
        performRequestDelete(request);
      }

      return;
    }

    Alert.alert(
      "Delete Request",
      "Are you sure you want to delete this help request?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            performRequestDelete(request),
        },
      ]
    );
  };

  const updateCampaignStatus = async (
  campaign,
  newStatus
) => {
  if (!campaign?.id) {
    showMessage(
      "Campaign Error",
      "The campaign ID could not be found."
    );
    return;
  }

  try {
    setProcessingId(campaign.id);

    await updateDoc(
      doc(db, "campaigns", campaign.id),
      {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || "",
      }
    );

    showMessage(
      "Campaign Updated",
      `"${campaign.title}" is now ${newStatus}.`
    );
  } catch (error) {
    console.log(
      "CAMPAIGN UPDATE ERROR:",
      error.code,
      error.message
    );

    showMessage(
      "Campaign Error",
      error.message ||
        "The campaign could not be updated."
    );
  } finally {
    setProcessingId(null);
  }
};

const performCampaignDelete = async (
  campaign
) => {
  try {
    setProcessingId(campaign.id);

    await deleteDoc(
      doc(db, "campaigns", campaign.id)
    );

    showMessage(
      "Campaign Deleted",
      `"${campaign.title}" was deleted successfully.`
    );
  } catch (error) {
    console.log(
      "CAMPAIGN DELETE ERROR:",
      error.code,
      error.message
    );

    showMessage(
      "Delete Error",
      error.message ||
        "The campaign could not be deleted."
    );
  } finally {
    setProcessingId(null);
  }
};

const deleteCampaign = (campaign) => {
  if (!campaign?.id) {
    showMessage(
      "Delete Error",
      "The campaign ID could not be found."
    );
    return;
  }

  if (
    Platform.OS === "web" &&
    typeof window !== "undefined"
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${campaign.title}"?`
    );

    if (confirmed) {
      performCampaignDelete(campaign);
    }

    return;
  }

  Alert.alert(
    "Delete Campaign",
    `Are you sure you want to delete "${campaign.title}"?`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          performCampaignDelete(campaign),
      },
    ]
  );
};

const getCampaignProgress = (campaign) => {
  if (campaign.campaignType === "Money") {
    const target = Number(
      campaign.targetAmount || 0
    );

    const current = Number(
      campaign.currentAmount || 0
    );

    return {
      goal: `R${target.toLocaleString()}`,
      progress: `R${current.toLocaleString()} raised`,
      percentage:
        target > 0
          ? Math.min((current / target) * 100, 100)
          : 0,
    };
  }

  const target = Number(
    campaign.targetItems || 0
  );

  const current = Number(
    campaign.collectedItems || 0
  );

  return {
    goal: `${target} ${
      campaign.itemName || "items"
    }`,

    progress: `${current} collected`,

    percentage:
      target > 0
        ? Math.min((current / target) * 100, 100)
        : 0,
  };
};

const getCampaignStatusStyle = (status) => {
  if (status === "Completed") {
    return {
      badge: styles.campaignCompletedBadge,
      text: styles.campaignCompletedText,
    };
  }

  if (status === "Closed") {
    return {
      badge: styles.campaignClosedBadge,
      text: styles.campaignClosedText,
    };
  }

  return {
    badge: styles.campaignActiveBadge,
    text: styles.campaignActiveText,
  };
};
const updateCharityVerification = async (
  charity,
  verified
) => {
  if (!charity?.id) {
    showMessage(
      "Charity Error",
      "The charity ID could not be found."
    );
    return;
  }

  try {
    setProcessingId(charity.id);

    await updateDoc(
      doc(db, "charities", charity.id),
      {
        verified,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || "",
      }
    );

    showMessage(
      "Charity Updated",
      verified
        ? `"${charity.name}" is now verified.`
        : `"${charity.name}" is now unverified.`
    );
  } catch (error) {
    console.log(
      "CHARITY UPDATE ERROR:",
      error.code,
      error.message
    );

    showMessage(
      "Charity Error",
      error.message ||
        "The charity could not be updated."
    );
  } finally {
    setProcessingId(null);
  }
};
const performCharityDelete = async (
  charity
) => {
  if (!charity?.id) {
    showMessage(
      "Delete Error",
      "The charity ID could not be found."
    );
    return;
  }

  try {
    setProcessingId(charity.id);

    await deleteDoc(
      doc(db, "charities", charity.id)
    );

    showMessage(
      "Charity Deleted",
      `"${charity.name}" was deleted successfully.`
    );
  } catch (error) {
    console.log(
      "CHARITY DELETE ERROR:",
      error.code,
      error.message
    );

    showMessage(
      "Delete Error",
      error.message ||
        "The charity could not be deleted."
    );
  } finally {
    setProcessingId(null);
  }
};

const deleteCharity = (charity) => {
  if (!charity?.id) {
    showMessage(
      "Delete Error",
      "The charity ID could not be found."
    );
    return;
  }

  if (
    Platform.OS === "web" &&
    typeof window !== "undefined"
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${charity.name}"?`
    );

    if (confirmed) {
      performCharityDelete(charity);
    }

    return;
  }

  Alert.alert(
    "Delete Charity",
    `Are you sure you want to delete "${charity.name}"?`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          performCharityDelete(charity),
      },
    ]
  );
};

  const handleLogout = async () => {
    const logout = async () => {
      try {
        await signOut(auth);
        navigation.replace("Login");
      } catch (error) {
        showMessage(
          "Logout Error",
          error.message ||
            "You could not be logged out."
        );
      }
    };

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined"
    ) {
      const confirmed = window.confirm(
        "Are you sure you want to log out?"
      );

      if (confirmed) {
        logout();
      }

      return;
    }

    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          onPress: logout,
        },
      ]
    );
  };

  const getStatusStyles = (status) => {
    if (status === "Approved") {
      return {
        badge: styles.approvedBadge,
        text: styles.approvedText,
      };
    }

    if (status === "Rejected") {
      return {
        badge: styles.rejectedBadge,
        text: styles.rejectedText,
      };
    }

    return {
      badge: styles.pendingBadge,
      text: styles.pendingText,
    };
  };

  const pendingCount =
    donations.filter(
      (item) => item.status === "Pending"
    ).length +
    requests.filter(
      (item) => item.status === "Pending"
    ).length;

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Checking admin access...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.welcome}>
              Welcome Admin 👋
            </Text>

            <Text
              style={styles.adminName}
              numberOfLines={1}
            >
              {adminData?.fullName ||
                "Administrator"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButtonSmall}
            onPress={handleLogout}
          >
            <Text
              style={styles.logoutButtonSmallText}
            >
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statValue}>
              {usersCount}
            </Text>
            <Text style={styles.statLabel}>
              Users
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🎁</Text>
            <Text style={styles.statValue}>
              {donations.length}
            </Text>
            <Text style={styles.statLabel}>
              Donations
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🙏</Text>
            <Text style={styles.statValue}>
              {requests.length}
            </Text>
            <Text style={styles.statLabel}>
              Requests
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⏳</Text>
            <Text style={styles.statValue}>
              {pendingCount}
            </Text>
            <Text style={styles.statLabel}>
              Pending
            </Text>
          </View>
        </View>

        <TouchableOpacity
  style={styles.createCampaignButton}
  onPress={() =>
    navigation.navigate("CreateCampaign")
  }
>
  <Text style={styles.createCampaignButtonText}>
    📢 Create New Campaign
  </Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.createCharityButton}
  onPress={() =>
    navigation.navigate("CreateCharity")
  }
>
  <Text style={styles.createCharityButtonText}>
    🤝 Create New Charity
  </Text>
</TouchableOpacity>
<Text style={styles.sectionTitle}>
  Manage Campaigns
</Text>


{campaigns.length === 0 ? (
  <View style={styles.emptyCard}>
    <Text style={styles.emptyText}>
      No campaigns created yet.
    </Text>
  </View>
) : (
  campaigns.map((campaign) => {
    const progress =
      getCampaignProgress(campaign);

    const campaignStatus =
      campaign.status || "Active";

    const statusStyles =
      getCampaignStatusStyle(
        campaignStatus
      );

    const isProcessing =
      processingId === campaign.id;

    return (
      <View
        key={campaign.id}
        style={styles.campaignCard}
      >
        <View style={styles.cardTopRow}>
          <Text
            style={styles.cardTitle}
            numberOfLines={2}
          >
            📢 {campaign.title}
          </Text>

          <View
            style={[
              styles.statusBadge,
              statusStyles.badge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                statusStyles.text,
              ]}
            >
              {campaignStatus}
            </Text>
          </View>
        </View>

        <Text style={styles.cardSubtitle}>
          {campaign.organization ||
            "Ubuntu Connect"}
        </Text>

        <Text
          style={styles.cardDescription}
          numberOfLines={3}
        >
          {campaign.description}
        </Text>

        <Text style={styles.cardMeta}>
          📍 {campaign.location}
        </Text>

        <View style={styles.campaignProgressRow}>
          <View>
            <Text style={styles.campaignLabel}>
              Goal
            </Text>

            <Text style={styles.campaignValue}>
              {progress.goal}
            </Text>
          </View>

          <View style={styles.campaignRightValue}>
            <Text style={styles.campaignLabel}>
              Progress
            </Text>

            <Text style={styles.campaignValue}>
              {progress.progress}
            </Text>
          </View>
        </View>

        <View style={styles.campaignProgressBar}>
          <View
            style={[
              styles.campaignProgressFill,
              {
                width: `${progress.percentage}%`,
              },
            ]}
          />
        </View>

        <TouchableOpacity
  style={styles.updateProgressButton}
  onPress={() =>
    navigation.navigate("UpdateCampaign", {
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      campaignType: campaign.campaignType,
      targetItems: campaign.targetItems || 0,
      collectedItems: campaign.collectedItems || 0,
      targetAmount: campaign.targetAmount || 0,
      currentAmount: campaign.currentAmount || 0,
    })
  }
>
  <Text style={styles.adminButtonText}>
    📊 Update Progress
  </Text>
</TouchableOpacity>

        <Text style={styles.adminActionsTitle}>
          Campaign Actions
        </Text>

        {campaignStatus === "Active" ? (
          <View style={styles.adminButtonRow}>
            <TouchableOpacity
              style={[
                styles.completeCampaignButton,
                isProcessing &&
                  styles.disabledButton,
              ]}
              onPress={() =>
                updateCampaignStatus(
                  campaign,
                  "Completed"
                )
              }
              disabled={isProcessing}
            >
              <Text style={styles.adminButtonText}>
                ✅ Complete
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.closeCampaignButton,
                isProcessing &&
                  styles.disabledButton,
              ]}
              onPress={() =>
                updateCampaignStatus(
                  campaign,
                  "Closed"
                )
              }
              disabled={isProcessing}
            >
              <Text style={styles.adminButtonText}>
                🔒 Close
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.reopenCampaignButton,
              isProcessing &&
                styles.disabledButton,
            ]}
            onPress={() =>
              updateCampaignStatus(
                campaign,
                "Active"
              )
            }
            disabled={isProcessing}
          >
            <Text style={styles.adminButtonText}>
              🔓 Reopen Campaign
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.deleteButton,
            isProcessing &&
              styles.disabledButton,
          ]}
          onPress={() =>
            deleteCampaign(campaign)
          }
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.deleteText}>
              Delete Campaign
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  })
)}

<Text style={styles.sectionTitle}>
  Manage Charities
</Text>

{charities.length === 0 ? (
  <View style={styles.emptyCard}>
    <Text style={styles.emptyText}>
      No charities created yet.
    </Text>
  </View>
) : (
  charities.map((charity) => {
    const isProcessing =
      processingId === charity.id;

    const needsText = Array.isArray(
      charity.needs
    )
      ? charity.needs.join(", ")
      : charity.needs || "Not specified";

    const servicesText = Array.isArray(
      charity.services
    )
      ? charity.services.join(", ")
      : charity.services || "Not specified";

    return (
      <View
        key={charity.id}
        style={styles.charityCard}
      >
        <View style={styles.cardTopRow}>
          <Text
            style={styles.cardTitle}
            numberOfLines={2}
          >
            🤝 {charity.name}
          </Text>

          <View
            style={[
              styles.statusBadge,
              charity.verified
                ? styles.verifiedCharityBadge
                : styles.unverifiedCharityBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                charity.verified
                  ? styles.verifiedCharityText
                  : styles.unverifiedCharityText,
              ]}
            >
              {charity.verified
                ? "Verified"
                : "Unverified"}
            </Text>
          </View>
        </View>

        <Text style={styles.cardSubtitle}>
          {charity.type ||
            "Community Organisation"}
        </Text>

        <Text
          style={styles.cardDescription}
          numberOfLines={3}
        >
          {charity.description ||
            "No description provided."}
        </Text>

        <Text style={styles.cardMeta}>
          📍{" "}
          {charity.address ||
            charity.location ||
            "Location unavailable"}
        </Text>

        {charity.phone ? (
          <Text style={styles.cardMeta}>
            📞 {charity.phone}
          </Text>
        ) : null}

        {charity.email ? (
          <Text style={styles.cardMeta}>
            ✉️ {charity.email}
          </Text>
        ) : null}

        <View style={styles.charityInfoBox}>
          <Text style={styles.charityInfoLabel}>
            Current needs
          </Text>

          <Text style={styles.charityInfoValue}>
            {needsText}
          </Text>
        </View>

        <View style={styles.charityInfoBox}>
          <Text style={styles.charityInfoLabel}>
            Services
          </Text>

          <Text style={styles.charityInfoValue}>
            {servicesText}
          </Text>
        </View>

        <Text style={styles.adminActionsTitle}>
          Charity Actions
        </Text>

        <TouchableOpacity
          style={[
            charity.verified
              ? styles.unverifyCharityButton
              : styles.verifyCharityButton,
            isProcessing &&
              styles.disabledButton,
          ]}
          onPress={() =>
            updateCharityVerification(
              charity,
              !charity.verified
            )
          }
          disabled={isProcessing}
        >
          <Text style={styles.adminButtonText}>
            {charity.verified
              ? "⚠️ Mark as Unverified"
              : "✅ Verify Charity"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.deleteButton,
            isProcessing &&
              styles.disabledButton,
          ]}
          onPress={() =>
            deleteCharity(charity)
          }
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.deleteText}>
              Delete Charity
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  })
)}

        <Text style={styles.sectionTitle}>
          Manage Donations
        </Text>

        {donations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No donations found.
            </Text>
          </View>
        ) : (
          donations.map((donation) => {
            const statusStyles =
              getStatusStyles(
                donation.status || "Pending"
              );

            const isProcessing =
              processingId === donation.id;

            return (
              <View
                key={donation.id}
                style={styles.manageCard}
              >
                <View style={styles.cardTopRow}>
                  <Text
                    style={styles.cardTitle}
                    numberOfLines={2}
                  >
                    🎁 {donation.itemName}
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,
                      statusStyles.badge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        statusStyles.text,
                      ]}
                    >
                      {donation.status ||
                        "Pending"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardSubtitle}>
                  {donation.category} •{" "}
                  {donation.condition}
                </Text>

                <Text
                  style={styles.cardDescription}
                  numberOfLines={2}
                >
                  {donation.description}
                </Text>

                <Text style={styles.cardMeta}>
                  📍 {donation.address}
                </Text>

                <Text style={styles.cardMeta}>
                  Method:{" "}
                  {donation.deliveryMethod}
                </Text>

                <Text
                  style={styles.adminActionsTitle}
                >
                  Admin Actions
                </Text>

                <View
                  style={styles.adminButtonRow}
                >
                  <TouchableOpacity
                    style={[
                      styles.approveButton,
                      isProcessing &&
                        styles.disabledButton,
                    ]}
                    onPress={() =>
                      updateDonationStatus(
                        donation,
                        "Approved"
                      )
                    }
                    disabled={isProcessing}
                  >
                    <Text
                      style={styles.adminButtonText}
                    >
                      ✅ Approve
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.rejectButton,
                      isProcessing &&
                        styles.disabledButton,
                    ]}
                    onPress={() =>
                      updateDonationStatus(
                        donation,
                        "Rejected"
                      )
                    }
                    disabled={isProcessing}
                  >
                    <Text
                      style={styles.adminButtonText}
                    >
                      ❌ Reject
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.deleteButton,
                    isProcessing &&
                      styles.disabledButton,
                  ]}
                  onPress={() =>
                    deleteDonation(donation)
                  }
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text
                      style={styles.deleteText}
                    >
                      Delete Donation
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <Text style={styles.sectionTitle}>
          Manage Help Requests
        </Text>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No help requests found.
            </Text>
          </View>
        ) : (
          requests.map((request) => {
            const statusStyles =
              getStatusStyles(
                request.status || "Pending"
              );

            const isProcessing =
              processingId === request.id;

            return (
              <View
                key={request.id}
                style={styles.manageCard}
              >
                <View style={styles.cardTopRow}>
                  <Text
                    style={styles.cardTitle}
                    numberOfLines={2}
                  >
                    🙏 {request.itemNeeded}
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,
                      statusStyles.badge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        statusStyles.text,
                      ]}
                    >
                      {request.status ||
                        "Pending"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardSubtitle}>
                  {request.category} • Quantity:{" "}
                  {request.quantity}
                </Text>

                <Text
                  style={styles.cardDescription}
                  numberOfLines={2}
                >
                  {request.description}
                </Text>

                <Text style={styles.cardMeta}>
                  📍 {request.location}
                </Text>

                <Text style={styles.cardMeta}>
                  Urgency:{" "}
                  {request.urgency || "Normal"}
                </Text>

                <Text
                  style={styles.adminActionsTitle}
                >
                  Admin Actions
                </Text>

                <View
                  style={styles.adminButtonRow}
                >
                  <TouchableOpacity
                    style={[
                      styles.approveButton,
                      isProcessing &&
                        styles.disabledButton,
                    ]}
                    onPress={() =>
                      updateRequestStatus(
                        request,
                        "Approved"
                      )
                    }
                    disabled={isProcessing}
                  >
                    <Text
                      style={styles.adminButtonText}
                    >
                      ✅ Approve
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.rejectButton,
                      isProcessing &&
                        styles.disabledButton,
                    ]}
                    onPress={() =>
                      updateRequestStatus(
                        request,
                        "Rejected"
                      )
                    }
                    disabled={isProcessing}
                  >
                    <Text
                      style={styles.adminButtonText}
                    >
                      ❌ Reject
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.deleteButton,
                    isProcessing &&
                      styles.disabledButton,
                  ]}
                  onPress={() =>
                    deleteRequest(request)
                  }
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text
                      style={styles.deleteText}
                    >
                      Delete Request
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminDashboard;

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
    fontSize: 16,
    fontWeight: "600",
    marginTop: 14,
  },

  header: {
    marginTop: 20,
    marginBottom: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },

  welcome: {
    color: "#64748B",
    fontSize: 16,
  },

  adminName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 4,
  },

  logoutButtonSmall: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },

  logoutButtonSmallText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 13,
  },

  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 15,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2563EB",
  },

  statLabel: {
    color: "#64748B",
    marginTop: 5,
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 15,
  },

  manageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
    marginRight: 10,
  },

  cardSubtitle: {
    color: "#2563EB",
    fontWeight: "600",
    marginBottom: 6,
  },

  cardDescription: {
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 8,
  },

  cardMeta: {
    color: "#475569",
    marginBottom: 4,
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

  pendingBadge: {
    backgroundColor: "#FEF3C7",
  },

  pendingText: {
    color: "#D97706",
  },

  approvedBadge: {
    backgroundColor: "#DCFCE7",
  },

  approvedText: {
    color: "#16A34A",
  },

  rejectedBadge: {
    backgroundColor: "#FEE2E2",
  },

  rejectedText: {
    color: "#DC2626",
  },

  adminActionsTitle: {
    marginTop: 16,
    marginBottom: 10,
    color: "#1E293B",
    fontWeight: "700",
    fontSize: 15,
  },

  adminButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },

  approveButton: {
    flex: 1,
    backgroundColor: "#22C55E",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#16A34A",
  },

  rejectButton: {
    flex: 1,
    backgroundColor: "#F97316",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#EA580C",
  },

  adminButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  deleteButton: {
    minHeight: 46,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },

  deleteText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  disabledButton: {
    opacity: 0.55,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },

  emptyText: {
    color: "#64748B",
    fontWeight: "600",
  },
  createCampaignButton: {
  backgroundColor: "#2563EB",
  borderRadius: 15,
  paddingVertical: 15,
  alignItems: "center",
  marginBottom: 25,
},

createCampaignButtonText: {
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: "800",
},
campaignCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 18,
  marginBottom: 14,
  borderLeftWidth: 4,
  borderLeftColor: "#2563EB",
  shadowColor: "#000000",
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 3,
},

campaignActiveBadge: {
  backgroundColor: "#DCFCE7",
},

campaignActiveText: {
  color: "#16A34A",
},

campaignCompletedBadge: {
  backgroundColor: "#DBEAFE",
},

campaignCompletedText: {
  color: "#2563EB",
},

campaignClosedBadge: {
  backgroundColor: "#E2E8F0",
},

campaignClosedText: {
  color: "#475569",
},

campaignProgressRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 15,
  marginBottom: 10,
},

campaignRightValue: {
  alignItems: "flex-end",
},

campaignLabel: {
  color: "#64748B",
  fontSize: 12,
},

campaignValue: {
  color: "#1E293B",
  fontSize: 14,
  fontWeight: "700",
  marginTop: 3,
},

campaignProgressBar: {
  width: "100%",
  height: 9,
  borderRadius: 10,
  backgroundColor: "#E2E8F0",
  overflow: "hidden",
  marginBottom: 5,
},

campaignProgressFill: {
  height: "100%",
  borderRadius: 10,
  backgroundColor: "#22C55E",
},

completeCampaignButton: {
  flex: 1,
  backgroundColor: "#22C55E",
  borderRadius: 12,
  paddingVertical: 13,
  alignItems: "center",
  marginRight: 7,
},

closeCampaignButton: {
  flex: 1,
  backgroundColor: "#F97316",
  borderRadius: 12,
  paddingVertical: 13,
  alignItems: "center",
  marginLeft: 7,
},

reopenCampaignButton: {
  backgroundColor: "#2563EB",
  borderRadius: 12,
  paddingVertical: 13,
  alignItems: "center",
  marginTop: 4,
},
updateProgressButton: {
  backgroundColor: "#2563EB",
  borderRadius: 12,
  paddingVertical: 13,
  alignItems: "center",
  marginTop: 10,
  marginBottom: 6,
},

updateProgressButtonText: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "800",
},
createCharityButton: {
  backgroundColor: "#22C55E",
  borderRadius: 15,
  paddingVertical: 15,
  alignItems: "center",
  marginTop: -13,
  marginBottom: 25,
},

createCharityButtonText: {
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: "800",
},
charityCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 18,
  marginBottom: 14,
  borderLeftWidth: 4,
  borderLeftColor: "#22C55E",
  shadowColor: "#000000",
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 3,
},

verifiedCharityBadge: {
  backgroundColor: "#DCFCE7",
},

verifiedCharityText: {
  color: "#16A34A",
},

unverifiedCharityBadge: {
  backgroundColor: "#FEF3C7",
},

unverifiedCharityText: {
  color: "#D97706",
},

charityInfoBox: {
  backgroundColor: "#F8FAFC",
  borderRadius: 12,
  padding: 12,
  marginTop: 10,
},

charityInfoLabel: {
  color: "#64748B",
  fontSize: 11,
  fontWeight: "600",
},

charityInfoValue: {
  color: "#1E293B",
  fontSize: 13,
  fontWeight: "600",
  lineHeight: 19,
  marginTop: 4,
},

verifyCharityButton: {
  backgroundColor: "#22C55E",
  borderRadius: 12,
  paddingVertical: 13,
  alignItems: "center",
  justifyContent: "center",
  marginTop: 4,
},

unverifyCharityButton: {
  backgroundColor: "#F59E0B",
  borderRadius: 12,
  paddingVertical: 13,
  alignItems: "center",
  justifyContent: "center",
  marginTop: 4,
},
});