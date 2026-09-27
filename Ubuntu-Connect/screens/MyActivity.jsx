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
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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
        {/* ACTIVITY HEADER */}
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
              <MaterialIcons
                name={
                  isDonation
                    ? "card-giftcard"
                    : "volunteer-activism"
                }
                size={25}
                color={
                  isDonation
                    ? "#7C3AED"
                    : "#2563EB"
                }
              />
            </View>

            <View style={styles.titleTextContainer}>
              <Text
                style={styles.activityTitle}
                numberOfLines={2}
              >
                {title}
              </Text>

              <View style={styles.dateRow}>
                <MaterialIcons
                  name="event"
                  size={13}
                  color="#94A3B8"
                />

                <Text style={styles.activityDate}>
                  Submitted{" "}
                  {formatDate(item.createdAt)}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              statusStyles.badge,
            ]}
          >
            <MaterialIcons
              name={statusStyles.icon}
              size={13}
              color={statusStyles.text.color}
            />

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

        {/* DETAILS */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <MaterialIcons
                name="category"
                size={16}
                color="#64748B"
              />

              <Text style={styles.detailLabel}>
                Category
              </Text>
            </View>

            <Text style={styles.detailValue}>
              {item.category || "Not specified"}
            </Text>
          </View>

          {isDonation ? (
            <>
              <View style={styles.detailRow}>
                <View style={styles.detailLabelContainer}>
                  <MaterialIcons
                    name="verified"
                    size={16}
                    color="#64748B"
                  />

                  <Text style={styles.detailLabel}>
                    Condition
                  </Text>
                </View>

                <Text style={styles.detailValue}>
                  {item.condition ||
                    "Not specified"}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailLabelContainer}>
                  <MaterialIcons
                    name="local-shipping"
                    size={16}
                    color="#64748B"
                  />

                  <Text style={styles.detailLabel}>
                    Delivery
                  </Text>
                </View>

                <Text style={styles.detailValue}>
                  {item.deliveryMethod ||
                    "Not specified"}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.detailRow}>
                <View style={styles.detailLabelContainer}>
                  <MaterialIcons
                    name="inventory-2"
                    size={16}
                    color="#64748B"
                  />

                  <Text style={styles.detailLabel}>
                    Quantity
                  </Text>
                </View>

                <Text style={styles.detailValue}>
                  {item.quantity ||
                    "Not specified"}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailLabelContainer}>
                  <MaterialIcons
                    name="priority-high"
                    size={16}
                    color="#64748B"
                  />

                  <Text style={styles.detailLabel}>
                    Urgency
                  </Text>
                </View>

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

        {/* DESCRIPTION */}
        {item.description ? (
          <Text
            style={styles.description}
            numberOfLines={3}
          >
            {item.description}
          </Text>
        ) : null}

        {/* LOCATION */}
        {location ? (
          <View style={styles.locationContainer}>
            <MaterialIcons
              name="location-on"
              size={17}
              color="#64748B"
            />

            <Text style={styles.location}>
              {location}
            </Text>
          </View>
        ) : null}

        {/* STATUS NOTICE */}
        {status === "Pending" ? (
          <View style={styles.pendingNotice}>
            <MaterialIcons
              name="schedule"
              size={17}
              color="#D97706"
            />

            <Text style={styles.pendingNoticeText}>
              This submission is waiting for
              admin review.
            </Text>
          </View>
        ) : null}

        {status === "Approved" ? (
          <View style={styles.approvedNotice}>
            <MaterialIcons
              name="check-circle"
              size={17}
              color="#16A34A"
            />

            <Text style={styles.approvedNoticeText}>
              This submission was approved.
            </Text>
          </View>
        ) : null}

        {status === "Rejected" ? (
          <View style={styles.rejectedNotice}>
            <MaterialIcons
              name="cancel"
              size={17}
              color="#DC2626"
            />

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

  const approvedCount = [
    ...donations,
    ...requests,
  ].filter(
    (item) => item.status === "Approved"
  ).length;

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.loginIconContainer}>
          <MaterialIcons
            name="lock-outline"
            size={45}
            color="#2563EB"
          />
        </View>

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
          <MaterialIcons
            name="login"
            size={18}
            color="#FFFFFF"
          />

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
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={23}
            color="#166534"
          />
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

      {/* SUMMARY */}
      <View style={styles.summaryContainer}>
        <View
          style={[
            styles.summaryCard,
            styles.donationSummaryCard,
          ]}
        >
          <View style={styles.summaryIconContainer}>
            <MaterialIcons
              name="card-giftcard"
              size={21}
              color="#7C3AED"
            />
          </View>

          <Text style={styles.summaryNumber}>
            {donations.length}
          </Text>

          <Text style={styles.summaryLabel}>
            Donations
          </Text>
        </View>

        <View
          style={[
            styles.summaryCard,
            styles.requestSummaryCard,
          ]}
        >
          <View style={styles.summaryIconContainer}>
            <MaterialIcons
              name="volunteer-activism"
              size={21}
              color="#2563EB"
            />
          </View>

          <Text style={styles.summaryNumber}>
            {requests.length}
          </Text>

          <Text style={styles.summaryLabel}>
            Requests
          </Text>
        </View>

        <View
          style={[
            styles.summaryCard,
            styles.approvedSummaryCard,
          ]}
        >
          <View style={styles.summaryIconContainer}>
            <MaterialIcons
              name="check-circle"
              size={21}
              color="#16A34A"
            />
          </View>

          <Text style={styles.summaryNumber}>
            {approvedCount}
          </Text>

          <Text style={styles.summaryLabel}>
            Approved
          </Text>
        </View>
      </View>

      {/* TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "Donations" &&
              styles.activeTabButton,
          ]}
          onPress={() =>
            changeTab("Donations")
          }
        >
          <MaterialIcons
            name="card-giftcard"
            size={18}
            color={
              activeTab === "Donations"
                ? "#FFFFFF"
                : "#64748B"
            }
          />

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
          onPress={() =>
            changeTab("Requests")
          }
        >
          <MaterialIcons
            name="volunteer-activism"
            size={18}
            color={
              activeTab === "Requests"
                ? "#FFFFFF"
                : "#64748B"
            }
          />

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

      {/* FILTERS */}
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

      {/* CONTENT */}
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
                <MaterialIcons
                  name={
                    activeTab === "Donations"
                      ? "card-giftcard"
                      : "volunteer-activism"
                  }
                  size={48}
                  color={
                    activeTab === "Donations"
                      ? "#7C3AED"
                      : "#2563EB"
                  }
                />
              </View>

              <Text style={styles.emptyTitle}>
                No{" "}
                {statusFilter !== "All"
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
                  <MaterialIcons
                    name={
                      activeTab === "Donations"
                        ? "card-giftcard"
                        : "volunteer-activism"
                    }
                    size={18}
                    color="#FFFFFF"
                  />

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
    marginBottom: 19,
  },

  backButton: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
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
    marginBottom: 19,
  },

  summaryCard: {
    flex: 1,
    borderRadius: 17,
    paddingVertical: 12,
    alignItems: "center",
    marginHorizontal: 3,
    borderWidth: 1,
  },

  donationSummaryCard: {
    backgroundColor: "#FAF5FF",
    borderColor: "#E9D5FF",
  },

  requestSummaryCard: {
    backgroundColor: "#EFF6FF",
    borderColor: "#DBEAFE",
  },

  approvedSummaryCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },

  summaryIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 3,
  },

  summaryNumber: {
    color: "#1E293B",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 2,
  },

  summaryLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 16,
    padding: 4,
    marginBottom: 13,
  },

  tabButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },

  activeTabButton: {
    backgroundColor: "#16A34A",
  },

  tabText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },

  activeTabText: {
    color: "#FFFFFF",
  },

  filterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 13,
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
    borderRadius: 20,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,

    shadowColor: "#1E293B",
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
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
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  donationIconContainer: {
    backgroundColor: "#F3E8FF",
  },

  requestIconContainer: {
    backgroundColor: "#DBEAFE",
  },

  titleTextContainer: {
    flex: 1,
  },

  activityTitle: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "800",
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 4,
  },

  activityDate: {
    color: "#94A3B8",
    fontSize: 11,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
    borderRadius: 13,
    padding: 12,
    marginTop: 14,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  detailLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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

  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 4,
  },

  location: {
    color: "#475569",
    fontSize: 12,
    flex: 1,
  },

  pendingNotice: {
    backgroundColor: "#FFFBEB",
    borderRadius: 11,
    padding: 10,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  pendingNoticeText: {
    color: "#A16207",
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },

  approvedNotice: {
    backgroundColor: "#F0FDF4",
    borderRadius: 11,
    padding: 10,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  approvedNoticeText: {
    color: "#15803D",
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },

  rejectedNotice: {
    backgroundColor: "#FEF2F2",
    borderRadius: 11,
    padding: 10,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  rejectedNoticeText: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  loadingText: {
    color: "#64748B",
    marginTop: 12,
    fontWeight: "600",
  },

  loginIconContainer: {
    width: 95,
    height: 95,
    borderRadius: 48,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 17,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});

