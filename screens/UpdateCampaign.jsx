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

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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
          "The campaign could not be loaded. Please try again."
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

  const enteredProgress = Number(newProgress);

  const enteredProgressPercentage =
    activeTarget > 0 &&
    !Number.isNaN(enteredProgress)
      ? Math.min(
          (enteredProgress / activeTarget) * 100,
          100
        )
      : 0;

  const targetReached =
    activeTarget > 0 &&
    !Number.isNaN(enteredProgress) &&
    enteredProgress >= activeTarget;

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
        "The campaign progress could not be updated. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <MaterialIcons
            name="campaign"
            size={30}
            color="#2563EB"
          />
        </View>

        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingTitle}>
          Loading campaign
        </Text>

        <Text style={styles.loadingText}>
          We're getting the latest campaign information.
        </Text>
      </SafeAreaView>
    );
  }

  if (!campaignId) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.errorIconContainer}>
          <MaterialIcons
            name="campaign"
            size={40}
            color="#EF4444"
          />
        </View>

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
          <MaterialIcons
            name="arrow-back"
            size={19}
            color="#FFFFFF"
          />

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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color="#1E293B"
            />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <View style={styles.adminLabel}>
              <MaterialIcons
                name="admin-panel-settings"
                size={14}
                color="#2563EB"
              />

              <Text style={styles.adminLabelText}>
                ADMIN CONTROL
              </Text>
            </View>

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

        {/* Campaign Card */}
        <View style={styles.campaignCard}>
          <View
            style={[
              styles.campaignIconContainer,
              activeCampaignType === "Money"
                ? styles.moneyIconBackground
                : styles.itemsIconBackground,
            ]}
          >
            <MaterialIcons
              name={
                activeCampaignType === "Money"
                  ? "payments"
                  : "inventory-2"
              }
              size={29}
              color={
                activeCampaignType === "Money"
                  ? "#16A34A"
                  : "#2563EB"
              }
            />
          </View>

          <View style={styles.campaignInformation}>
            <Text
              style={styles.campaignTitle}
              numberOfLines={2}
            >
              {activeCampaignTitle}
            </Text>

            <View style={styles.typeBadge}>
              <MaterialIcons
                name={
                  activeCampaignType === "Money"
                    ? "payments"
                    : "inventory-2"
                }
                size={13}
                color="#2563EB"
              />

              <Text style={styles.campaignType}>
                {activeCampaignType} campaign
              </Text>
            </View>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statisticsCard}>
          <View style={styles.statisticColumn}>
            <View style={styles.statIconRow}>
              <MaterialIcons
                name="flag"
                size={18}
                color="#2563EB"
              />

              <Text style={styles.statisticLabel}>
                Target
              </Text>
            </View>

            <Text style={styles.statisticValue}>
              {activeCampaignType === "Money"
                ? `R${formatNumber(activeTarget)}`
                : `${formatNumber(
                    activeTarget
                  )} ${activeItemName}`}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View
            style={[
              styles.statisticColumn,
              styles.rightStatisticColumn,
            ]}
          >
            <View style={styles.statIconRow}>
              <MaterialIcons
                name="trending-up"
                size={18}
                color="#22C55E"
              />

              <Text style={styles.statisticLabel}>
                Current
              </Text>
            </View>

            <Text
              style={[
                styles.statisticValue,
                styles.currentValue,
              ]}
            >
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

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressLabel}>
                Campaign Progress
              </Text>

              <Text style={styles.progressSubtext}>
                {formatNumber(
                  activeCurrentProgress
                )} of{" "}
                {formatNumber(activeTarget)}
              </Text>
            </View>

            <View style={styles.percentageBadge}>
              <Text style={styles.progressPercentage}>
                {Math.round(progressPercentage)}%
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

          {progressPercentage >= 100 ? (
            <View style={styles.completedStatus}>
              <MaterialIcons
                name="check-circle"
                size={17}
                color="#16A34A"
              />

              <Text style={styles.completedStatusText}>
                Target reached
              </Text>
            </View>
          ) : (
            <View style={styles.remainingStatus}>
              <MaterialIcons
                name="trending-up"
                size={17}
                color="#2563EB"
              />

              <Text style={styles.remainingStatusText}>
                {Math.max(
                  activeTarget -
                    activeCurrentProgress,
                  0
                ).toLocaleString()}{" "}
                remaining to reach the target
              </Text>
            </View>
          )}
        </View>

        {/* Update Form */}
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.formIcon}>
              <MaterialIcons
                name="edit"
                size={21}
                color="#2563EB"
              />
            </View>

            <View style={styles.formHeaderText}>
              <Text style={styles.formHeading}>
                Update Progress
              </Text>

              <Text style={styles.formDescription}>
                Enter the complete total collected so far.
              </Text>
            </View>
          </View>

          <View style={styles.instructionCard}>
            <MaterialIcons
              name="info-outline"
              size={19}
              color="#2563EB"
            />

            <Text style={styles.instructionText}>
              {activeCampaignType === "Money"
                ? "Enter the total amount raised so far, not just the latest contribution."
                : `Enter the total number of ${activeItemName.toLowerCase()} collected so far.`}
            </Text>
          </View>

          <Text style={styles.inputLabel}>
            {activeCampaignType === "Money"
              ? "Total amount raised"
              : "Total items collected"}
          </Text>

          <View
            style={[
              styles.inputContainer,
              targetReached &&
                styles.inputCompleted,
            ]}
          >
            {activeCampaignType === "Money" ? (
              <View style={styles.currencyContainer}>
                <Text style={styles.currencyPrefix}>
                  R
                </Text>
              </View>
            ) : (
              <View style={styles.inputIcon}>
                <MaterialIcons
                  name="inventory-2"
                  size={21}
                  color="#64748B"
                />
              </View>
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

            {newProgress.length > 0 &&
              !Number.isNaN(enteredProgress) && (
                <MaterialIcons
                  name={
                    targetReached
                      ? "check-circle"
                      : "edit"
                  }
                  size={20}
                  color={
                    targetReached
                      ? "#22C55E"
                      : "#94A3B8"
                  }
                  style={styles.inputStatusIcon}
                />
              )}
          </View>

          <View style={styles.targetRow}>
            <View style={styles.targetInfo}>
              <MaterialIcons
                name="flag"
                size={15}
                color="#64748B"
              />

              <Text style={styles.targetHelp}>
                Target:{" "}
                {activeCampaignType === "Money"
                  ? `R${formatNumber(
                      activeTarget
                    )}`
                  : `${formatNumber(
                      activeTarget
                    )} ${activeItemName}`}
              </Text>
            </View>

            {newProgress.length > 0 &&
              !Number.isNaN(enteredProgress) && (
                <Text style={styles.enteredPercentage}>
                  {Math.round(
                    enteredProgressPercentage
                  )}
                  %
                </Text>
              )}
          </View>

          {/* Live Preview */}
          {newProgress.length > 0 &&
            !Number.isNaN(enteredProgress) && (
              <View
                style={[
                  styles.previewCard,
                  targetReached &&
                    styles.previewCompleted,
                ]}
              >
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle}>
                    New progress preview
                  </Text>

                  <MaterialIcons
                    name={
                      targetReached
                        ? "check-circle"
                        : "preview"
                    }
                    size={18}
                    color={
                      targetReached
                        ? "#16A34A"
                        : "#2563EB"
                    }
                  />
                </View>

                <View style={styles.previewProgressBar}>
                  <View
                    style={[
                      styles.previewProgressFill,
                      {
                        width: `${enteredProgressPercentage}%`,
                      },
                      targetReached &&
                        styles.previewCompletedFill,
                    ]}
                  />
                </View>

                <Text
                  style={[
                    styles.previewResult,
                    targetReached &&
                      styles.previewResultCompleted,
                  ]}
                >
                  {targetReached
                    ? "Target reached — campaign will be completed"
                    : `${formatNumber(
                        Math.max(
                          activeTarget -
                            enteredProgress,
                          0
                        )
                      )} remaining to reach target`}
                </Text>
              </View>
            )}

          {/* Completion Notice */}
          {targetReached && (
            <View style={styles.completionNotice}>
              <View style={styles.completionIcon}>
                <MaterialIcons
                  name="check-circle"
                  size={21}
                  color="#16A34A"
                />
              </View>

              <View style={styles.completionContent}>
                <Text style={styles.completionTitle}>
                  Target reached
                </Text>

                <Text style={styles.completionText}>
                  Saving this update will automatically
                  mark the campaign as completed.
                </Text>
              </View>
            </View>
          )}

          {/* Save */}
          <TouchableOpacity
            activeOpacity={0.85}
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
              <View style={styles.buttonContent}>
                <MaterialIcons
                  name="save"
                  size={20}
                  color="#FFFFFF"
                />

                <Text style={styles.saveButtonText}>
                  Save Progress
                </Text>

                <MaterialIcons
                  name="arrow-forward"
                  size={19}
                  color="#FFFFFF"
                />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <MaterialIcons
              name="close"
              size={19}
              color="#64748B"
            />

            <Text style={styles.cancelButtonText}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>

        {/* Important Information */}
        <View style={styles.informationCard}>
          <View style={styles.informationIcon}>
            <MaterialIcons
              name="lightbulb-outline"
              size={20}
              color="#F59E0B"
            />
          </View>

          <View style={styles.informationContent}>
            <Text style={styles.informationTitle}>
              Keep the progress accurate
            </Text>

            <Text style={styles.informationText}>
              Always enter the complete total collected
              so far. For example, if the campaign had
              100 items and receives 25 more, enter 125,
              not 25.
            </Text>
          </View>
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
    paddingTop: 4,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  loadingTitle: {
    color: "#1E293B",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 14,
  },

  loadingText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    marginTop: 5,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 20,
  },

  headerBackButton: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  headerTextContainer: {
    flex: 1,
  },

  adminLabel: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },

  adminLabelText: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginLeft: 4,
  },

  heading: {
    color: "#1E293B",
    fontSize: 25,
    fontWeight: "800",
  },

  subtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 2,
  },

  campaignCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  campaignIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  moneyIconBackground: {
    backgroundColor: "#F0FDF4",
  },

  itemsIconBackground: {
    backgroundColor: "#EFF6FF",
  },

  campaignInformation: {
    flex: 1,
  },

  campaignTitle: {
    color: "#1E293B",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },

  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 7,
  },

  campaignType: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
  },

  statisticsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  statisticColumn: {
    flex: 1,
  },

  rightStatisticColumn: {
    alignItems: "flex-end",
  },

  statIconRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  statisticLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },

  statisticValue: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
  },

  currentValue: {
    color: "#16A34A",
  },

  statDivider: {
    width: 1,
    height: 42,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 15,
  },

  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 11,
  },

  progressLabel: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "800",
  },

  progressSubtext: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 3,
  },

  percentageBadge: {
    minWidth: 48,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
  },

  progressPercentage: {
    color: "#16A34A",
    fontSize: 14,
    fontWeight: "800",
  },

  progressBar: {
    width: "100%",
    height: 10,
    backgroundColor: "#E2E8F0",
    borderRadius: 20,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#22C55E",
    borderRadius: 20,
  },

  completedStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
  },

  completedStatusText: {
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 5,
  },

  remainingStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
  },

  remainingStatusText: {
    color: "#64748B",
    fontSize: 11,
    marginLeft: 5,
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 19,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  formIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  formHeaderText: {
    flex: 1,
  },

  formHeading: {
    color: "#1E293B",
    fontSize: 18,
    fontWeight: "800",
  },

  formDescription: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 3,
  },

  instructionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 13,
    padding: 12,
    marginBottom: 18,
  },

  instructionText: {
    flex: 1,
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 8,
  },

  inputLabel: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },

  inputContainer: {
    minHeight: 57,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 15,
  },

  inputCompleted: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
  },

  currencyContainer: {
    paddingLeft: 16,
  },

  currencyPrefix: {
    color: "#1E293B",
    fontSize: 17,
    fontWeight: "800",
  },

  inputIcon: {
    paddingLeft: 16,
  },

  input: {
    flex: 1,
    minHeight: 55,
    color: "#1E293B",
    fontSize: 16,
    paddingHorizontal: 12,
  },

  inputStatusIcon: {
    marginRight: 14,
  },

  targetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 15,
  },

  targetInfo: {
    flexDirection: "row",
    alignItems: "center",
  },

  targetHelp: {
    color: "#94A3B8",
    fontSize: 11,
    marginLeft: 5,
  },

  enteredPercentage: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "800",
  },

  previewCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 13,
    marginBottom: 14,
  },

  previewCompleted: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },

  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
  },

  previewTitle: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },

  previewProgressBar: {
    height: 7,
    backgroundColor: "#E2E8F0",
    borderRadius: 20,
    overflow: "hidden",
  },

  previewProgressFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 20,
  },

  previewCompletedFill: {
    backgroundColor: "#22C55E",
  },

  previewResult: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 8,
  },

  previewResultCompleted: {
    color: "#15803D",
    fontWeight: "700",
  },

  completionNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 13,
    marginBottom: 17,
  },

  completionIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },

  completionContent: {
    flex: 1,
    marginLeft: 10,
  },

  completionTitle: {
    color: "#15803D",
    fontSize: 13,
    fontWeight: "800",
  },

  completionText: {
    color: "#166534",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 2,
  },

  saveButton: {
    minHeight: 56,
    backgroundColor: "#2563EB",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  disabledButton: {
    opacity: 0.65,
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginHorizontal: 8,
  },

  cancelButton: {
    minHeight: 50,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 15,
    marginTop: 11,
  },

  cancelButtonText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 5,
  },

  informationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 17,
    padding: 15,
  },

  informationIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },

  informationContent: {
    flex: 1,
    marginLeft: 10,
  },

  informationTitle: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "800",
  },

  informationText: {
    color: "#A16207",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  errorIconContainer: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },

  errorTitle: {
    color: "#1E293B",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 16,
  },

  errorText: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
    marginTop: 7,
  },

  backButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingHorizontal: 21,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 6,
  },
});