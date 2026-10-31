import React, { useEffect, useMemo, useState } from "react";
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
import { StatusBar } from "expo-status-bar";
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
  getDocs,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";
import { useSession } from "../context/SessionContext";

/* =====================================================
   DESIGN TOKENS  (same palette as the Home screen)
===================================================== */

const COLORS = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  ink: "#0F172A",
  text: "#475569",
  muted: "#64748B",
  subtle: "#94A3B8",
  border: "#E2E8F0",
  hairline: "#F1F5F9",

  purple: "#7C3AED",
  primary: "#2563EB",

  blueTint: "#EFF6FF",
  blueStrong: "#DBEAFE",
  greenTint: "#F0FDF4",
  greenBadge: "#DCFCE7",
  greenBorder: "#A7F3D0",
};

/* Each tone has a foreground, soft background and solid colour. */
const TONES = {
  blue: { fg: "#2563EB", bg: "#EFF6FF", solid: "#2563EB" },
  green: { fg: "#16A34A", bg: "#DCFCE7", solid: "#22C55E" },
  amber: { fg: "#D97706", bg: "#FEF3C7", solid: "#D97706" },
  orange: { fg: "#EA580C", bg: "#FFF7ED", solid: "#F97316" },
  red: { fg: "#DC2626", bg: "#FEE2E2", solid: "#DC2626" },
  teal: { fg: "#059669", bg: "#D1FAE5", solid: "#059669" },
  purple: { fg: "#7C3AED", bg: "#F5F3FF", solid: "#7C3AED" },
  slate: { fg: "#475569", bg: "#E2E8F0", solid: "#64748B" },
};

const STATUS_TONES = {
  Pending: { tone: "amber", icon: "schedule" },
  Approved: { tone: "green", icon: "check-circle" },
  Rejected: { tone: "red", icon: "cancel" },
  Collected: { tone: "teal", icon: "local-shipping" },
  Completed: { tone: "blue", icon: "task-alt" },
  Active: { tone: "green", icon: "play-circle" },
  Closed: { tone: "slate", icon: "lock" },
};

const TABS = [
  { key: "campaigns", label: "Campaigns", icon: "campaign" },
  { key: "charities", label: "Charities", icon: "business" },
  { key: "donations", label: "Donations", icon: "card-giftcard" },
  { key: "requests", label: "Requests", icon: "volunteer-activism" },
];

/* =====================================================
   REUSABLE UI COMPONENTS
===================================================== */

const Badge = ({ label, tone = "slate", icon }) => {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon ? <MaterialIcons name={icon} size={13} color={t.fg} /> : null}
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
};

const StatusBadge = ({ status }) => {
  const config = STATUS_TONES[status] || STATUS_TONES.Pending;
  return <Badge label={status} tone={config.tone} icon={config.icon} />;
};

const Button = ({
  label,
  icon,
  tone = "blue",
  variant = "solid",
  onPress,
  disabled,
  loading,
  flex,
  style,
}) => {
  const t = TONES[tone];
  const isSolid = variant === "solid";
  const isOutline = variant === "outline";

  const backgroundColor = isSolid ? t.solid : isOutline ? "transparent" : t.bg;
  const color = isSolid ? "#FFFFFF" : t.fg;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor: isOutline ? t.solid : "transparent",
          borderWidth: isOutline ? 1.2 : 0,
        },
        flex ? { flex: 1 } : null,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isSolid ? "#FFFFFF" : t.fg} />
      ) : (
        <>
          {icon ? <MaterialIcons name={icon} size={18} color={color} /> : null}
          <Text style={[styles.buttonText, { color }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const IconTile = ({ icon, tone = "blue", size = 40 }) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.32,
      backgroundColor: TONES[tone].bg,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <MaterialIcons name={icon} size={size * 0.52} color={TONES[tone].solid} />
  </View>
);

const Card = ({ tone = "blue", children }) => (
  <View style={styles.card}>
    <View style={[styles.cardAccent, { backgroundColor: TONES[tone].solid }]} />
    {children}
  </View>
);

const CardHeader = ({ icon, tone, title, badge }) => (
  <View style={styles.cardHeader}>
    <View style={styles.cardHeaderLeft}>
      <IconTile icon={icon} tone={tone} size={38} />
      <Text style={styles.cardTitle} numberOfLines={2}>
        {title}
      </Text>
    </View>
    {badge}
  </View>
);

const MetaRow = ({ icon, text, numberOfLines = 2 }) => (
  <View style={styles.metaRow}>
    <MaterialIcons name={icon} size={16} color={COLORS.muted} />
    <Text style={styles.metaText} numberOfLines={numberOfLines}>
      {text}
    </Text>
  </View>
);

const Chip = ({ icon, text }) => (
  <View style={styles.chip}>
    <MaterialIcons name={icon} size={13} color={COLORS.purple} />
    <Text style={styles.chipText}>{text}</Text>
  </View>
);

const Divider = ({ label }) => (
  <View style={styles.dividerWrap}>
    <Text style={styles.dividerLabel}>{label}</Text>
    <View style={styles.dividerLine} />
  </View>
);

const InfoBlock = ({ icon, tone, label, value }) => (
  <View style={styles.infoBlock}>
    <View style={styles.infoBlockHeader}>
      <MaterialIcons name={icon} size={15} color={TONES[tone].solid} />
      <Text style={styles.infoBlockLabel}>{label}</Text>
    </View>
    <Text style={styles.infoBlockValue}>{value}</Text>
  </View>
);

const EmptyState = ({ icon, title, text }) => (
  <View style={styles.emptyCard}>
    <View style={styles.emptyIcon}>
      <MaterialIcons name={icon} size={28} color={COLORS.subtle} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

const StatTile = ({ icon, tone, value, label }) => (
  <View style={styles.statTile}>
    <IconTile icon={icon} tone={tone} size={38} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const QuickAction = ({ icon, tone, label, onPress }) => (
  <TouchableOpacity
    style={styles.quickAction}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <IconTile icon={icon} tone={tone} size={38} />
    <Text style={styles.quickActionText} numberOfLines={1}>
      {label}
    </Text>
    <MaterialIcons name="chevron-right" size={18} color={COLORS.subtle} />
  </TouchableOpacity>
);

/* =====================================================
   HELPERS
===================================================== */

const showMessage = (title, message) => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

/* One confirmation helper for web and native. */
const confirmAction = ({
  title,
  message,
  confirmText = "Confirm",
  destructive = false,
  onConfirm,
}) => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    {
      text: confirmText,
      style: destructive ? "destructive" : "default",
      onPress: onConfirm,
    },
  ]);
};

const recipientDisplayName = (recipient) =>
  recipient?.name ||
  recipient?.fullName ||
  recipient?.email ||
  "Recipient/NGO";

/* =====================================================
   SCREEN
===================================================== */

const AdminDashboard = ({ navigation }) => {
  const [adminData, setAdminData] = useState(null);
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [charities, setCharities] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [assigningDonationId, setAssigningDonationId] = useState(null);
  const [expandedAssignId, setExpandedAssignId] = useState(null);
  const [activeTab, setActiveTab] = useState("donations");

  const { endSession, writeAuditLog } = useSession();

  /* ---------- Admin access check ---------- */
  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      navigation.replace("Login");
      return;
    }

    const checkAdminAccess = async () => {
      try {
        const userSnapshot = await getDoc(doc(db, "users", user.uid));

        if (!userSnapshot.exists()) {
          showMessage("Access Denied", "Your user profile could not be found.");
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
        console.log("ADMIN ACCESS ERROR:", error.code, error.message);
        showMessage(
          "Admin Error",
          error.message || "Administrator access could not be checked."
        );
        navigation.replace("MainTabs");
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [navigation]);

  /* ---------- Live data ---------- */
  useEffect(() => {
    if (loading || !adminData) {
      return;
    }

    const listen = (collectionName, setter, label) =>
      onSnapshot(
        query(
          collection(db, collectionName),
          orderBy("createdAt", "desc"),
          limit(20)
        ),
        (snapshot) => {
          setter(
            snapshot.docs.map((document) => ({
              id: document.id,
              ...document.data(),
            }))
          );
        },
        (error) => {
          console.log(`ADMIN ${label} ERROR:`, error.code, error.message);
        }
      );

    const unsubscribeDonations = listen("donations", setDonations, "DONATIONS");
    const unsubscribeRequests = listen("requests", setRequests, "REQUESTS");
    const unsubscribeCampaigns = listen("campaigns", setCampaigns, "CAMPAIGNS");
    const unsubscribeCharities = listen("charities", setCharities, "CHARITIES");

    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => setUsersCount(snapshot.size),
      (error) => {
        console.log("ADMIN USERS ERROR:", error.code, error.message);
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

  /* ---------- Recipients / NGOs ---------- */
  useEffect(() => {
    if (loading || !adminData) {
      return;
    }

    const loadRecipients = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const recipientList = [];

        usersSnapshot.forEach((userDoc) => {
          const userData = userDoc.data();
          const role = String(userData.role || "").trim().toLowerCase();

          if (role === "recipient" || role === "ngo" || role === "ngos") {
            recipientList.push({ uid: userDoc.id, ...userData });
          }
        });

        setRecipients(recipientList);
      } catch (error) {
        console.error("Error loading recipients:", error);
      }
    };

    loadRecipients();
  }, [loading, adminData]);

  /* ---------- Notifications ---------- */
  const createNotification = async (userId, title, message, type) => {
    if (!userId) {
      console.log("NOTIFICATION SKIPPED: User ID is missing.");
      return;
    }

    try {
      await addDoc(collection(db, "notifications"), {
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.log("NOTIFICATION ERROR:", error.code, error.message);
    }
  };

  /* ---------- Donation assignment ---------- */
  const assignDonationToRecipient = async (donationId, recipientUid) => {
    if (!donationId || !recipientUid) {
      showMessage("Error", "Please select a donation and recipient.");
      return;
    }

    const recipientName = recipientDisplayName(
      recipients.find((recipient) => recipient.uid === recipientUid)
    );

    try {
      setAssigningDonationId(donationId);

      await updateDoc(doc(db, "donations", donationId), {
        recipientId: recipientUid,
        assignedAt: serverTimestamp(),
        assignedBy: auth.currentUser?.uid || "",
      });

      await createNotification(
        recipientUid,
        "Donation assigned",
        "A donation has been assigned to you by the administrator.",
        "donation"
      );

      setExpandedAssignId(null);
      showMessage("Success", `Donation assigned to ${recipientName} successfully.`);
    } catch (error) {
      console.error("Donation assignment error:", error.code, error.message);
      showMessage(
        "Assignment Failed",
        `${error.code || "Error"}: ${
          error.message ||
          "Could not assign donation. Check your Firestore security rules."
        }`
      );
    } finally {
      setAssigningDonationId(null);
    }
  };

  /* ---------- Donation status ---------- */
  const updateDonationStatus = async (donation, newStatus) => {
    if (!donation?.id) {
      showMessage("Update Error", "The donation ID could not be found.");
      return;
    }

    const currentStatus = donation.status || "Pending";

    const allowedTransitions = {
      Pending: ["Approved", "Rejected"],
      Approved: ["Collected"],
      Collected: ["Completed"],
      Rejected: [],
      Completed: [],
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      showMessage(
        "Invalid Status Change",
        `A donation cannot move from ${currentStatus} to ${newStatus}.`
      );
      return;
    }

    const adminId = auth.currentUser?.uid;

    if (!adminId) {
      showMessage(
        "Authentication Error",
        "Please sign in again before updating donations."
      );
      return;
    }

    try {
      setProcessingId(donation.id);

      await updateDoc(doc(db, "donations", donation.id), {
        status: newStatus,
        reviewedAt: serverTimestamp(),
        reviewedBy: adminId,
        statusUpdatedAt: serverTimestamp(),
        ...(newStatus === "Collected"
          ? {
              collectedAt: serverTimestamp(),
              collectedBy: adminId,
              handoverActorName:
                adminData?.name || adminData?.fullName || "Administrator",
            }
          : {}),
        statusHistory: arrayUnion({
          previousStatus: currentStatus,
          newStatus,
          changedBy: adminId,
          changedAt: new Date(),
          ...(newStatus === "Collected"
            ? { note: "Physical handover recorded by administrator." }
            : {}),
        }),
      });

      await writeAuditLog({
        action: `DONATION_${newStatus.toUpperCase()}`,
        description:
          `Administrator changed donation "${donation.itemName}" ` +
          `from ${currentStatus} to ${newStatus}.`,
        actorRole: "Admin",
        targetType: "donation",
        targetId: donation.id,
        metadata: {
          itemName: donation.itemName || "",
          previousStatus: currentStatus,
          newStatus,
          ownerId: donation.userId || "",
        },
      });

      const notificationMessages = {
        Approved: `Your donation "${donation.itemName}" has been approved.`,
        Rejected: `Your donation "${donation.itemName}" has been rejected.`,
        Collected: `Your donation "${donation.itemName}" has been marked as collected.`,
        Completed: `Your donation "${donation.itemName}" has been marked as completed.`,
      };

      await createNotification(
        donation.userId,
        `Donation ${newStatus}`,
        notificationMessages[newStatus],
        "donation"
      );

      showMessage(
        "Success",
        `Donation status changed from ${currentStatus} to ${newStatus}.`
      );
    } catch (error) {
      console.log("DONATION UPDATE ERROR:", error.code, error.message);
      showMessage(
        "Update Error",
        `${error.code || "Unknown error"}\n\n${
          error.message || "The donation could not be updated."
        }`
      );
    } finally {
      setProcessingId(null);
    }
  };

  /* ---------- Request status ---------- */
  const updateRequestStatus = async (request, newStatus) => {
    if (!request?.id) {
      showMessage("Update Error", "The request ID could not be found.");
      return;
    }

    try {
      setProcessingId(request.id);

      await updateDoc(doc(db, "requests", request.id), {
        status: newStatus,
        reviewedAt: serverTimestamp(),
        reviewedBy: auth.currentUser?.uid || "",
      });

      await writeAuditLog({
        action:
          newStatus === "Approved" ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
        description:
          `Administrator changed request "${request.itemNeeded}" ` +
          `to ${newStatus}.`,
        actorRole: "Admin",
        targetType: "request",
        targetId: request.id,
        metadata: {
          itemNeeded: request.itemNeeded || "",
          previousStatus: request.status || "Pending",
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

      showMessage("Success", `Request ${newStatus.toLowerCase()} successfully.`);
    } catch (error) {
      console.log("REQUEST UPDATE ERROR:", error.code, error.message);
      showMessage(
        "Update Error",
        `${error.code || "Unknown error"}\n\n${
          error.message || "The request could not be updated."
        }`
      );
    } finally {
      setProcessingId(null);
    }
  };

  /* ---------- Deletions ---------- */
  const performDonationDelete = async (donation) => {
    if (!donation?.id) {
      showMessage("Delete Error", "The donation ID could not be found.");
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

      await deleteDoc(doc(db, "donations", donation.id));

      await writeAuditLog({
        action: "DONATION_DELETED",
        description: `Administrator deleted donation "${donation.itemName}".`,
        actorRole: "Admin",
        targetType: "donation",
        targetId: donation.id,
        metadata: {
          itemName: donation.itemName || "",
          ownerId: donation.userId || "",
          previousStatus: donation.status || "Pending",
        },
      });

      showMessage("Deleted", "Donation deleted successfully.");
    } catch (error) {
      console.log("DONATION DELETE ERROR:", error.code, error.message);
      showMessage(
        "Delete Error",
        `${error.code || "Unknown error"}\n\n${
          error.message || "The donation could not be deleted."
        }`
      );
    } finally {
      setProcessingId(null);
    }
  };

  const deleteDonation = (donation) =>
    confirmAction({
      title: "Delete Donation",
      message: `Are you sure you want to delete "${donation.itemName}"?`,
      confirmText: "Delete",
      destructive: true,
      onConfirm: () => performDonationDelete(donation),
    });

  const performRequestDelete = async (request) => {
    if (!request?.id) {
      showMessage("Delete Error", "The request ID could not be found.");
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

      await deleteDoc(doc(db, "requests", request.id));

      await writeAuditLog({
        action: "REQUEST_DELETED",
        description: `Administrator deleted request "${request.itemNeeded}".`,
        actorRole: "Admin",
        targetType: "request",
        targetId: request.id,
        metadata: {
          itemNeeded: request.itemNeeded || "",
          ownerId: request.userId || "",
          previousStatus: request.status || "Pending",
        },
      });

      showMessage("Deleted", "Request deleted successfully.");
    } catch (error) {
      console.log("REQUEST DELETE ERROR:", error.code, error.message);
      showMessage(
        "Delete Error",
        `${error.code || "Unknown error"}\n\n${
          error.message || "The request could not be deleted."
        }`
      );
    } finally {
      setProcessingId(null);
    }
  };

  const deleteRequest = (request) =>
    confirmAction({
      title: "Delete Request",
      message: `Are you sure you want to delete the request for "${request.itemNeeded}"?`,
      confirmText: "Delete",
      destructive: true,
      onConfirm: () => performRequestDelete(request),
    });

  /* ---------- Campaigns ---------- */
  const updateCampaignStatus = async (campaign, newStatus) => {
    if (!campaign?.id) {
      showMessage("Campaign Error", "The campaign ID could not be found.");
      return;
    }

    try {
      setProcessingId(campaign.id);

      await updateDoc(doc(db, "campaigns", campaign.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || "",
      });

      await writeAuditLog({
        action: "CAMPAIGN_STATUS_UPDATED",
        description:
          `Administrator changed campaign "${campaign.title}" ` +
          `to ${newStatus}.`,
        actorRole: "Admin",
        targetType: "campaign",
        targetId: campaign.id,
        metadata: {
          campaignTitle: campaign.title || "",
          previousStatus: campaign.status || "Active",
          newStatus,
        },
      });

      showMessage("Campaign Updated", `"${campaign.title}" is now ${newStatus}.`);
    } catch (error) {
      console.log("CAMPAIGN UPDATE ERROR:", error.code, error.message);
      showMessage(
        "Campaign Error",
        error.message || "The campaign could not be updated."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const performCampaignDelete = async (campaign) => {
    try {
      setProcessingId(campaign.id);

      await deleteDoc(doc(db, "campaigns", campaign.id));

      await writeAuditLog({
        action: "CAMPAIGN_DELETED",
        description: `Administrator deleted campaign "${campaign.title}".`,
        actorRole: "Admin",
        targetType: "campaign",
        targetId: campaign.id,
        metadata: {
          campaignTitle: campaign.title || "",
          previousStatus: campaign.status || "Active",
        },
      });

      showMessage("Campaign Deleted", `"${campaign.title}" was deleted successfully.`);
    } catch (error) {
      console.log("CAMPAIGN DELETE ERROR:", error.code, error.message);
      showMessage(
        "Delete Error",
        error.message || "The campaign could not be deleted."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const deleteCampaign = (campaign) => {
    if (!campaign?.id) {
      showMessage("Delete Error", "The campaign ID could not be found.");
      return;
    }

    confirmAction({
      title: "Delete Campaign",
      message: `Are you sure you want to delete "${campaign.title}"?`,
      confirmText: "Delete",
      destructive: true,
      onConfirm: () => performCampaignDelete(campaign),
    });
  };

  const getCampaignProgress = (campaign) => {
    const isMoney = campaign.campaignType === "Money";

    const target = Number(
      isMoney ? campaign.targetAmount || 0 : campaign.targetItems || 0
    );
    const current = Number(
      isMoney ? campaign.currentAmount || 0 : campaign.collectedItems || 0
    );

    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

    return isMoney
      ? {
          goal: `R${target.toLocaleString()}`,
          progress: `R${current.toLocaleString()} raised`,
          percentage,
        }
      : {
          goal: `${target} ${campaign.itemName || "items"}`,
          progress: `${current} collected`,
          percentage,
        };
  };

  /* ---------- Charities ---------- */
  const updateCharityVerification = async (charity, verified) => {
    if (!charity?.id) {
      showMessage("Charity Error", "The charity ID could not be found.");
      return;
    }

    try {
      setProcessingId(charity.id);

      await updateDoc(doc(db, "charities", charity.id), {
        verified,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || "",
      });

      await writeAuditLog({
        action: verified ? "CHARITY_VERIFIED" : "CHARITY_UNVERIFIED",
        description: verified
          ? `Administrator verified charity "${charity.name}".`
          : `Administrator marked charity "${charity.name}" as unverified.`,
        actorRole: "Admin",
        targetType: "charity",
        targetId: charity.id,
        metadata: {
          charityName: charity.name || "",
          previousVerified: charity.verified === true,
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
      console.log("CHARITY UPDATE ERROR:", error.code, error.message);
      showMessage(
        "Charity Error",
        error.message || "The charity could not be updated."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const performCharityDelete = async (charity) => {
    if (!charity?.id) {
      showMessage("Delete Error", "The charity ID could not be found.");
      return;
    }

    try {
      setProcessingId(charity.id);

      await deleteDoc(doc(db, "charities", charity.id));

      await writeAuditLog({
        action: "CHARITY_DELETED",
        description: `Administrator deleted charity "${charity.name}".`,
        actorRole: "Admin",
        targetType: "charity",
        targetId: charity.id,
        metadata: {
          charityName: charity.name || "",
          verified: charity.verified === true,
        },
      });

      showMessage("Charity Deleted", `"${charity.name}" was deleted successfully.`);
    } catch (error) {
      console.log("CHARITY DELETE ERROR:", error.code, error.message);
      showMessage(
        "Delete Error",
        error.message || "The charity could not be deleted."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const deleteCharity = (charity) => {
    if (!charity?.id) {
      showMessage("Delete Error", "The charity ID could not be found.");
      return;
    }

    confirmAction({
      title: "Delete Charity",
      message: `Are you sure you want to delete "${charity.name}"?`,
      confirmText: "Delete",
      destructive: true,
      onConfirm: () => performCharityDelete(charity),
    });
  };

  /* ---------- Logout ---------- */
  const handleLogout = () =>
    confirmAction({
      title: "Logout",
      message: "Are you sure you want to log out?",
      confirmText: "Logout",
      onConfirm: async () => {
        try {
          await endSession({
            status: "LoggedOut",
            reason: "Administrator logged out manually from Admin Dashboard.",
          });
        } catch (error) {
          console.log("ADMIN LOGOUT ERROR:", error.code, error.message);
          showMessage(
            "Logout Error",
            error.message || "You could not be logged out."
          );
        }
      },
    });

  /* ---------- Derived values ---------- */
  const pendingCount = useMemo(
    () =>
      donations.filter((item) => (item.status || "Pending") === "Pending")
        .length +
      requests.filter((item) => (item.status || "Pending") === "Pending")
        .length,
    [donations, requests]
  );

  const tabCounts = {
    campaigns: campaigns.length,
    charities: charities.length,
    donations: donations.length,
    requests: requests.length,
  };

  /* =====================================================
     SECTION RENDERERS
  ===================================================== */

  const renderCampaigns = () => {
    if (campaigns.length === 0) {
      return (
        <EmptyState
          icon="campaign"
          title="No campaigns yet"
          text="Campaigns created by administrators will appear here."
        />
      );
    }

    return campaigns.map((campaign) => {
      const progress = getCampaignProgress(campaign);
      const status = campaign.status || "Active";
      const isProcessing = processingId === campaign.id;

      return (
        <Card key={campaign.id} tone="orange">
          <CardHeader
            icon="campaign"
            tone="orange"
            title={campaign.title}
            badge={<StatusBadge status={status} />}
          />

          <Text style={[styles.cardSubtitle, { color: TONES.orange.fg }]}>
            {campaign.organization || "Ubuntu Connect"}
          </Text>

          <Text style={styles.cardDescription} numberOfLines={3}>
            {campaign.description || "No description provided."}
          </Text>

          <MetaRow
            icon="location-on"
            text={campaign.location || "Location unavailable"}
          />

          <View style={styles.progressBox}>
            <View style={styles.progressTop}>
              <View>
                <Text style={styles.progressLabel}>GOAL</Text>
                <Text style={styles.progressValue}>{progress.goal}</Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.progressLabel}>PROGRESS</Text>
                <Text style={styles.progressValue}>{progress.progress}</Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress.percentage}%` },
                ]}
              />
            </View>

            <Text style={styles.progressPercent}>
              {Math.round(progress.percentage)}% complete
            </Text>
          </View>

          <Button
            label="Update Progress"
            icon="trending-up"
            tone="blue"
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
          />

          <Divider label="Campaign actions" />

          {status === "Active" ? (
            <View style={styles.buttonRow}>
              <Button
                flex
                label="Complete"
                icon="check-circle"
                tone="green"
                variant="soft"
                disabled={isProcessing}
                onPress={() => updateCampaignStatus(campaign, "Completed")}
              />
              <Button
                flex
                label="Close"
                icon="lock"
                tone="slate"
                variant="soft"
                disabled={isProcessing}
                onPress={() => updateCampaignStatus(campaign, "Closed")}
              />
            </View>
          ) : (
            <Button
              label="Reopen Campaign"
              icon="lock-open"
              tone="blue"
              variant="soft"
              disabled={isProcessing}
              onPress={() => updateCampaignStatus(campaign, "Active")}
            />
          )}

          <Button
            label="Delete Campaign"
            icon="delete-outline"
            tone="red"
            variant="outline"
            loading={isProcessing}
            style={styles.deleteSpacing}
            onPress={() => deleteCampaign(campaign)}
          />
        </Card>
      );
    });
  };

  const renderCharities = () => {
    if (charities.length === 0) {
      return (
        <EmptyState
          icon="business"
          title="No charities yet"
          text="Registered charities will appear here."
        />
      );
    }

    return charities.map((charity) => {
      const isProcessing = processingId === charity.id;

      const needsText = Array.isArray(charity.needs)
        ? charity.needs.join(", ")
        : charity.needs || "Not specified";

      const servicesText = Array.isArray(charity.services)
        ? charity.services.join(", ")
        : charity.services || "Not specified";

      return (
        <Card key={charity.id} tone="purple">
          <CardHeader
            icon="business"
            tone="purple"
            title={charity.name}
            badge={
              <Badge
                label={charity.verified ? "Verified" : "Unverified"}
                tone={charity.verified ? "green" : "amber"}
                icon={charity.verified ? "verified" : "help-outline"}
              />
            }
          />

          <Text style={[styles.cardSubtitle, { color: TONES.purple.fg }]}>
            {charity.type || "Community Organisation"}
          </Text>

          <Text style={styles.cardDescription} numberOfLines={3}>
            {charity.description || "No description provided."}
          </Text>

          <MetaRow
            icon="location-on"
            text={charity.address || charity.location || "Location unavailable"}
          />
          {charity.phone ? <MetaRow icon="phone" text={charity.phone} /> : null}
          {charity.email ? (
            <MetaRow icon="email" text={charity.email} numberOfLines={1} />
          ) : null}

          <InfoBlock
            icon="volunteer-activism"
            tone="blue"
            label="Current needs"
            value={needsText}
          />
          <InfoBlock
            icon="handshake"
            tone="green"
            label="Services"
            value={servicesText}
          />

          <Divider label="Charity actions" />

          <Button
            label={charity.verified ? "Mark as Unverified" : "Verify Charity"}
            icon={charity.verified ? "remove-circle-outline" : "verified"}
            tone={charity.verified ? "amber" : "green"}
            variant={charity.verified ? "soft" : "solid"}
            disabled={isProcessing}
            onPress={() => updateCharityVerification(charity, !charity.verified)}
          />

          <Button
            label="Delete Charity"
            icon="delete-outline"
            tone="red"
            variant="outline"
            loading={isProcessing}
            style={styles.deleteSpacing}
            onPress={() => deleteCharity(charity)}
          />
        </Card>
      );
    });
  };

  const renderDonations = () => {
    if (donations.length === 0) {
      return (
        <EmptyState
          icon="card-giftcard"
          title="No donations found"
          text="New donations will appear here."
        />
      );
    }

    return donations.map((donation) => {
      const status = donation.status || "Pending";
      const isProcessing = processingId === donation.id;
      const isAssigning = assigningDonationId === donation.id;
      const isExpanded = expandedAssignId === donation.id;

      const assignedRecipient = recipients.find(
        (recipient) => recipient.uid === donation.recipientId
      );

      return (
        <Card key={donation.id} tone="blue">
          <CardHeader
            icon="card-giftcard"
            tone="blue"
            title={donation.itemName}
            badge={<StatusBadge status={status} />}
          />

          <View style={styles.chipRow}>
            <Chip icon="category" text={donation.category || "General"} />
            <Chip icon="verified" text={donation.condition || "Not specified"} />
          </View>

          <Text style={styles.cardDescription} numberOfLines={2}>
            {donation.description || "No description provided."}
          </Text>

          <MetaRow
            icon="location-on"
            text={donation.address || "Location unavailable"}
          />
          <MetaRow
            icon="local-shipping"
            text={donation.deliveryMethod || "Delivery method not specified"}
            numberOfLines={1}
          />

          {/* ---------- Assignment ---------- */}
          <View style={styles.assignBox}>
            <View style={styles.assignHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.assignLabel}>ASSIGNED TO</Text>
                <Text style={styles.assignValue} numberOfLines={1}>
                  {donation.recipientId
                    ? assignedRecipient
                      ? recipientDisplayName(assignedRecipient)
                      : "Recipient/NGO account"
                    : "Not assigned yet"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.assignToggle}
                activeOpacity={0.8}
                onPress={() => setExpandedAssignId(isExpanded ? null : donation.id)}
              >
                <Text style={styles.assignToggleText}>
                  {isExpanded
                    ? "Close"
                    : donation.recipientId
                      ? "Reassign"
                      : "Assign"}
                </Text>
                <MaterialIcons
                  name={isExpanded ? "expand-less" : "expand-more"}
                  size={18}
                  color={TONES.blue.fg}
                />
              </TouchableOpacity>
            </View>

            {isExpanded ? (
              recipients.length === 0 ? (
                <Text style={styles.assignEmpty}>
                  No recipient or NGO accounts found. Check the role field in the
                  users collection.
                </Text>
              ) : (
                <View style={styles.recipientList}>
                  {recipients.map((recipient) => {
                    const name = recipientDisplayName(recipient);
                    const isAssigned = donation.recipientId === recipient.uid;

                    return (
                      <TouchableOpacity
                        key={recipient.uid}
                        style={[
                          styles.recipientRow,
                          isAssigned && styles.recipientRowActive,
                          isAssigning && styles.buttonDisabled,
                        ]}
                        disabled={isAssigning || isAssigned}
                        activeOpacity={0.85}
                        onPress={() =>
                          confirmAction({
                            title: "Assign Donation",
                            message: `Assign this donation to ${name}?`,
                            confirmText: "Assign",
                            onConfirm: () =>
                              assignDonationToRecipient(donation.id, recipient.uid),
                          })
                        }
                      >
                        <View style={styles.recipientAvatar}>
                          <Text style={styles.recipientAvatarText}>
                            {name.charAt(0).toUpperCase()}
                          </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.recipientName} numberOfLines={1}>
                            {name}
                          </Text>
                          <Text style={styles.recipientRole}>
                            {recipient.role || "Recipient"}
                          </Text>
                        </View>

                        {isAssigned ? (
                          <MaterialIcons
                            name="check-circle"
                            size={20}
                            color={TONES.green.solid}
                          />
                        ) : isAssigning ? (
                          <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                          <MaterialIcons
                            name="chevron-right"
                            size={20}
                            color={COLORS.subtle}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )
            ) : null}
          </View>

          <Divider label="Admin actions" />

          {status === "Pending" ? (
            <View style={styles.buttonRow}>
              <Button
                flex
                label="Approve"
                icon="check"
                tone="green"
                disabled={isProcessing}
                onPress={() => updateDonationStatus(donation, "Approved")}
              />
              <Button
                flex
                label="Reject"
                icon="close"
                tone="orange"
                disabled={isProcessing}
                onPress={() => updateDonationStatus(donation, "Rejected")}
              />
            </View>
          ) : null}

          {status === "Approved" ? (
            <Button
              label="Record Handover"
              icon="local-shipping"
              tone="teal"
              loading={isProcessing}
              onPress={() =>
                confirmAction({
                  title: "Record Handover",
                  message:
                    `Confirm the physical handover of "${
                      donation.itemName || "this donation"
                    }"? ` +
                    "Only continue if the donation has actually been handed over.",
                  confirmText: "Yes, handed over",
                  onConfirm: () => updateDonationStatus(donation, "Collected"),
                })
              }
            />
          ) : null}

          {status === "Collected" ? (
            <View style={styles.noticeBox}>
              <MaterialIcons name="hourglass-top" size={18} color={TONES.teal.fg} />
              <Text style={styles.noticeText}>
                Handover recorded. Waiting for the recipient to confirm receipt.
              </Text>
            </View>
          ) : null}

          {status === "Rejected" || status === "Completed" ? (
            <View style={[styles.noticeBox, { backgroundColor: COLORS.hairline }]}>
              <MaterialIcons name="info-outline" size={18} color={COLORS.muted} />
              <Text style={[styles.noticeText, { color: COLORS.muted }]}>
                This donation is {status.toLowerCase()}. No further status changes
                are available.
              </Text>
            </View>
          ) : null}

          <Button
            label="Delete Donation"
            icon="delete-outline"
            tone="red"
            variant="outline"
            loading={isProcessing}
            style={styles.deleteSpacing}
            onPress={() => deleteDonation(donation)}
          />
        </Card>
      );
    });
  };

  const renderRequests = () => {
    if (requests.length === 0) {
      return (
        <EmptyState
          icon="volunteer-activism"
          title="No help requests"
          text="New requests for assistance will appear here."
        />
      );
    }

    return requests.map((request) => {
      const status = request.status || "Pending";
      const isProcessing = processingId === request.id;

      return (
        <Card key={request.id} tone="green">
          <CardHeader
            icon="volunteer-activism"
            tone="green"
            title={request.itemNeeded}
            badge={<StatusBadge status={status} />}
          />

          <View style={styles.chipRow}>
            <Chip icon="category" text={request.category || "General"} />
            <Chip icon="inventory-2" text={`Qty: ${request.quantity || 0}`} />
            <Chip icon="priority-high" text={request.urgency || "Normal"} />
          </View>

          <Text style={styles.cardDescription} numberOfLines={2}>
            {request.description || "No description provided."}
          </Text>

          <MetaRow
            icon="location-on"
            text={request.location || "Location unavailable"}
          />

          <Divider label="Admin actions" />

          <View style={styles.buttonRow}>
            <Button
              flex
              label="Approve"
              icon="check"
              tone="green"
              disabled={isProcessing || status === "Approved"}
              onPress={() => updateRequestStatus(request, "Approved")}
            />
            <Button
              flex
              label="Reject"
              icon="close"
              tone="orange"
              disabled={isProcessing || status === "Rejected"}
              onPress={() => updateRequestStatus(request, "Rejected")}
            />
          </View>

          <Button
            label="Delete Request"
            icon="delete-outline"
            tone="red"
            variant="outline"
            loading={isProcessing}
            style={styles.deleteSpacing}
            onPress={() => deleteRequest(request)}
          />
        </Card>
      );
    });
  };

  const sectionMeta = {
    campaigns: {
      title: "Manage Campaigns",
      subtitle: "Monitor and control community campaigns",
      render: renderCampaigns,
    },
    charities: {
      title: "Manage Charities",
      subtitle: "Verify and manage community organisations",
      render: renderCharities,
    },
    donations: {
      title: "Manage Donations",
      subtitle: "Review, assign and process community donations",
      render: renderDonations,
    },
    requests: {
      title: "Manage Help Requests",
      subtitle: "Review and process community assistance requests",
      render: renderRequests,
    },
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <IconTile icon="admin-panel-settings" tone="purple" size={72} />
        <ActivityIndicator
          size="large"
          color={COLORS.purple}
          style={{ marginTop: 22 }}
        />
        <Text style={styles.loadingText}>Checking admin access...</Text>
        <Text style={styles.loadingSubText}>Please wait a moment</Text>
      </SafeAreaView>
    );
  }

  /* =====================================================
     MAIN RENDER
  ===================================================== */

  const currentSection = sectionMeta[activeTab];
  const adminName =
    adminData?.fullName || adminData?.name || "Administrator";

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {/* Dark icons (time, battery, wifi, sim) on the light status area */}
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[2]}
      >
        {/* ---------- Hero header ---------- */}
        <View style={styles.hero}>
          <View>
            <View style={styles.heroInner}>
              <View style={styles.heroTopRow}>
                <View style={styles.rolePill}>
                  <View style={styles.roleDot} />
                  <Text style={styles.roleText}>ADMINISTRATOR</Text>
                </View>

                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={handleLogout}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="logout" size={16} color="#FFFFFF" />
                  <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.heroNameRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {adminName.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.welcome}>Welcome back</Text>
                  <Text style={styles.adminName} numberOfLines={1}>
                    {adminName}
                  </Text>
                </View>
              </View>

              <Text style={styles.heroSubtitle}>
                Manage Ubuntu Connect from one place.
              </Text>

              <View style={styles.heroChipRow}>
                <View style={styles.heroChip}>
                  <MaterialIcons
                    name="pending-actions"
                    size={15}
                    color="#FFFFFF"
                  />
                  <Text style={styles.heroChipText}>
                    {pendingCount} pending review
                  </Text>
                </View>

                <View style={styles.heroChip}>
                  <MaterialIcons name="people" size={15} color="#FFFFFF" />
                  <Text style={styles.heroChipText}>{usersCount} users</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ---------- Overview + quick actions ---------- */}
        <View style={styles.body}>
          <View style={styles.overviewHeader}>
            <View>
              <Text style={styles.overviewTitle}>Overview</Text>
              <Text style={styles.overviewSubtitle}>Live platform activity</Text>
            </View>

            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatTile icon="people" tone="purple" value={usersCount} label="Users" />
            <StatTile
              icon="card-giftcard"
              tone="blue"
              value={donations.length}
              label="Donations"
            />
            <StatTile
              icon="volunteer-activism"
              tone="green"
              value={requests.length}
              label="Requests"
            />
            <StatTile
              icon="schedule"
              tone="orange"
              value={pendingCount}
              label="Pending"
            />
          </View>

          <View style={styles.quickCard}>
            <View style={styles.quickHeader}>
              <View>
                <Text style={styles.quickTitle}>Quick actions</Text>
                <Text style={styles.quickSubtitle}>
                  Create and manage platform resources
                </Text>
              </View>
              <View style={styles.quickHeaderIcon}>
                <MaterialIcons
                  name="dashboard-customize"
                  size={20}
                  color={COLORS.purple}
                />
              </View>
            </View>

            <View style={styles.quickGrid}>
              <QuickAction
                icon="campaign"
                tone="orange"
                label="New Campaign"
                onPress={() => navigation.navigate("CreateCampaign")}
              />
              <QuickAction
                icon="business"
                tone="purple"
                label="New Charity"
                onPress={() => navigation.navigate("CreateCharity")}
              />
              <QuickAction
                icon="fact-check"
                tone="blue"
                label="Audit Logs"
                onPress={() => navigation.navigate("AuditLog")}
              />
              <QuickAction
                icon="flag"
                tone="red"
                label="User Reports"
                onPress={() => navigation.navigate("AdminReports")}
              />
            </View>
          </View>
        </View>

        {/* ---------- Sticky tab bar (index 2) ---------- */}
        <View style={styles.tabBarWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBar}
          >
            {TABS.map((tab) => {
              const isActive = tab.key === activeTab;

              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.85}
                >
                  <MaterialIcons
                    name={tab.icon}
                    size={17}
                    color={isActive ? "#FFFFFF" : COLORS.muted}
                  />
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                  <View style={[styles.tabCount, isActive && styles.tabCountActive]}>
                    <Text
                      style={[
                        styles.tabCountText,
                        isActive && styles.tabCountTextActive,
                      ]}
                    >
                      {tabCounts[tab.key]}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ---------- Active section ---------- */}
        <View style={styles.body}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{currentSection.title}</Text>
            <Text style={styles.sectionSubtitle}>{currentSection.subtitle}</Text>
          </View>

          {currentSection.render()}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminDashboard;

/* =====================================================
   STYLES
===================================================== */

const cardShadow = {
  shadowColor: "#0F172A",
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  scrollContent: {
    paddingBottom: 20,
  },

  body: {
    paddingHorizontal: 18,
  },

  /* ---------- Loading ---------- */
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  loadingText: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 16,
  },
  loadingSubText: {
    color: COLORS.subtle,
    fontSize: 13,
    marginTop: 6,
  },

  /* ---------- Hero (purple, as on Home) ---------- */
  hero: {
    backgroundColor: COLORS.purple,
    borderRadius: 28,
    marginHorizontal: 18,
    marginTop: 8,
    marginBottom: 20,
    overflow: "hidden",
  
  },
  heroInner: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4ADE80",
    marginRight: 7,
  },
  roleText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  heroNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  welcome: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13.5,
    fontWeight: "500",
  },
  adminName: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 1,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12.5,
    marginTop: 12,
  },
  heroChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
    gap: 6,
  },
  heroChipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  /* ---------- Overview ---------- */
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  overviewTitle: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: "800",
  },
  overviewSubtitle: {
    color: COLORS.subtle,
    fontSize: 12,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.greenBadge,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TONES.green.solid,
    marginRight: 5,
  },
  liveText: {
    color: TONES.green.fg,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  statTile: {
    width: "48.3%",
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...cardShadow,
  },
  statValue: {
    color: COLORS.ink,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 12,
    letterSpacing: -0.5,
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },

  /* ---------- Quick actions ---------- */
  quickCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
    ...cardShadow,
  },
  quickHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  quickHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: TONES.purple.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTitle: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  quickSubtitle: {
    color: COLORS.subtle,
    fontSize: 11.5,
    marginTop: 2,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  quickAction: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    gap: 8,
  },
  quickActionText: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 12.5,
    fontWeight: "700",
  },

  /* ---------- Tabs ---------- */
  tabBarWrap: {
    backgroundColor: COLORS.bg,
    paddingTop: 16,
    paddingBottom: 10,
  },
  tabBar: {
    paddingHorizontal: 18,
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 7,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  tabCount: {
    minWidth: 22,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.blueTint,
    alignItems: "center",
    justifyContent: "center",
  },
  tabCountActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  tabCountText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  tabCountTextActive: {
    color: "#FFFFFF",
  },

  /* ---------- Section ---------- */
  sectionHeader: {
    marginTop: 6,
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    color: COLORS.subtle,
    fontSize: 12.5,
    marginTop: 3,
  },

  /* ---------- Cards ---------- */
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    paddingLeft: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    ...cardShadow,
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 8,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
  },
  cardSubtitle: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },

  /* ---------- Badges, chips, meta ---------- */
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TONES.purple.bg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  chipText: {
    color: TONES.purple.fg,
    fontSize: 11.5,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 7,
  },
  metaText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12.5,
    lineHeight: 17,
  },

  /* ---------- Progress ---------- */
  progressBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    padding: 13,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 11,
  },
  progressLabel: {
    color: COLORS.subtle,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  progressValue: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 3,
  },
  progressTrack: {
    height: 9,
    borderRadius: 6,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: TONES.green.solid,
  },
  progressPercent: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 7,
    textAlign: "right",
  },

  /* ---------- Info blocks ---------- */
  infoBlock: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  infoBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  infoBlockLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  infoBlockValue: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },

  /* ---------- Assignment ---------- */
  assignBox: {
    backgroundColor: COLORS.blueTint,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.blueStrong,
    padding: 12,
    marginTop: 6,
  },
  assignHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  assignLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  assignValue: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 3,
  },
  assignToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 10,
  },
  assignToggleText: {
    color: TONES.blue.fg,
    fontSize: 12.5,
    fontWeight: "800",
  },
  assignEmpty: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  recipientList: {
    marginTop: 12,
    gap: 8,
  },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    gap: 10,
  },
  recipientRowActive: {
    borderColor: COLORS.greenBorder,
    backgroundColor: COLORS.greenTint,
  },
  recipientAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TONES.blue.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  recipientAvatarText: {
    color: TONES.blue.fg,
    fontWeight: "800",
    fontSize: 14,
  },
  recipientName: {
    color: COLORS.ink,
    fontSize: 13.5,
    fontWeight: "700",
  },
  recipientRole: {
    color: COLORS.subtle,
    fontSize: 10.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },

  /* ---------- Actions ---------- */
  dividerWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 12,
    gap: 10,
  },
  dividerLabel: {
    color: COLORS.subtle,
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.hairline,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    minHeight: 46,
    borderRadius: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  deleteSpacing: {
    marginTop: 10,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TONES.teal.bg,
    borderRadius: 12,
    padding: 12,
    gap: 9,
  },
  noticeText: {
    flex: 1,
    color: TONES.teal.fg,
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 18,
  },

  /* ---------- Empty ---------- */
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    paddingVertical: 34,
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  emptyText: {
    color: COLORS.subtle,
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 270,
  },
});
