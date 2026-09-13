import React, { useEffect, useMemo, useState } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

const MyActivity = ({ navigation }) => {
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);

  const [activeTab, setActiveTab] = useState("Donations");
  const [statusFilter, setStatusFilter] = useState("All");

  const [donationsLoading, setDonationsLoading] =
    useState(true);

  const [requestsLoading, setRequestsLoading] =
    useState(true);

  const currentUser = auth.currentUser;

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

  useEffect(() => {
    if (!currentUser) {
      setDonationsLoading(false);
      setRequestsLoading(false);
      return;
    }

    const donationsQuery = query(
      collection(db, "donations"),
      where("userId", "==", currentUser.uid)
    );

    const requestsQuery = query(
      collection(db, "requests"),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribeDonations = onSnapshot(
      donationsQuery,
      (snapshot) => {
        const donationList = snapshot.docs.map(
          (document) => ({
            id: document.id,
            activityType: "Donation",
            ...document.data(),
          })
        );

        donationList.sort((first, second) => {
          const firstTime =
            first.createdAt?.toMillis?.() || 0;

          const secondTime =
            second.createdAt?.toMillis?.() || 0;

          return secondTime - firstTime;
        });

        setDonations(donationList);
        setDonationsLoading(false);
      },
      (error) => {
        console.log(
          "MY DONATIONS ERROR:",
          error.code,
          error.message
        );

        setDonationsLoading(false);

        showMessage(
          "Activity Error",
          error.message ||
            "Your donations could not be loaded."
        );
      }
    );

    const unsubscribeRequests = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const requestList = snapshot.docs.map(
          (document) => ({
            id: document.id,
            activityType: "Request",
            ...document.data(),
          })
        );

        requestList.sort((first, second) => {
          const firstTime =
            first.createdAt?.toMillis?.() || 0;

          const secondTime =
            second.createdAt?.toMillis?.() || 0;

          return secondTime - firstTime;
        });

        setRequests(requestList);
        setRequestsLoading(false);
      },
      (error) => {
        console.log(
          "MY REQUESTS ERROR:",
          error.code,
          error.message
        );

        setRequestsLoading(false);

        showMessage(
          "Activity Error",
          error.message ||
            "Your help requests could not be loaded."
        );
      }
    );

    return () => {
      unsubscribeDonations();
      unsubscribeRequests();
    };
  }, [currentUser?.uid]);

  const currentActivities =
    activeTab === "Donations"
      ? donations
      : requests;

  const filteredActivities = useMemo(() => {
    if (statusFilter === "All") {
      return currentActivities;
    }

    return currentActivities.filter(
      (activity) =>
        (activity.status || "Pending") ===
        statusFilter
    );
  }, [
    activeTab,
    currentActivities,
    statusFilter,
  ]);

  const getStatusCount = (status) => {
    if (status === "All") {
      return currentActivities.length;
    }

    return currentActivities.filter(
      (activity) =>
        (activity.status || "Pending") === status
    ).length;
  };

  const formatDate = (createdAt) => {
    if (!createdAt) {
      return "Date unavailable";
    }

    const date =
      typeof createdAt.toDate === "function"
        ? createdAt.toDate()
        : new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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

  const changeTab = (tab) => {
    setActiveTab(tab);
    setStatusFilter("All");
  };

  const renderActivity = ({ item }) => {
    const isDonation =
      item.activityType === "Donation";

    const status =
      item.status || "Pending";

    const statusStyles =
      getStatusStyles(status);

    const title = isDonation
      ? item.itemName || "Donation"
      : item.itemNeeded || "Help Request";

    const location = isDonation
      ? item.address
      : item.location;

    return (
      <View
        style={[
          styles.activityCard,
          isDonation
            ? styles.donationCard
            : styles.requestCard,
        ]}
      >
        <View style={styles.activityHeader}>
          <View style={styles.titleContainer}>
            <View
              style={[
                styles.activityIconContainer,
                isDonation
                  ? styles.donationIconContainer
                  : styles.requestIconContainer,
              ]}
            >
              <Text style={styles.activityIcon}>
                {isDonation ? "🎁" : "🙏"}
              </Text>
            </View>

            <View style={styles.titleTextContainer}>
              <Text
                style={styles.activityTitle}
                numberOfLines={2}
              >
                {title}
              </Text>

              <Text style={styles.activityDate}>
                Submitted {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>

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
              {status}
            </Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Category
            </Text>

            <Text style={styles.detailValue}>
              {item.category || "Not specified"}
            </Text>
          </View>

          {isDonation ? (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Condition
                </Text>

                <Text style={styles.detailValue}>
                  {item.condition || "Not specified"}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Delivery
                </Text>

                <Text style={styles.detailValue}>
                  {item.deliveryMethod ||
                    "Not specified"}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Quantity
                </Text>

                <Text style={styles.detailValue}>
                  {item.quantity || "Not specified"}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Urgency
                </Text>

                <Text
                  style={[
                    styles.detailValue,
                    item.urgency === "Urgent" &&
                      styles.urgentText,
                  ]}
                >
                  {item.urgency || "Normal"}
                </Text>
              </View>
            </>
          )}
        </View>

        {item.description ? (
          <Text
            style={styles.description}
            numberOfLines={3}
          >
            {item.description}
          </Text>
        ) : null}

        {location ? (
          <Text style={styles.location}>
            📍 {location}
          </Text>
        ) : null}

        {status === "Pending" ? (
          <View style={styles.pendingNotice}>
            <Text style={styles.pendingNoticeText}>
              This submission is waiting for admin
              review.
            </Text>
          </View>
        ) : null}

        {status === "Approved" ? (
          <View style={styles.approvedNotice}>
            <Text style={styles.approvedNoticeText}>
              This submission was approved.
            </Text>
          </View>
        ) : null}

        {status === "Rejected" ? (
          <View style={styles.rejectedNotice}>
            <Text style={styles.rejectedNoticeText}>
              This submission was not approved.
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  const loading =
    activeTab === "Donations"
      ? donationsLoading
      : requestsLoading;

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🔐</Text>

        <Text style={styles.emptyTitle}>
          Login Required
        </Text>

        <Text style={styles.emptyText}>
          Please log in to view your activity.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            navigation.replace("Login")
          }
        >
          <Text style={styles.primaryButtonText}>
            Go to Login
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>
            ‹
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.heading}>
            My Activity
          </Text>

          <Text style={styles.subtitle}>
            Track your community contributions.
          </Text>
        </View>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryIcon}>
            🎁
          </Text>

          <Text style={styles.summaryNumber}>
            {donations.length}
          </Text>

          <Text style={styles.summaryLabel}>
            Donations
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryIcon}>
            🙏
          </Text>

          <Text style={styles.summaryNumber}>
            {requests.length}
          </Text>

          <Text style={styles.summaryLabel}>
            Requests
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryIcon}>
            ✅
          </Text>

          <Text style={styles.summaryNumber}>
            {
              [...donations, ...requests].filter(
                (item) =>
                  item.status === "Approved"
              ).length
            }
          </Text>

          <Text style={styles.summaryLabel}>
            Approved
          </Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "Donations" &&
              styles.activeTabButton,
          ]}
          onPress={() => changeTab("Donations")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "Donations" &&
                styles.activeTabText,
            ]}
          >
            My Donations
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "Requests" &&
              styles.activeTabButton,
          ]}
          onPress={() => changeTab("Requests")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "Requests" &&
                styles.activeTabText,
            ]}
          >
            My Requests
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {[
          "All",
          "Pending",
          "Approved",
          "Rejected",
        ].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              statusFilter === status &&
                styles.activeFilterButton,
            ]}
            onPress={() =>
              setStatusFilter(status)
            }
          >
            <Text
              style={[
                styles.filterText,
                statusFilter === status &&
                  styles.activeFilterText,
              ]}
            >
              {status} ({getStatusCount(status)})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator
            size="large"
            color="#16A34A"
          />

          <Text style={styles.loadingText}>
            Loading your activity...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredActivities}
          keyExtractor={(item) => item.id}
          renderItem={renderActivity}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            filteredActivities.length === 0
              ? styles.emptyListContainer
              : styles.listContainer
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View
                style={styles.emptyIconContainer}
              >
                <Text style={styles.emptyIcon}>
                  {activeTab === "Donations"
                    ? "🎁"
                    : "🙏"}
                </Text>
              </View>

              <Text style={styles.emptyTitle}>
                No {statusFilter !== "All"
                  ? statusFilter
                  : ""}{" "}
                {activeTab}
              </Text>

              <Text style={styles.emptyText}>
                {statusFilter !== "All"
                  ? `You do not have any ${statusFilter.toLowerCase()} ${activeTab.toLowerCase()}.`
                  : activeTab === "Donations"
                  ? "Your submitted donations will appear here."
                  : "Your submitted help requests will appear here."}
              </Text>

              {statusFilter === "All" ? (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() =>
                    navigation.navigate(
                      activeTab === "Donations"
                        ? "Donate"
                        : "RequestHelp"
                    )
                  }
                >
                  <Text
                    style={styles.primaryButtonText}
                  >
                    {activeTab === "Donations"
                      ? "Make a Donation"
                      : "Request Help"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default MyActivity;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 20,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  backButtonText: {
    color: "#166534",
    fontSize: 32,
    lineHeight: 34,
  },

  headerTextContainer: {
    flex: 1,
  },

  heading: {
    color: "#14532D",
    fontSize: 28,
    fontWeight: "800",
  },

  subtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 3,
  },

  summaryContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    marginHorizontal: 3,
  },

  summaryIcon: {
    fontSize: 20,
  },

  summaryNumber: {
    color: "#16A34A",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 4,
  },

  summaryLabel: {
    color: "#166534",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 15,
    padding: 4,
    marginBottom: 14,
  },

  tabButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  activeTabButton: {
    backgroundColor: "#16A34A",
  },

  tabText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },

  activeTabText: {
    color: "#FFFFFF",
  },

  filterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },

  filterButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginRight: 7,
    marginBottom: 7,
  },

  activeFilterButton: {
    backgroundColor: "#DCFCE7",
    borderColor: "#22C55E",
  },

  filterText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },

  activeFilterText: {
    color: "#166534",
    fontWeight: "800",
  },

  listContainer: {
    paddingBottom: 100,
  },

  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderLeftWidth: 4,
  },

  donationCard: {
    borderLeftColor: "#22C55E",
  },

  requestCard: {
    borderLeftColor: "#2563EB",
  },

  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  titleContainer: {
    flex: 1,
    flexDirection: "row",
    marginRight: 8,
  },

  activityIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  donationIconContainer: {
    backgroundColor: "#DCFCE7",
  },

  requestIconContainer: {
    backgroundColor: "#DBEAFE",
  },

  activityIcon: {
    fontSize: 21,
  },

  titleTextContainer: {
    flex: 1,
  },

  activityTitle: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "700",
  },

  activityDate: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 4,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  statusText: {
    fontSize: 10,
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

  detailsContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },

  detailLabel: {
    color: "#64748B",
    fontSize: 12,
  },

  detailValue: {
    color: "#1E293B",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
  },

  urgentText: {
    color: "#DC2626",
  },

  description: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },

  location: {
    color: "#475569",
    fontSize: 12,
    marginTop: 10,
  },

  pendingNotice: {
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },

  pendingNoticeText: {
    color: "#A16207",
    fontSize: 11,
    fontWeight: "600",
  },

  approvedNotice: {
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },

  approvedNoticeText: {
    color: "#15803D",
    fontSize: 11,
    fontWeight: "600",
  },

  rejectedNotice: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },

  rejectedNoticeText: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "600",
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#64748B",
    marginTop: 12,
    fontWeight: "600",
  },

  emptyListContainer: {
    flexGrow: 1,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 70,
  },

  emptyIconContainer: {
    width: 95,
    height: 95,
    borderRadius: 48,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 17,
  },

  emptyIcon: {
    fontSize: 44,
  },

  emptyTitle: {
    color: "#14532D",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
  },

  primaryButton: {
    backgroundColor: "#16A34A",
    borderRadius: 13,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 18,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});