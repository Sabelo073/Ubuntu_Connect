import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { SafeAreaView } from "react-native-safe-area-context";

import { auth, db } from "../firebaseConfig";

function UpdateCampaign({ route, navigation }) {
  const {
    campaignId,
    campaignTitle = "Community Campaign",
    campaignType = "Items",
    itemName = "Items",
    targetItems = 0,
    collectedItems = 0,
    targetAmount = 0,
    currentAmount = 0,
  } = route.params || {};

  const [campaign, setCampaign] = useState(null);

  const [newProgress, setNewProgress] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    const loadCampaign = async () => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setLoading(false);

        showMessage(
          "Login Required",
          "Please log in before updating a campaign."
        );

        navigation.replace("Login");
        return;
      }

      if (!campaignId) {
        setLoading(false);

        showMessage(
          "Campaign Error",
          "The campaign ID could not be found."
        );

        navigation.goBack();
        return;
      }

      try {
        const userReference = doc(
          db,
          "users",
          currentUser.uid
        );

        const campaignReference = doc(
          db,
          "campaigns",
          campaignId
        );

        const [
          userSnapshot,
          campaignSnapshot,
        ] = await Promise.all([
          getDoc(userReference),
          getDoc(campaignReference),
        ]);

        if (!userSnapshot.exists()) {
          showMessage(
            "Access Denied",
            "Your user profile could not be found."
          );

          navigation.goBack();
          return;
        }

        const userData = userSnapshot.data();

        if (userData.role?.trim() !== "Admin") {
          showMessage(
            "Access Denied",
            "Only administrators can update campaigns."
          );

          navigation.goBack();
          return;
        }

        if (!campaignSnapshot.exists()) {
          showMessage(
            "Campaign Error",
            "The campaign could not be found."
          );

          navigation.goBack();
          return;
        }

        const campaignData = {
          id: campaignSnapshot.id,
          ...campaignSnapshot.data(),
        };

        setCampaign(campaignData);

        if (campaignData.campaignType === "Money") {
          setNewProgress(
            String(campaignData.currentAmount || 0)
          );
        } else {
          setNewProgress(
            String(campaignData.collectedItems || 0)
          );
        }
      } catch (error) {
        console.log(
          "LOAD CAMPAIGN ERROR:",
          error.code,
          error.message
        );

        showMessage(
          "Campaign Error",
          error.message ||
            "The campaign could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    };

    loadCampaign();
  }, [campaignId, navigation]);

  const activeCampaignType =
    campaign?.campaignType ||
    campaignType ||
    "Items";

  const activeCampaignTitle =
    campaign?.title ||
    campaignTitle ||
    "Community Campaign";

  const activeItemName =
    campaign?.itemName ||
    itemName ||
    "Items";

  const activeTarget =
    activeCampaignType === "Money"
      ? Number(
          campaign?.targetAmount ??
            targetAmount ??
            0
        )
      : Number(
          campaign?.targetItems ??
            targetItems ??
            0
        );

  const activeCurrentProgress =
    activeCampaignType === "Money"
      ? Number(
          campaign?.currentAmount ??
            currentAmount ??
            0
        )
      : Number(
          campaign?.collectedItems ??
            collectedItems ??
            0
        );

  const progressPercentage =
    activeTarget > 0
      ? Math.min(
          (activeCurrentProgress /
            activeTarget) *
            100,
          100
        )
      : 0;

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString();
  };

  const saveProgress = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      showMessage(
        "Login Required",
        "Please log in before updating this campaign."
      );

      return;
    }

    if (!campaignId) {
      showMessage(
        "Campaign Error",
        "The campaign ID could not be found."
      );

      return;
    }

    if (!newProgress.trim()) {
      showMessage(
        "Missing Progress",
        activeCampaignType === "Money"
          ? "Enter the amount currently raised."
          : "Enter the number of items currently collected."
      );

      return;
    }

    const progressValue = Number(
      newProgress.trim()
    );

    if (
      Number.isNaN(progressValue) ||
      progressValue < 0
    ) {
      showMessage(
        "Invalid Progress",
        "Progress must be a number that is zero or greater."
      );

      return;
    }

    if (
      activeCampaignType === "Items" &&
      !Number.isInteger(progressValue)
    ) {
      showMessage(
        "Invalid Item Total",
        "The number of items must be a whole number."
      );

      return;
    }

    const targetReached =
      activeTarget > 0 &&
      progressValue >= activeTarget;

    const updatedStatus = targetReached
      ? "Completed"
      : campaign?.status === "Completed"
      ? "Active"
      : campaign?.status || "Active";

    const updateData = {
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid,
      status: updatedStatus,
    };

    if (activeCampaignType === "Money") {
      updateData.currentAmount =
        progressValue;
    } else {
      updateData.collectedItems =
        progressValue;
    }

    try {
      setSaving(true);

      await updateDoc(
        doc(db, "campaigns", campaignId),
        updateData
      );

      const successMessage = targetReached
        ? "Campaign progress was updated and the campaign was marked as completed."
        : "Campaign progress was updated successfully.";

      showMessage(
        "Progress Updated",
        successMessage
      );

      navigation.goBack();
    } catch (error) {
      console.log(
        "UPDATE CAMPAIGN ERROR:",
        error.code,
        error.message
      );

      showMessage(
        "Update Error",
        error.message ||
          "The campaign progress could not be updated."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Loading campaign...
        </Text>
      </SafeAreaView>
    );
  }

  if (!campaignId) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorIcon}>
          📢
        </Text>

        <Text style={styles.errorTitle}>
          Campaign Unavailable
        </Text>

        <Text style={styles.errorText}>
          The campaign information could not be found.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>
            Go Back
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.headerBackText}>
              ‹
            </Text>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.heading}>
              Update Campaign
            </Text>

            <Text
              style={styles.subtitle}
              numberOfLines={1}
            >
              {activeCampaignTitle}
            </Text>
          </View>
        </View>

        <View style={styles.campaignCard}>
          <View style={styles.campaignIconContainer}>
            <Text style={styles.campaignIcon}>
              {activeCampaignType === "Money"
                ? "💰"
                : "📦"}
            </Text>
          </View>

          <View style={styles.campaignInformation}>
            <Text
              style={styles.campaignTitle}
              numberOfLines={2}
            >
              {activeCampaignTitle}
            </Text>

            <Text style={styles.campaignType}>
              {activeCampaignType} campaign
            </Text>
          </View>
        </View>

        <View style={styles.statisticsCard}>
          <View style={styles.statisticColumn}>
            <Text style={styles.statisticLabel}>
              Target
            </Text>

            <Text style={styles.statisticValue}>
              {activeCampaignType === "Money"
                ? `R${formatNumber(activeTarget)}`
                : `${formatNumber(
                    activeTarget
                  )} ${activeItemName}`}
            </Text>
          </View>

          <View
            style={[
              styles.statisticColumn,
              styles.rightStatisticColumn,
            ]}
          >
            <Text style={styles.statisticLabel}>
              Current
            </Text>

            <Text style={styles.statisticValue}>
              {activeCampaignType === "Money"
                ? `R${formatNumber(
                    activeCurrentProgress
                  )}`
                : `${formatNumber(
                    activeCurrentProgress
                  )} collected`}
            </Text>
          </View>
        </View>

        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            Current progress
          </Text>

          <Text style={styles.progressPercentage}>
            {Math.round(progressPercentage)}%
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

        <View style={styles.formCard}>
          <Text style={styles.formHeading}>
            Update Progress
          </Text>

          <Text style={styles.formDescription}>
            {activeCampaignType === "Money"
              ? "Enter the total amount raised so far. Do not enter only the latest contribution."
              : `Enter the total number of ${activeItemName.toLowerCase()} collected so far.`}
          </Text>

          <Text style={styles.inputLabel}>
            {activeCampaignType === "Money"
              ? "Total amount raised"
              : "Total items collected"}
          </Text>

          <View style={styles.inputContainer}>
            {activeCampaignType === "Money" && (
              <Text style={styles.currencyPrefix}>
                R
              </Text>
            )}

            <TextInput
              value={newProgress}
              onChangeText={setNewProgress}
              placeholder={
                activeCampaignType === "Money"
                  ? "Example: 25000"
                  : "Example: 350"
              }
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              style={styles.input}
              editable={!saving}
            />
          </View>

          <Text style={styles.targetHelp}>
            {activeCampaignType === "Money"
              ? `Campaign target: R${formatNumber(
                  activeTarget
                )}`
              : `Campaign target: ${formatNumber(
                  activeTarget
                )} ${activeItemName}`}
          </Text>

          {Number(newProgress) >= activeTarget &&
            activeTarget > 0 && (
              <View style={styles.completionNotice}>
                <Text
                  style={
                    styles.completionNoticeIcon
                  }
                >
                  ✅
                </Text>

                <Text
                  style={
                    styles.completionNoticeText
                  }
                >
                  The target has been reached. Saving
                  will mark this campaign as completed.
                </Text>
              </View>
            )}

          <TouchableOpacity
            style={[
              styles.saveButton,
              saving && styles.disabledButton,
            ]}
            onPress={saveProgress}
            disabled={saving}
          >
            {saving ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text style={styles.saveButtonText}>
                  Saving Progress...
                </Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>
                Save Progress
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.informationCard}>
          <Text style={styles.informationTitle}>
            Important
          </Text>

          <Text style={styles.informationText}>
            Enter the complete total collected so far,
            not only the amount or items received today.
          </Text>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default UpdateCampaign;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    paddingHorizontal: 20,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  loadingText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 14,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 24,
  },

  headerBackButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  headerBackText: {
    color: "#1E293B",
    fontSize: 32,
    lineHeight: 34,
  },

  headerTextContainer: {
    flex: 1,
  },

  heading: {
    color: "#1E293B",
    fontSize: 26,
    fontWeight: "800",
  },

  subtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 3,
  },

  campaignCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 17,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },

  campaignIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  campaignIcon: {
    fontSize: 28,
  },

  campaignInformation: {
    flex: 1,
  },

  campaignTitle: {
    color: "#1E293B",
    fontSize: 17,
    fontWeight: "700",
  },

  campaignType: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 5,
  },

  statisticsCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    marginBottom: 16,
  },

  statisticColumn: {
    flex: 1,
  },

  rightStatisticColumn: {
    alignItems: "flex-end",
  },

  statisticLabel: {
    color: "#64748B",
    fontSize: 12,
  },

  statisticValue: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 5,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  progressLabel: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },

  progressPercentage: {
    color: "#16A34A",
    fontSize: 13,
    fontWeight: "800",
  },

  progressBar: {
    width: "100%",
    height: 11,
    backgroundColor: "#E2E8F0",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 22,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#22C55E",
    borderRadius: 20,
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },

  formHeading: {
    color: "#1E293B",
    fontSize: 19,
    fontWeight: "800",
  },

  formDescription: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 20,
  },

  inputLabel: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },

  inputContainer: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 15,
    overflow: "hidden",
  },

  currencyPrefix: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 16,
  },

  input: {
    flex: 1,
    minHeight: 56,
    color: "#1E293B",
    fontSize: 16,
    paddingHorizontal: 16,
  },

  targetHelp: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 8,
    marginBottom: 18,
  },

  completionNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 13,
    padding: 13,
    marginBottom: 18,
  },

  completionNoticeIcon: {
    fontSize: 18,
    marginRight: 10,
  },

  completionNoticeText: {
    flex: 1,
    color: "#15803D",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },

  saveButton: {
    minHeight: 55,
    backgroundColor: "#2563EB",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 7,
  },

  cancelButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },

  cancelButtonText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "700",
  },

  informationCard: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 17,
    padding: 16,
  },

  informationTitle: {
    color: "#92400E",
    fontSize: 14,
    fontWeight: "800",
  },

  informationText: {
    color: "#A16207",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  errorIcon: {
    fontSize: 58,
  },

  errorTitle: {
    color: "#1E293B",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 15,
  },

  errorText: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },

  backButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 13,
    marginTop: 20,
  },

  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});