import React, { useEffect, useState } from "react";

import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebaseConfig";

const Campaigns = ({ navigation }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const showError = (title, message) => {
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
    const campaignsQuery = query(
      collection(db, "campaigns"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      campaignsQuery,
      (snapshot) => {
        const campaignList = snapshot.docs.map(
          (document) => ({
            id: document.id,
            ...document.data(),
          })
        );

        setCampaigns(campaignList);
        setLoading(false);
      },
      (error) => {
        console.log(
          "CAMPAIGNS ERROR:",
          error.code,
          error.message
        );

        setLoading(false);

        showError(
          "Campaigns Error",
          error.message ||
            "Campaigns could not be loaded."
        );
      }
    );

    return () => unsubscribe();
  }, []);

  const getProgressValues = (campaign) => {
    const campaignType =
      campaign.campaignType || "Items";

    if (campaignType === "Money") {
      const target = Number(
        campaign.targetAmount || 0
      );

      const current = Number(
        campaign.currentAmount || 0
      );

      return {
        target,
        current,
        goalText: `R${target.toLocaleString()}`,
        progressText: `R${current.toLocaleString()} raised`,
      };
    }

    const target = Number(
      campaign.targetItems || 0
    );

    const current = Number(
      campaign.collectedItems || 0
    );

    const itemName =
      campaign.itemName || "Items";

    return {
      target,
      current,
      goalText: `${target} ${itemName}`,
      progressText: `${current} collected`,
    };
  };

  const getProgressPercentage = (campaign) => {
    const { target, current } =
      getProgressValues(campaign);

    if (target <= 0) {
      return 0;
    }

    const percentage =
      (current / target) * 100;

    return Math.min(
      Math.max(percentage, 0),
      100
    );
  };

  const formatEndDate = (endDate) => {
    if (!endDate) {
      return "No end date";
    }

    const date =
      typeof endDate.toDate === "function"
        ? endDate.toDate()
        : new Date(endDate);

    if (Number.isNaN(date.getTime())) {
      return "No end date";
    }

    return date.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusStyle = (status) => {
    if (status === "Completed") {
      return {
        container: styles.completedBadge,
        text: styles.completedText,
        icon: "check-circle",
        iconColor: "#2563EB",
      };
    }

    if (status === "Closed") {
      return {
        container: styles.closedBadge,
        text: styles.closedText,
        icon: "lock",
        iconColor: "#475569",
      };
    }

    return {
      container: styles.activeBadge,
      text: styles.activeText,
      icon: "radio-button-checked",
      iconColor: "#16A34A",
    };
  };

  const supportCampaign = (campaign) => {
    if (
      campaign.status === "Closed" ||
      campaign.status === "Completed"
    ) {
      showError(
        "Campaign Unavailable",
        "This campaign is no longer accepting support."
      );

      return;
    }

    navigation.navigate("Donate", {
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      campaignType:
        campaign.campaignType || "Items",
      requestedItem:
        campaign.itemName || "",
      organization:
        campaign.organization || "",
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingIconContainer}>
          <MaterialIcons
            name="campaign"
            size={30}
            color="#2563EB"
          />
        </View>

        <ActivityIndicator
          size="small"
          color="#2563EB"
          style={styles.loadingSpinner}
        />

        <Text style={styles.loadingText}>
          Loading campaigns...
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

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="arrow-back"
              size={23}
              color="#1E293B"
            />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.heading}>
              Community Campaigns
            </Text>

            <Text style={styles.subtitle}>
              Support causes making a difference in
              the community.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <MaterialIcons
              name="campaign"
              size={25}
              color="#F59E0B"
            />
          </View>
        </View>

        {/* Campaign Summary */}
        {campaigns.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <MaterialIcons
                name="volunteer-activism"
                size={23}
                color="#7C3AED"
              />
            </View>

            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>
                Make an Impact
              </Text>

              <Text style={styles.summaryText}>
                {campaigns.length} campaign
                {campaigns.length !== 1 ? "s" : ""}{" "}
                currently available for community
                support.
              </Text>
            </View>

            <MaterialIcons
              name="arrow-forward"
              size={20}
              color="#94A3B8"
            />
          </View>
        )}

        {/* Empty State */}
        {campaigns.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons
                name="campaign"
                size={52}
                color="#F59E0B"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No Campaigns Yet
            </Text>

            <Text style={styles.emptyText}>
              Community campaigns created by
              administrators will appear here.
            </Text>
          </View>
        ) : (
          campaigns.map((campaign) => {
            const progress =
              getProgressValues(campaign);

            const progressPercentage =
              getProgressPercentage(campaign);

            const status =
              campaign.status || "Active";

            const statusStyle =
              getStatusStyle(status);

            const campaignUnavailable =
              status === "Closed" ||
              status === "Completed";

            return (
              <View
                key={campaign.id}
                style={styles.card}
              >

                {/* Badges */}
                <View style={styles.badgeRow}>
                  <View style={styles.badgeLeft}>
                    {campaign.urgent === true && (
                      <View style={styles.urgentBadge}>
                        <MaterialIcons
                          name="warning"
                          size={14}
                          color="#DC2626"
                        />

                        <Text
                          style={styles.urgentText}
                        >
                          Urgent
                        </Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      statusStyle.container,
                    ]}
                  >
                    <MaterialIcons
                      name={statusStyle.icon}
                      size={14}
                      color={statusStyle.iconColor}
                    />

                    <Text
                      style={[
                        styles.statusText,
                        statusStyle.text,
                      ]}
                    >
                      {status}
                    </Text>
                  </View>
                </View>

                {/* Campaign Title */}
                <View style={styles.titleRow}>
                  <View style={styles.campaignIcon}>
                    <MaterialIcons
                      name="campaign"
                      size={22}
                      color="#2563EB"
                    />
                  </View>

                  <View style={styles.titleContent}>
                    <Text style={styles.title}>
                      {campaign.title ||
                        "Community Campaign"}
                    </Text>

                    <Text style={styles.organization}>
                      {campaign.organization ||
                        "Ubuntu Connect"}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                {campaign.description ? (
                  <Text
                    style={styles.description}
                    numberOfLines={3}
                  >
                    {campaign.description}
                  </Text>
                ) : null}

                {/* Location */}
                {campaign.location ? (
                  <View style={styles.locationRow}>
                    <MaterialIcons
                      name="location-on"
                      size={17}
                      color="#2563EB"
                    />

                    <Text style={styles.location}>
                      {campaign.location}
                    </Text>
                  </View>
                ) : null}

                {/* Campaign Type */}
                <View style={styles.typeRow}>
                  <View style={styles.typeBadge}>
                    <MaterialIcons
                      name={
                        campaign.campaignType ===
                        "Money"
                          ? "payments"
                          : "inventory-2"
                      }
                      size={15}
                      color="#7C3AED"
                    />

                    <Text style={styles.typeText}>
                      {campaign.campaignType ||
                        "Items"}{" "}
                      Campaign
                    </Text>
                  </View>
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                  <View style={styles.statBox}>
                    <View style={styles.statIcon}>
                      <MaterialIcons
                        name="flag"
                        size={18}
                        color="#2563EB"
                      />
                    </View>

                    <View>
                      <Text style={styles.label}>
                        Goal
                      </Text>

                      <Text style={styles.value}>
                        {progress.goalText}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statBox,
                      styles.progressStat,
                    ]}
                  >
                    <View style={styles.statIcon}>
                      <MaterialIcons
                        name="trending-up"
                        size={18}
                        color="#22C55E"
                      />
                    </View>

                    <View>
                      <Text style={styles.label}>
                        Progress
                      </Text>

                      <Text style={styles.value}>
                        {progress.progressText}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Progress */}
                <View style={styles.progressHeader}>
                  <View style={styles.progressPercentageRow}>
                    <MaterialIcons
                      name="bar-chart"
                      size={16}
                      color="#16A34A"
                    />

                    <Text
                      style={
                        styles.progressPercentage
                      }
                    >
                      {Math.round(
                        progressPercentage
                      )}
                      % complete
                    </Text>
                  </View>

                  <View style={styles.endDateRow}>
                    <MaterialIcons
                      name="event"
                      size={14}
                      color="#94A3B8"
                    />

                    <Text style={styles.endDate}>
                      {formatEndDate(
                        campaign.endDate
                      )}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progressPercentage}%`,
                      },
                    ]}
                  />
                </View>

                {/* Support Button */}
                <TouchableOpacity
                  style={[
                    styles.supportButton,
                    campaignUnavailable &&
                      styles.disabledButton,
                  ]}
                  onPress={() =>
                    supportCampaign(campaign)
                  }
                  disabled={campaignUnavailable}
                  activeOpacity={0.85}
                >
                  <MaterialIcons
                    name={
                      campaignUnavailable
                        ? status === "Completed"
                          ? "check-circle"
                          : "lock"
                        : "volunteer-activism"
                    }
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text style={styles.supportText}>
                    {campaignUnavailable
                      ? status === "Completed"
                        ? "Campaign Completed"
                        : "Campaign Closed"
                      : "Support Campaign"}
                  </Text>

                  {!campaignUnavailable && (
                    <MaterialIcons
                      name="arrow-forward"
                      size={19}
                      color="#FFFFFF"
                    />
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <View style={{ height: 70 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Campaigns;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
  },

  scrollContent: {
    paddingTop: 10,
  },

  /* Loading */
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingSpinner: {
    marginTop: 18,
  },

  loadingText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 22,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 12,
  },

  headerTextContainer: {
    flex: 1,
  },

  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E293B",
  },

  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 19,
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Summary */
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  summaryIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  summaryContent: {
    flex: 1,
  },

  summaryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },

  summaryText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 17,
  },

  /* Card */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  /* Badges */
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  badgeLeft: {
    flex: 1,
  },

  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  urgentText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 11,
    marginLeft: 5,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 5,
  },

  activeBadge: {
    backgroundColor: "#DCFCE7",
  },

  activeText: {
    color: "#16A34A",
  },

  completedBadge: {
    backgroundColor: "#DBEAFE",
  },

  completedText: {
    color: "#2563EB",
  },

  closedBadge: {
    backgroundColor: "#E2E8F0",
  },

  closedText: {
    color: "#475569",
  },

  /* Title */
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  campaignIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  titleContent: {
    flex: 1,
  },

  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 3,
  },

  organization: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 13,
  },

  /* Description */
  description: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },

  /* Location */
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  location: {
    color: "#475569",
    fontSize: 12,
    marginLeft: 5,
    flex: 1,
  },

  /* Campaign Type */
  typeRow: {
    marginBottom: 18,
  },

  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#F5F3FF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  typeText: {
    color: "#7C3AED",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 5,
  },

  /* Stats */
  statsContainer: {
    flexDirection: "row",
    marginBottom: 18,
  },

  statBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 11,
    marginRight: 8,
  },

  progressStat: {
    marginRight: 0,
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  label: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
  },

  value: {
    color: "#1E293B",
    fontWeight: "800",
    fontSize: 12,
    marginTop: 3,
  },

  /* Progress */
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  progressPercentageRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  progressPercentage: {
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 4,
  },

  endDateRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  endDate: {
    color: "#94A3B8",
    fontSize: 10,
    marginLeft: 4,
  },

  progressBar: {
    height: 9,
    width: "100%",
    backgroundColor: "#E2E8F0",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 18,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#22C55E",
    borderRadius: 20,
  },

  /* Support */
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    minHeight: 50,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 14,
  },

  disabledButton: {
    backgroundColor: "#94A3B8",
    opacity: 0.75,
  },

  supportText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    marginHorizontal: 9,
  },

  /* Empty */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    marginTop: 70,
  },

  emptyIconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
  },

  emptyText: {
    color: "#64748B",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
    fontSize: 13,
  },
});