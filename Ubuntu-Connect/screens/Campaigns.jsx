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
      };
    }

    if (status === "Closed") {
      return {
        container: styles.closedBadge,
        text: styles.closedText,
      };
    }

    return {
      container: styles.activeBadge,
      text: styles.activeText,
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
        <ActivityIndicator
          size="large"
          color="#2563EB"
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
      >
        <Text style={styles.heading}>
          Community Campaigns
        </Text>

        <Text style={styles.subtitle}>
          Support causes making a difference in the
          community.
        </Text>

        {campaigns.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>
                📢
              </Text>
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
                <View style={styles.badgeRow}>
                  {campaign.urgent === true && (
                    <View
                      style={styles.urgentBadge}
                    >
                      <Text
                        style={styles.urgentText}
                      >
                        🚨 Urgent
                      </Text>
                    </View>
                  )}

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
                      {status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.title}>
                  {campaign.title ||
                    "Community Campaign"}
                </Text>

                <Text style={styles.organization}>
                  {campaign.organization ||
                    "Ubuntu Connect"}
                </Text>

                {campaign.description ? (
                  <Text
                    style={styles.description}
                    numberOfLines={3}
                  >
                    {campaign.description}
                  </Text>
                ) : null}

                {campaign.location ? (
                  <Text style={styles.location}>
                    📍 {campaign.location}
                  </Text>
                ) : null}

                <View style={styles.statsContainer}>
                  <View style={styles.statColumn}>
                    <Text style={styles.label}>
                      Goal
                    </Text>

                    <Text style={styles.value}>
                      {progress.goalText}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statColumn,
                      styles.progressColumn,
                    ]}
                  >
                    <Text style={styles.label}>
                      Progress
                    </Text>

                    <Text style={styles.value}>
                      {progress.progressText}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressHeader}>
                  <Text
                    style={
                      styles.progressPercentage
                    }
                  >
                    {Math.round(progressPercentage)}%
                    complete
                  </Text>

                  <Text style={styles.endDate}>
                    Ends:{" "}
                    {formatEndDate(
                      campaign.endDate
                    )}
                  </Text>
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
                >
                  <Text style={styles.supportText}>
                    {campaignUnavailable
                      ? status === "Completed"
                        ? "Campaign Completed"
                        : "Campaign Closed"
                      : "Support Campaign"}
                  </Text>
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

export default Campaigns;

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
    fontSize: 15,
    fontWeight: "600",
    marginTop: 14,
  },

  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 20,
  },

  subtitle: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 25,
    lineHeight: 22,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },

  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  urgentBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  urgentText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 12,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: "auto",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
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

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },

  organization: {
    color: "#2563EB",
    fontWeight: "600",
    marginBottom: 12,
  },

  description: {
    color: "#64748B",
    lineHeight: 21,
    marginBottom: 12,
  },

  location: {
    color: "#475569",
    fontSize: 13,
    marginBottom: 18,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  statColumn: {
    flex: 1,
  },

  progressColumn: {
    alignItems: "flex-end",
  },

  label: {
    color: "#64748B",
    fontSize: 13,
  },

  value: {
    color: "#1E293B",
    fontWeight: "700",
    fontSize: 15,
    marginTop: 4,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  progressPercentage: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "700",
  },

  endDate: {
    color: "#94A3B8",
    fontSize: 11,
  },

  progressBar: {
    height: 10,
    width: "100%",
    backgroundColor: "#E2E8F0",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#22C55E",
    borderRadius: 20,
  },

  supportButton: {
    backgroundColor: "#2563EB",
    minHeight: 50,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    backgroundColor: "#94A3B8",
    opacity: 0.7,
  },

  supportText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

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

  emptyIcon: {
    fontSize: 52,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
  },

  emptyText: {
    color: "#64748B",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 23,
  },
});