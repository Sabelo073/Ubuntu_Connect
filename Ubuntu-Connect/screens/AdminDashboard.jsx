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
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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
import { useSession } from "../context/SessionContext";

const AdminDashboard = ({ navigation }) => {
  const [adminData, setAdminData] = useState(null);
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [charities, setCharities] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const { endSession, writeAuditLog } = useSession();

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
    Loads donations, requests, campaigns,
    charities, and users.
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

      await updateDoc(
        doc(db, "donations", donation.id),
        {
          status: newStatus,
          reviewedAt: serverTimestamp(),
          reviewedBy:
            auth.currentUser?.uid || "",
        }
      );

      await writeAuditLog({
        action:
          newStatus === "Approved"
            ? "DONATION_APPROVED"
            : "DONATION_REJECTED",

        description:
          `Administrator changed donation "${donation.itemName}" ` +
          `to ${newStatus}.`,

        actorRole: "Admin",
        targetType: "donation",
        targetId: donation.id,

        metadata: {
          itemName: donation.itemName || "",
          previousStatus:
            donation.status || "Pending",
          newStatus,
          ownerId: donation.userId || "",
        },
      });

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

      await updateDoc(
        doc(db, "requests", request.id),
        {
          status: newStatus,
          reviewedAt: serverTimestamp(),
          reviewedBy:
            auth.currentUser?.uid || "",
        }
      );

      await writeAuditLog({
        action:
          newStatus === "Approved"
            ? "REQUEST_APPROVED"
            : "REQUEST_REJECTED",

        description:
          `Administrator changed request "${request.itemNeeded}" ` +
          `to ${newStatus}.`,

        actorRole: "Admin",
        targetType: "request",
        targetId: request.id,

        metadata: {
          itemNeeded: request.itemNeeded || "",
          previousStatus:
            request.status || "Pending",
          newStatus,
          ownerId: request.userId || "",
        },
      });

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
    Performs donation deletion.
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

      await createNotification(
        donation.userId,
        "Donation Deleted",
        `Your donation "${donation.itemName}" was deleted by an administrator.`,
        "donation"
      );

      await deleteDoc(
        doc(db, "donations", donation.id)
      );

      await writeAuditLog({
        action: "DONATION_DELETED",

        description:
          `Administrator deleted donation "${donation.itemName}".`,

        actorRole: "Admin",
        targetType: "donation",
        targetId: donation.id,

        metadata: {
          itemName: donation.itemName || "",
          ownerId: donation.userId || "",
          previousStatus:
            donation.status || "Pending",
        },
      });

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
    Performs request deletion.
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

      await createNotification(
        request.userId,
        "Request Deleted",
        `Your request for "${request.itemNeeded}" was deleted by an administrator.`,
        "request"
      );

      await deleteDoc(
        doc(db, "requests", request.id)
      );

      await writeAuditLog({
        action: "REQUEST_DELETED",

        description:
          `Administrator deleted request "${request.itemNeeded}".`,

        actorRole: "Admin",
        targetType: "request",
        targetId: request.id,

        metadata: {
          itemNeeded: request.itemNeeded || "",
          ownerId: request.userId || "",
          previousStatus:
            request.status || "Pending",
        },
      });

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

  /*
    Campaign functions.
  */
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
          updatedBy:
            auth.currentUser?.uid || "",
        }
      );

      await writeAuditLog({
        action: "CAMPAIGN_STATUS_UPDATED",

        description:
          `Administrator changed campaign "${campaign.title}" ` +
          `to ${newStatus}.`,

        actorRole: "Admin",
        targetType: "campaign",
        targetId: campaign.id,

        metadata: {
          campaignTitle:
            campaign.title || "",
          previousStatus:
            campaign.status || "Active",
          newStatus,
        },
      });

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

      await writeAuditLog({
        action: "CAMPAIGN_DELETED",

        description:
          `Administrator deleted campaign "${campaign.title}".`,

        actorRole: "Admin",
        targetType: "campaign",
        targetId: campaign.id,

        metadata: {
          campaignTitle:
            campaign.title || "",
          previousStatus:
            campaign.status || "Active",
        },
      });

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
            ? Math.min(
                (current / target) * 100,
                100
              )
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
          ? Math.min(
              (current / target) * 100,
              100
            )
          : 0,
    };
  };

  const getCampaignStatusStyle = (status) => {
    if (status === "Completed") {
      return {
        badge: styles.campaignCompletedBadge,
        text: styles.campaignCompletedText,
        icon: "check-circle",
      };
    }

    if (status === "Closed") {
      return {
        badge: styles.campaignClosedBadge,
        text: styles.campaignClosedText,
        icon: "lock",
      };
    }

    return {
      badge: styles.campaignActiveBadge,
      text: styles.campaignActiveText,
      icon: "play-circle",
    };
  };

  /*
    Charity functions.
  */
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
          updatedBy:
            auth.currentUser?.uid || "",
        }
      );

      await writeAuditLog({
        action: verified
          ? "CHARITY_VERIFIED"
          : "CHARITY_UNVERIFIED",

        description: verified
          ? `Administrator verified charity "${charity.name}".`
          : `Administrator marked charity "${charity.name}" as unverified.`,

        actorRole: "Admin",
        targetType: "charity",
        targetId: charity.id,

        metadata: {
          charityName: charity.name || "",
          previousVerified:
            charity.verified === true,
          newVerified: verified,
        },
      });

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

      await writeAuditLog({
        action: "CHARITY_DELETED",

        description:
          `Administrator deleted charity "${charity.name}".`,

        actorRole: "Admin",
        targetType: "charity",
        targetId: charity.id,

        metadata: {
          charityName: charity.name || "",
          verified:
            charity.verified === true,
        },
      });

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

  /*
    Logout.
  */
  const handleLogout = async () => {
    const logout = async () => {
      try {
        await endSession({
          status: "LoggedOut",
          reason:
            "Administrator logged out manually from Admin Dashboard.",
        });
      } catch (error) {
        console.log(
          "ADMIN LOGOUT ERROR:",
          error.code,
          error.message
        );

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
        await logout();
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
        icon: "check-circle",
      };
    }

    if (status === "Rejected") {
      return {
        badge: styles.rejectedBadge,
        text: styles.rejectedText,
        icon: "cancel",
      };
    }

    return {
      badge: styles.pendingBadge,
      text: styles.pendingText,
      icon: "schedule",
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
        <View style={styles.loadingIcon}>
          <MaterialIcons
            name="admin-panel-settings"
            size={34}
            color="#2563EB"
          />
        </View>

        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Checking admin access...
        </Text>

        <Text style={styles.loadingSubText}>
          Please wait a moment
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
        contentContainerStyle={styles.scrollContent}
      >
        {/* ================= HEADER ================= */}

        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <View style={styles.adminLabelRow}>
              <View style={styles.adminDot} />

              <Text style={styles.adminLabel}>
                ADMINISTRATOR
              </Text>
            </View>

            <Text style={styles.welcome}>
              Welcome back
            </Text>

            <Text
              style={styles.adminName}
              numberOfLines={1}
            >
              {adminData?.fullName ||
                "Administrator"}
            </Text>

            <Text style={styles.headerSubtitle}>
              Manage Ubuntu Connect from one place.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButtonSmall}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="logout"
              size={18}
              color="#DC2626"
            />

            <Text
              style={styles.logoutButtonSmallText}
            >
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= OVERVIEW ================= */}

        <View style={styles.overviewHeader}>
          <View>
            <Text style={styles.overviewTitle}>
              Dashboard Overview
            </Text>

            <Text style={styles.overviewSubtitle}>
              Live platform activity
            </Text>
          </View>

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />

            <Text style={styles.liveText}>
              LIVE
            </Text>
          </View>
        </View>

        {/* ================= STATS ================= */}

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                styles.blueIconContainer,
              ]}
            >
              <MaterialIcons
                name="people"
                size={25}
                color="#2563EB"
              />
            </View>

            <Text style={styles.statValue}>
              {usersCount}
            </Text>

            <Text style={styles.statLabel}>
              Users
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                styles.greenIconContainer,
              ]}
            >
              <MaterialIcons
                name="card-giftcard"
                size={25}
                color="#16A34A"
              />
            </View>

            <Text style={styles.statValue}>
              {donations.length}
            </Text>

            <Text style={styles.statLabel}>
              Donations
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                styles.orangeIconContainer,
              ]}
            >
              <MaterialIcons
                name="volunteer-activism"
                size={25}
                color="#EA580C"
              />
            </View>

            <Text style={styles.statValue}>
              {requests.length}
            </Text>

            <Text style={styles.statLabel}>
              Requests
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                styles.yellowIconContainer,
              ]}
            >
              <MaterialIcons
                name="schedule"
                size={25}
                color="#D97706"
              />
            </View>

            <Text style={styles.statValue}>
              {pendingCount}
            </Text>

            <Text style={styles.statLabel}>
              Pending
            </Text>
          </View>
        </View>

        {/* ================= QUICK ACTIONS ================= */}

        <View style={styles.quickActionsCard}>
          <View style={styles.quickActionsHeader}>
            <View>
              <Text style={styles.quickActionsTitle}>
                Quick Actions
              </Text>

              <Text style={styles.quickActionsSubtitle}>
                Create and manage platform resources
              </Text>
            </View>

            <MaterialIcons
              name="dashboard-customize"
              size={24}
              color="#2563EB"
            />
          </View>

          <View style={styles.quickActionGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() =>
                navigation.navigate(
                  "CreateCampaign"
                )
              }
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  styles.blueIconContainer,
                ]}
              >
                <MaterialIcons
                  name="campaign"
                  size={23}
                  color="#2563EB"
                />
              </View>

              <Text
                style={styles.quickActionText}
              >
                New Campaign
              </Text>

              <MaterialIcons
                name="arrow-forward"
                size={18}
                color="#94A3B8"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() =>
                navigation.navigate(
                  "CreateCharity"
                )
              }
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  styles.greenIconContainer,
                ]}
              >
                <MaterialIcons
                  name="business"
                  size={23}
                  color="#16A34A"
                />
              </View>

              <Text
                style={styles.quickActionText}
              >
                New Charity
              </Text>

              <MaterialIcons
                name="arrow-forward"
                size={18}
                color="#94A3B8"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() =>
                navigation.navigate(
                  "AuditLog"
                )
              }
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  styles.purpleIconContainer,
                ]}
              >
                <MaterialIcons
                  name="fact-check"
                  size={23}
                  color="#7C3AED"
                />
              </View>

              <Text
                style={styles.quickActionText}
              >
                Audit Logs
              </Text>

              <MaterialIcons
                name="arrow-forward"
                size={18}
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= CAMPAIGNS ================= */}

        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.sectionIcon,
              styles.blueIconContainer,
            ]}
          >
            <MaterialIcons
              name="campaign"
              size={22}
              color="#2563EB"
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>
              Manage Campaigns
            </Text>

            <Text style={styles.sectionSubtitle}>
              Monitor and control community campaigns
            </Text>
          </View>
        </View>

        {campaigns.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <MaterialIcons
                name="campaign"
                size={28}
                color="#94A3B8"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No campaigns yet
            </Text>

            <Text style={styles.emptyText}>
              Campaigns created by administrators
              will appear here.
            </Text>
          </View>
        ) : (
          campaigns.map((campaign) => {
            const progress =
              getCampaignProgress(
                campaign
              );

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
                <View style={styles.cardAccentBlue} />

                <View style={styles.cardTopRow}>
                  <View
                    style={styles.cardTitleContainer}
                  >
                    <View
                      style={[
                        styles.smallCardIcon,
                        styles.blueIconContainer,
                      ]}
                    >
                      <MaterialIcons
                        name="campaign"
                        size={18}
                        color="#2563EB"
                      />
                    </View>

                    <Text
                      style={styles.cardTitle}
                      numberOfLines={2}
                    >
                      {campaign.title}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      statusStyles.badge,
                    ]}
                  >
                    <MaterialIcons
                      name={statusStyles.icon}
                      size={14}
                      color={
                        statusStyles.text
                          .color
                      }
                    />

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
                  {campaign.description ||
                    "No description provided."}
                </Text>

                <View style={styles.metaRow}>
                  <MaterialIcons
                    name="location-on"
                    size={17}
                    color="#64748B"
                  />

                  <Text
                    style={styles.cardMeta}
                    numberOfLines={2}
                  >
                    {campaign.location ||
                      "Location unavailable"}
                  </Text>
                </View>

                <View style={styles.campaignProgressRow}>
                  <View>
                    <Text
                      style={styles.campaignLabel}
                    >
                      GOAL
                    </Text>

                    <Text
                      style={styles.campaignValue}
                    >
                      {progress.goal}
                    </Text>
                  </View>

                  <View
                    style={styles.campaignRightValue}
                  >
                    <Text
                      style={styles.campaignLabel}
                    >
                      PROGRESS
                    </Text>

                    <Text
                      style={styles.campaignValue}
                    >
                      {progress.progress}
                    </Text>
                  </View>
                </View>

                <View
                  style={styles.progressPercentageRow}
                >
                  <Text
                    style={styles.progressPercentageLabel}
                  >
                    Progress
                  </Text>

                  <Text
                    style={
                      styles.progressPercentage
                    }
                  >
                    {Math.round(
                      progress.percentage
                    )}
                    %
                  </Text>
                </View>

                <View
                  style={styles.campaignProgressBar}
                >
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
                  style={
                    styles.updateProgressButton
                  }
                  onPress={() =>
                    navigation.navigate(
                      "UpdateCampaign",
                      {
                        campaignId:
                          campaign.id,
                        campaignTitle:
                          campaign.title,
                        campaignType:
                          campaign.campaignType,
                        targetItems:
                          campaign.targetItems ||
                          0,
                        collectedItems:
                          campaign.collectedItems ||
                          0,
                        targetAmount:
                          campaign.targetAmount ||
                          0,
                        currentAmount:
                          campaign.currentAmount ||
                          0,
                      }
                    )
                  }
                  activeOpacity={0.85}
                >
                  <MaterialIcons
                    name="trending-up"
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.adminButtonText
                    }
                  >
                    Update Progress
                  </Text>
                </TouchableOpacity>

                <Text
                  style={styles.adminActionsTitle}
                >
                  Campaign Actions
                </Text>

                {campaignStatus === "Active" ? (
                  <View
                    style={styles.adminButtonRow}
                  >
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
                      activeOpacity={0.85}
                    >
                      <MaterialIcons
                        name="check-circle"
                        size={18}
                        color="#FFFFFF"
                      />

                      <Text
                        style={
                          styles.adminButtonText
                        }
                      >
                        Complete
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
                      activeOpacity={0.85}
                    >
                      <MaterialIcons
                        name="lock"
                        size={18}
                        color="#FFFFFF"
                      />

                      <Text
                        style={
                          styles.adminButtonText
                        }
                      >
                        Close
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
                    activeOpacity={0.85}
                  >
                    <MaterialIcons
                      name="lock-open"
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.adminButtonText
                      }
                    >
                      Reopen Campaign
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
                  activeOpacity={0.85}
                >
                  {isProcessing ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <MaterialIcons
                        name="delete-outline"
                        size={19}
                        color="#FFFFFF"
                      />

                      <Text
                        style={styles.deleteText}
                      >
                        Delete Campaign
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* ================= CHARITIES ================= */}

        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.sectionIcon,
              styles.greenIconContainer,
            ]}
          >
            <MaterialIcons
              name="business"
              size={22}
              color="#16A34A"
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>
              Manage Charities
            </Text>

            <Text style={styles.sectionSubtitle}>
              Verify and manage community organisations
            </Text>
          </View>
        </View>

        {charities.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <MaterialIcons
                name="business"
                size={28}
                color="#94A3B8"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No charities yet
            </Text>

            <Text style={styles.emptyText}>
              Registered charities will appear here.
            </Text>
          </View>
        ) : (
          charities.map((charity) => {
            const isProcessing =
              processingId === charity.id;

            const needsText =
              Array.isArray(charity.needs)
                ? charity.needs.join(", ")
                : charity.needs ||
                  "Not specified";

            const servicesText =
              Array.isArray(
                charity.services
              )
                ? charity.services.join(", ")
                : charity.services ||
                  "Not specified";

            return (
              <View
                key={charity.id}
                style={styles.charityCard}
              >
                <View style={styles.cardAccentGreen} />

                <View style={styles.cardTopRow}>
                  <View
                    style={styles.cardTitleContainer}
                  >
                    <View
                      style={[
                        styles.smallCardIcon,
                        styles.greenIconContainer,
                      ]}
                    >
                      <MaterialIcons
                        name="business"
                        size={18}
                        color="#16A34A"
                      />
                    </View>

                    <Text
                      style={styles.cardTitle}
                      numberOfLines={2}
                    >
                      {charity.name}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      charity.verified
                        ? styles.verifiedCharityBadge
                        : styles.unverifiedCharityBadge,
                    ]}
                  >
                    <MaterialIcons
                      name={
                        charity.verified
                          ? "verified"
                          : "help-outline"
                      }
                      size={14}
                      color={
                        charity.verified
                          ? "#16A34A"
                          : "#D97706"
                      }
                    />

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

                <View style={styles.metaRow}>
                  <MaterialIcons
                    name="location-on"
                    size={17}
                    color="#64748B"
                  />

                  <Text
                    style={styles.cardMeta}
                    numberOfLines={2}
                  >
                    {charity.address ||
                      charity.location ||
                      "Location unavailable"}
                  </Text>
                </View>

                {charity.phone ? (
                  <View style={styles.metaRow}>
                    <MaterialIcons
                      name="phone"
                      size={16}
                      color="#64748B"
                    />

                    <Text
                      style={styles.cardMeta}
                    >
                      {charity.phone}
                    </Text>
                  </View>
                ) : null}

                {charity.email ? (
                  <View style={styles.metaRow}>
                    <MaterialIcons
                      name="email"
                      size={16}
                      color="#64748B"
                    />

                    <Text
                      style={styles.cardMeta}
                      numberOfLines={1}
                    >
                      {charity.email}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.charityInfoBox}>
                  <View
                    style={styles.infoBoxHeader}
                  >
                    <MaterialIcons
                      name="volunteer-activism"
                      size={17}
                      color="#2563EB"
                    />

                    <Text
                      style={
                        styles.charityInfoLabel
                      }
                    >
                      Current Needs
                    </Text>
                  </View>

                  <Text
                    style={styles.charityInfoValue}
                  >
                    {needsText}
                  </Text>
                </View>

                <View style={styles.charityInfoBox}>
                  <View
                    style={styles.infoBoxHeader}
                  >
                    <MaterialIcons
                      name="handshake"
                      size={17}
                      color="#22C55E"
                    />

                    <Text
                      style={
                        styles.charityInfoLabel
                      }
                    >
                      Services
                    </Text>
                  </View>

                  <Text
                    style={styles.charityInfoValue}
                  >
                    {servicesText}
                  </Text>
                </View>

                <Text
                  style={styles.adminActionsTitle}
                >
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
                  activeOpacity={0.85}
                >
                  <MaterialIcons
                    name={
                      charity.verified
                        ? "remove-circle-outline"
                        : "verified"
                    }
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.adminButtonText
                    }
                  >
                    {charity.verified
                      ? "Mark as Unverified"
                      : "Verify Charity"}
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
                  activeOpacity={0.85}
                >
                  {isProcessing ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <MaterialIcons
                        name="delete-outline"
                        size={19}
                        color="#FFFFFF"
                      />

                      <Text
                        style={styles.deleteText}
                      >
                        Delete Charity
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* ================= DONATIONS ================= */}

        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.sectionIcon,
              styles.blueIconContainer,
            ]}
          >
            <MaterialIcons
              name="card-giftcard"
              size={22}
              color="#2563EB"
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>
              Manage Donations
            </Text>

            <Text style={styles.sectionSubtitle}>
              Review and process community donations
            </Text>
          </View>
        </View>

        {donations.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <MaterialIcons
                name="card-giftcard"
                size={28}
                color="#94A3B8"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No donations found
            </Text>

            <Text style={styles.emptyText}>
              New donations will appear here.
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
                <View style={styles.cardAccentBlue} />

                <View style={styles.cardTopRow}>
                  <View
                    style={styles.cardTitleContainer}
                  >
                    <View
                      style={[
                        styles.smallCardIcon,
                        styles.blueIconContainer,
                      ]}
                    >
                      <MaterialIcons
                        name="card-giftcard"
                        size={18}
                        color="#2563EB"
                      />
                    </View>

                    <Text
                      style={styles.cardTitle}
                      numberOfLines={2}
                    >
                      {donation.itemName}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      statusStyles.badge,
                    ]}
                  >
                    <MaterialIcons
                      name={statusStyles.icon}
                      size={14}
                      color={
                        statusStyles.text
                          .color
                      }
                    />

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

                <View style={styles.categoryRow}>
                  <View
                    style={styles.categoryPill}
                  >
                    <MaterialIcons
                      name="category"
                      size={14}
                      color="#2563EB"
                    />

                    <Text
                      style={styles.categoryText}
                    >
                      {donation.category ||
                        "General"}
                    </Text>
                  </View>

                  <View
                    style={styles.categoryPill}
                  >
                    <MaterialIcons
                      name="verified"
                      size={14}
                      color="#64748B"
                    />

                    <Text
                      style={styles.categoryText}
                    >
                      {donation.condition ||
                        "Not specified"}
                    </Text>
                  </View>
                </View>

                <Text
                  style={styles.cardDescription}
                  numberOfLines={2}
                >
                  {donation.description ||
                    "No description provided."}
                </Text>

                <View style={styles.metaRow}>
                  <MaterialIcons
                    name="location-on"
                    size={17}
                    color="#64748B"
                  />

                  <Text
                    style={styles.cardMeta}
                    numberOfLines={2}
                  >
                    {donation.address ||
                      "Location unavailable"}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <MaterialIcons
                    name="local-shipping"
                    size={17}
                    color="#64748B"
                  />

                  <Text
                    style={styles.cardMeta}
                  >
                    {donation.deliveryMethod ||
                      "Delivery method not specified"}
                  </Text>
                </View>

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
                    activeOpacity={0.85}
                  >
                    <MaterialIcons
                      name="check"
                      size={19}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.adminButtonText
                      }
                    >
                      Approve
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
                    activeOpacity={0.85}
                  >
                    <MaterialIcons
                      name="close"
                      size={19}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.adminButtonText
                      }
                    >
                      Reject
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
                  activeOpacity={0.85}
                >
                  {isProcessing ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <MaterialIcons
                        name="delete-outline"
                        size={19}
                        color="#FFFFFF"
                      />

                      <Text
                        style={styles.deleteText}
                      >
                        Delete Donation
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* ================= HELP REQUESTS ================= */}

        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.sectionIcon,
              styles.orangeIconContainer,
            ]}
          >
            <MaterialIcons
              name="volunteer-activism"
              size={22}
              color="#EA580C"
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>
              Manage Help Requests
            </Text>

            <Text style={styles.sectionSubtitle}>
              Review and process community assistance requests
            </Text>
          </View>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <MaterialIcons
                name="volunteer-activism"
                size={28}
                color="#94A3B8"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No help requests
            </Text>

            <Text style={styles.emptyText}>
              New requests for assistance will
              appear here.
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
                <View style={styles.cardAccentOrange} />

                <View style={styles.cardTopRow}>
                  <View
                    style={styles.cardTitleContainer}
                  >
                    <View
                      style={[
                        styles.smallCardIcon,
                        styles.orangeIconContainer,
                      ]}
                    >
                      <MaterialIcons
                        name="volunteer-activism"
                        size={18}
                        color="#EA580C"
                      />
                    </View>

                    <Text
                      style={styles.cardTitle}
                      numberOfLines={2}
                    >
                      {request.itemNeeded}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      statusStyles.badge,
                    ]}
                  >
                    <MaterialIcons
                      name={statusStyles.icon}
                      size={14}
                      color={
                        statusStyles.text
                          .color
                      }
                    />

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

                <View style={styles.categoryRow}>
                  <View
                    style={styles.categoryPill}
                  >
                    <MaterialIcons
                      name="category"
                      size={14}
                      color="#2563EB"
                    />

                    <Text
                      style={styles.categoryText}
                    >
                      {request.category ||
                        "General"}
                    </Text>
                  </View>

                  <View
                    style={styles.categoryPill}
                  >
                    <MaterialIcons
                      name="inventory-2"
                      size={14}
                      color="#64748B"
                    />

                    <Text
                      style={styles.categoryText}
                    >
                      Qty: {request.quantity || 0}
                    </Text>
                  </View>
                </View>

                <Text
                  style={styles.cardDescription}
                  numberOfLines={2}
                >
                  {request.description ||
                    "No description provided."}
                </Text>

                <View style={styles.metaRow}>
                  <MaterialIcons
                    name="location-on"
                    size={17}
                    color="#64748B"
                  />

                  <Text
                    style={styles.cardMeta}
                    numberOfLines={2}
                  >
                    {request.location ||
                      "Location unavailable"}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <MaterialIcons
                    name="priority-high"
                    size={17}
                    color="#F97316"
                  />

                  <Text
                    style={styles.cardMeta}
                  >
                    Urgency:{" "}
                    {request.urgency ||
                      "Normal"}
                  </Text>
                </View>

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
                    activeOpacity={0.85}
                  >
                    <MaterialIcons
                      name="check"
                      size={19}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.adminButtonText
                      }
                    >
                      Approve
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
                    activeOpacity={0.85}
                  >
                    <MaterialIcons
                      name="close"
                      size={19}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.adminButtonText
                      }
                    >
                      Reject
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
                  activeOpacity={0.85}
                >
                  {isProcessing ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <MaterialIcons
                        name="delete-outline"
                        size={19}
                        color="#FFFFFF"
                      />

                      <Text
                        style={styles.deleteText}
                      >
                        Delete Request
                      </Text>
                    </>
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
  /* =========================
     MAIN
  ========================= */

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 18,
  },

  scrollContent: {
    paddingTop: 8,
  },

  /* =========================
     LOADING
  ========================= */

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  loadingText: {
    color: "#1E293B",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 14,
  },

  loadingSubText: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 6,
  },

  /* =========================
     HEADER
  ========================= */

  header: {
    marginTop: 15,
    marginBottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },

  adminLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },

  adminDot: {
    width: 7,
    height: 7,
    borderRadius: 10,
    backgroundColor: "#22C55E",
    marginRight: 7,
  },

  adminLabel: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  welcome: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "500",
  },

  adminName: {
    fontSize: 27,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 2,
  },

  headerSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },

  logoutButtonSmall: {
    backgroundColor: "#FEE2E2",
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  logoutButtonSmallText: {
    color: "#DC2626",
    fontWeight: "800",
    fontSize: 12,
    marginLeft: 6,
  },

  /* =========================
     OVERVIEW
  ========================= */

  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 13,
  },

  overviewTitle: {
    color: "#1E293B",
    fontSize: 19,
    fontWeight: "800",
  },

  overviewSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 3,
  },

  liveBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 10,
    backgroundColor: "#22C55E",
    marginRight: 5,
  },

  liveText: {
    color: "#16A34A",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  /* =========================
     STATS
  ========================= */

  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  statCard: {
    width: "48.3%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#000000",
    shadowOpacity: 0.045,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  blueIconContainer: {
    backgroundColor: "#EFF6FF",
  },

  greenIconContainer: {
    backgroundColor: "#ECFDF5",
  },

  orangeIconContainer: {
    backgroundColor: "#FFF7ED",
  },

  yellowIconContainer: {
    backgroundColor: "#FFFBEB",
  },

  purpleIconContainer: {
    backgroundColor: "#F5F3FF",
  },

  statValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1E293B",
  },

  statLabel: {
    color: "#64748B",
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
  },

  /* =========================
     QUICK ACTIONS
  ========================= */

  quickActionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 17,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#E8EEF6",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  quickActionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  quickActionsTitle: {
    color: "#1E293B",
    fontSize: 17,
    fontWeight: "800",
  },

  quickActionsSubtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 3,
  },

  quickActionGrid: {
    gap: 9,
  },

  quickActionButton: {
    minHeight: 60,
    borderRadius: 15,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },

  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  quickActionText: {
    flex: 1,
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "700",
  },

  /* =========================
     SECTION HEADERS
  ========================= */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    marginTop: 3,
  },

  sectionIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1E293B",
  },

  sectionSubtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 3,
  },

  /* =========================
     CARDS
  ========================= */

  manageCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    padding: 17,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E8EEF6",
    shadowColor: "#000000",
    shadowOpacity: 0.045,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  campaignCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    padding: 17,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E8EEF6",
    shadowColor: "#000000",
    shadowOpacity: 0.045,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  charityCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    padding: 17,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E8EEF6",
    shadowColor: "#000000",
    shadowOpacity: 0.045,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  cardAccentBlue: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#2563EB",
  },

  cardAccentGreen: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#22C55E",
  },

  cardAccentOrange: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#F97316",
  },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 9,
  },

  cardTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },

  smallCardIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    flex: 1,
  },

  cardSubtitle: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 7,
  },

  cardDescription: {
    color: "#64748B",
    lineHeight: 20,
    fontSize: 13,
    marginBottom: 9,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  cardMeta: {
    color: "#475569",
    fontSize: 12,
    marginLeft: 7,
    flex: 1,
    lineHeight: 17,
  },

  /* =========================
     CATEGORY PILLS
  ========================= */

  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 9,
    gap: 7,
  },

  categoryPill: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },

  categoryText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },

  /* =========================
     STATUS
  ========================= */

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
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

  /* =========================
     CAMPAIGN PROGRESS
  ========================= */

  campaignProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 10,
  },

  campaignRightValue: {
    alignItems: "flex-end",
  },

  campaignLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },

  campaignValue: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 3,
  },

  progressPercentageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  progressPercentageLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
  },

  progressPercentage: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "900",
  },

  campaignProgressBar: {
    width: "100%",
    height: 9,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 6,
  },

  campaignProgressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#22C55E",
  },

  /* =========================
     CHARITY INFO
  ========================= */

  charityInfoBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 13,
    padding: 12,
    marginTop: 9,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },

  infoBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  charityInfoLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 6,
  },

  charityInfoValue: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },

  /* =========================
     ADMIN ACTIONS
  ========================= */

  adminActionsTitle: {
    marginTop: 17,
    marginBottom: 9,
    color: "#1E293B",
    fontWeight: "800",
    fontSize: 13,
  },

  adminButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },

  adminButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    marginLeft: 6,
  },

  approveButton: {
    flex: 1,
    minHeight: 45,
    backgroundColor: "#22C55E",
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginRight: 5,
    borderWidth: 1,
    borderColor: "#16A34A",
  },

  rejectButton: {
    flex: 1,
    minHeight: 45,
    backgroundColor: "#F97316",
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginLeft: 5,
    borderWidth: 1,
    borderColor: "#EA580C",
  },

  updateProgressButton: {
    backgroundColor: "#2563EB",
    borderRadius: 13,
    minHeight: 45,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 9,
  },

  completeCampaignButton: {
    flex: 1,
    minHeight: 45,
    backgroundColor: "#22C55E",
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginRight: 5,
  },

  closeCampaignButton: {
    flex: 1,
    minHeight: 45,
    backgroundColor: "#F97316",
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginLeft: 5,
  },

  reopenCampaignButton: {
    backgroundColor: "#2563EB",
    borderRadius: 13,
    minHeight: 45,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 2,
  },

  verifyCharityButton: {
    backgroundColor: "#22C55E",
    borderRadius: 13,
    minHeight: 45,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  unverifyCharityButton: {
    backgroundColor: "#F59E0B",
    borderRadius: 13,
    minHeight: 45,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  deleteButton: {
    minHeight: 45,
    backgroundColor: "#EF4444",
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 10,
  },

  deleteText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    marginLeft: 6,
  },

  disabledButton: {
    opacity: 0.5,
  },

  /* =========================
     EMPTY STATES
  ========================= */

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    padding: 25,
    marginBottom: 27,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8EEF6",
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },

  emptyTitle: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },

  emptyText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 270,
  },
});