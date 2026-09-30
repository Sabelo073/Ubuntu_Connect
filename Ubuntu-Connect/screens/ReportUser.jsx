import React, { useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

const ReportUser = ({ route, navigation }) => {
  const {
    reportedUserId,
    reportedUserName = "Ubuntu Connect User",
  } = route.params || {};

  const [selectedReason, setSelectedReason] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentUser = auth.currentUser;

  /*
    ----------------------------------------------------
    ERROR HANDLER
    ----------------------------------------------------
  */

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

  /*
    ----------------------------------------------------
    REPORT REASONS
    ----------------------------------------------------
  */

  const reportReasons = [
    {
      id: "harassment",
      title: "Harassment or bullying",
      description:
        "The user is being abusive, threatening, or repeatedly bothering me.",
      icon: "person-off",
    },

    {
      id: "inappropriate_content",
      title: "Inappropriate content",
      description:
        "The user is sending inappropriate or offensive content.",
      icon: "report",
    },

    {
      id: "scam",
      title: "Scam or fraud",
      description:
        "The user appears to be attempting to scam or deceive people.",
      icon: "warning",
    },

    {
      id: "impersonation",
      title: "Impersonation",
      description:
        "The user appears to be pretending to be someone else.",
      icon: "person-outline",
    },

    {
      id: "unsafe_behavior",
      title: "Unsafe behavior",
      description:
        "The user's behavior may put other Ubuntu Connect users at risk.",
      icon: "security",
    },

    {
      id: "other",
      title: "Other",
      description:
        "Something else that should be reviewed by an administrator.",
      icon: "more-horiz",
    },
  ];

  /*
    ----------------------------------------------------
    SELECT REPORT REASON
    ----------------------------------------------------
  */

  const selectReason = (reasonId) => {
    setSelectedReason(reasonId);
  };

  /*
    ----------------------------------------------------
    SUBMIT REPORT
    ----------------------------------------------------
  */

  const submitReport = async () => {
    if (!currentUser) {
      showError(
        "Report Error",
        "You must be logged in to report a user."
      );
      return;
    }

    if (!reportedUserId) {
      showError(
        "Report Error",
        "The user information could not be found."
      );
      return;
    }

    if (reportedUserId === currentUser.uid) {
      showError(
        "Report Error",
        "You cannot report your own account."
      );
      return;
    }

    if (!selectedReason) {
      showError(
        "Select a reason",
        "Please select a reason for reporting this user."
      );
      return;
    }

    if (submitting) {
      return;
    }

    const selectedReasonObject = reportReasons.find(
      (reason) => reason.id === selectedReason
    );

    try {
      setSubmitting(true);

      await addDoc(collection(db, "reports"), {
        reporterId: currentUser.uid,

        reporterName:
          currentUser.displayName ||
          currentUser.email ||
          "Ubuntu Connect User",

        reportedUserId,

        reportedUserName,

        reason: selectedReason,

        reasonTitle:
          selectedReasonObject?.title || "Other",

        details:
          additionalDetails.trim() || "",

        status: "pending",

        createdAt: serverTimestamp(),

        reviewedAt: null,

        reviewedBy: null,

        adminNotes: "",
      });

      if (
        Platform.OS === "web" &&
        typeof window !== "undefined"
      ) {
        window.alert(
          "Report Submitted\n\nThank you for helping keep Ubuntu Connect safe. An administrator will review this report."
        );

        navigation.goBack();
      } else {
        Alert.alert(
          "Report Submitted",
          "Thank you for helping keep Ubuntu Connect safe. An administrator will review this report.",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.log(
        "REPORT USER ERROR:",
        error.code,
        error.message
      );

      showError(
        "Report Error",
        error.message ||
          "Your report could not be submitted. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
    ----------------------------------------------------
    INVALID USER STATE
    ----------------------------------------------------
  */

  if (!reportedUserId || !currentUser) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["left", "right", "bottom"]}
      >
        <View style={styles.centerContainer}>
          <View style={styles.errorIconContainer}>
            <MaterialIcons
              name="report-problem"
              size={42}
              color="#2563EB"
            />
          </View>

          <Text style={styles.errorTitle}>
            Report Unavailable
          </Text>

          <Text style={styles.errorText}>
            The user information could not be found.
            Please return to the conversation and try
            again.
          </Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
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
        </View>
      </SafeAreaView>
    );
  }

  /*
    ----------------------------------------------------
    MAIN UI
    ----------------------------------------------------
  */

  return (
    <SafeAreaView
      style={styles.container}
      edges={["left", "right", "bottom"]}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color="#1E293B"
          />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            Report User
          </Text>

          <Text style={styles.headerSubtitle}>
            Help keep Ubuntu Connect safe
          </Text>
        </View>

        <View style={styles.headerIconContainer}>
          <MaterialIcons
            name="flag"
            size={22}
            color="#2563EB"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* USER INFORMATION */}

        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {reportedUserName
                ?.charAt(0)
                ?.toUpperCase() || "U"}
            </Text>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.reportingLabel}>
              You are reporting
            </Text>

            <Text
              style={styles.userName}
              numberOfLines={1}
            >
              {reportedUserName}
            </Text>

            <View style={styles.userStatus}>
              <MaterialIcons
                name="person"
                size={14}
                color="#64748B"
              />

              <Text style={styles.userStatusText}>
                Ubuntu Connect User
              </Text>
            </View>
          </View>
        </View>

        {/* INTRODUCTION */}

        <View style={styles.introContainer}>
          <View style={styles.introIcon}>
            <MaterialIcons
              name="security"
              size={21}
              color="#2563EB"
            />
          </View>

          <View style={styles.introTextContainer}>
            <Text style={styles.introTitle}>
              Help us keep the community safe
            </Text>

            <Text style={styles.introText}>
              Tell us what happened. Your report will
              be reviewed by an administrator.
            </Text>
          </View>
        </View>

        {/* REASON SECTION */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Why are you reporting this user?
          </Text>

          <Text style={styles.requiredText}>
            Required
          </Text>
        </View>

        <View style={styles.reasonsContainer}>
          {reportReasons.map((reason) => {
            const isSelected =
              selectedReason === reason.id;

            return (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonCard,

                  isSelected &&
                    styles.selectedReasonCard,
                ]}
                onPress={() =>
                  selectReason(reason.id)
                }
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.reasonIconContainer,

                    isSelected &&
                      styles.selectedReasonIconContainer,
                  ]}
                >
                  <MaterialIcons
                    name={reason.icon}
                    size={22}
                    color={
                      isSelected
                        ? "#2563EB"
                        : "#64748B"
                    }
                  />
                </View>

                <View style={styles.reasonTextContainer}>
                  <Text
                    style={[
                      styles.reasonTitle,

                      isSelected &&
                        styles.selectedReasonTitle,
                    ]}
                  >
                    {reason.title}
                  </Text>

                  <Text style={styles.reasonDescription}>
                    {reason.description}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radioOuter,

                    isSelected &&
                      styles.selectedRadioOuter,
                  ]}
                >
                  {isSelected && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ADDITIONAL DETAILS */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Additional details
          </Text>

          <Text style={styles.optionalText}>
            Optional
          </Text>
        </View>

        <Text style={styles.detailsHint}>
          Provide any information that could help an
          administrator understand the situation.
        </Text>

        <View style={styles.textInputContainer}>
          <TextInput
            style={styles.detailsInput}
            placeholder="Tell us what happened..."
            placeholderTextColor="#94A3B8"
            value={additionalDetails}
            onChangeText={setAdditionalDetails}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            autoCorrect
          />

          <Text style={styles.characterCount}>
            {additionalDetails.length}/1000
          </Text>
        </View>

        {/* PRIVACY NOTICE */}

        <View style={styles.privacyCard}>
          <MaterialIcons
            name="lock-outline"
            size={19}
            color="#64748B"
          />

          <Text style={styles.privacyText}>
            Your report is private and will only be
            shared with authorised Ubuntu Connect
            administrators for review.
          </Text>
        </View>

        {/* SUBMIT BUTTON */}

        <TouchableOpacity
          style={[
            styles.submitButton,

            (!selectedReason || submitting) &&
              styles.disabledSubmitButton,
          ]}
          onPress={submitReport}
          disabled={!selectedReason || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text style={styles.submitButtonText}>
                Submitting Report...
              </Text>
            </>
          ) : (
            <>
              <MaterialIcons
                name="flag"
                size={20}
                color="#FFFFFF"
              />

              <Text style={styles.submitButtonText}>
                Submit Report
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* CANCEL */}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={submitting}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>
            Cancel
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ReportUser;

const styles = StyleSheet.create({
  /*
    ----------------------------------------------------
    GENERAL
    ----------------------------------------------------
  */

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    backgroundColor: "#F8FAFC",
  },

  /*
    ----------------------------------------------------
    HEADER
    ----------------------------------------------------
  */

  header: {
    height: 70,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#FFFFFF",

    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",

    paddingHorizontal: 8,
  },

  headerBackButton: {
    width: 45,
    height: 45,

    justifyContent: "center",
    alignItems: "center",
  },

  headerTitleContainer: {
    flex: 1,
    marginLeft: 5,
  },

  headerTitle: {
    color: "#1E293B",
    fontSize: 18,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },

  headerIconContainer: {
    width: 42,
    height: 42,

    borderRadius: 21,

    backgroundColor: "#EFF6FF",

    justifyContent: "center",
    alignItems: "center",

    marginRight: 5,
  },

  /*
    ----------------------------------------------------
    SCROLL CONTENT
    ----------------------------------------------------
  */

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },

  /*
    ----------------------------------------------------
    USER CARD
    ----------------------------------------------------
  */

  userCard: {
    backgroundColor: "#FFFFFF",

    borderRadius: 17,

    padding: 15,

    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#E2E8F0",

    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 5,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 1,
  },

  userAvatar: {
    width: 54,
    height: 54,

    borderRadius: 27,

    backgroundColor: "#EFF6FF",

    justifyContent: "center",
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  userAvatarText: {
    color: "#2563EB",
    fontSize: 21,
    fontWeight: "800",
  },

  userInfo: {
    flex: 1,
    marginLeft: 13,
  },

  reportingLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },

  userName: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "800",
  },

  userStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  userStatusText: {
    color: "#64748B",
    fontSize: 11,
    marginLeft: 4,
  },

  /*
    ----------------------------------------------------
    INTRO
    ----------------------------------------------------
  */

  introContainer: {
    flexDirection: "row",

    backgroundColor: "#EFF6FF",

    borderRadius: 15,

    padding: 13,

    marginTop: 15,

    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  introIcon: {
    width: 38,
    height: 38,

    borderRadius: 19,

    backgroundColor: "#FFFFFF",

    justifyContent: "center",
    alignItems: "center",

    marginRight: 10,
  },

  introTextContainer: {
    flex: 1,
  },

  introTitle: {
    color: "#1E40AF",
    fontSize: 13,
    fontWeight: "800",
  },

  introText: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },

  /*
    ----------------------------------------------------
    SECTION HEADERS
    ----------------------------------------------------
  */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginTop: 23,
    marginBottom: 9,
  },

  sectionTitle: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "800",
  },

  requiredText: {
    color: "#DC2626",
    fontSize: 10,
    fontWeight: "700",
  },

  optionalText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
  },

  /*
    ----------------------------------------------------
    REPORT REASONS
    ----------------------------------------------------
  */

  reasonsContainer: {
    gap: 9,
  },

  reasonCard: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#FFFFFF",

    borderRadius: 15,

    padding: 12,

    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  selectedReasonCard: {
    borderColor: "#2563EB",
    backgroundColor: "#F8FBFF",
  },

  reasonIconContainer: {
    width: 42,
    height: 42,

    borderRadius: 21,

    backgroundColor: "#F1F5F9",

    justifyContent: "center",
    alignItems: "center",

    marginRight: 11,
  },

  selectedReasonIconContainer: {
    backgroundColor: "#EFF6FF",
  },

  reasonTextContainer: {
    flex: 1,
    paddingRight: 7,
  },

  reasonTitle: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "800",
  },

  selectedReasonTitle: {
    color: "#1D4ED8",
  },

  reasonDescription: {
    color: "#64748B",
    fontSize: 10.5,
    lineHeight: 15,

    marginTop: 3,
  },

  radioOuter: {
    width: 21,
    height: 21,

    borderRadius: 10.5,

    borderWidth: 2,
    borderColor: "#CBD5E1",

    justifyContent: "center",
    alignItems: "center",
  },

  selectedRadioOuter: {
    borderColor: "#2563EB",
  },

  radioInner: {
    width: 11,
    height: 11,

    borderRadius: 5.5,

    backgroundColor: "#2563EB",
  },

  /*
    ----------------------------------------------------
    DETAILS
    ----------------------------------------------------
  */

  detailsHint: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 8,
  },

  textInputContainer: {
    backgroundColor: "#FFFFFF",

    borderRadius: 15,

    borderWidth: 1,
    borderColor: "#E2E8F0",

    minHeight: 145,

    overflow: "hidden",
  },

  detailsInput: {
    flex: 1,

    minHeight: 115,

    color: "#1E293B",

    fontSize: 13,
    lineHeight: 19,

    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 8,
  },

  characterCount: {
    color: "#94A3B8",
    fontSize: 9,

    textAlign: "right",

    paddingHorizontal: 12,
    paddingBottom: 9,
  },

  /*
    ----------------------------------------------------
    PRIVACY
    ----------------------------------------------------
  */

  privacyCard: {
    flexDirection: "row",
    alignItems: "flex-start",

    backgroundColor: "#F1F5F9",

    borderRadius: 13,

    padding: 12,

    marginTop: 15,
  },

  privacyText: {
    flex: 1,

    color: "#64748B",

    fontSize: 10.5,
    lineHeight: 16,

    marginLeft: 8,
  },

  /*
    ----------------------------------------------------
    SUBMIT
    ----------------------------------------------------
  */

  submitButton: {
    height: 52,

    borderRadius: 15,

    backgroundColor: "#2563EB",

    justifyContent: "center",
    alignItems: "center",

    flexDirection: "row",

    marginTop: 18,

    shadowColor: "#2563EB",
    shadowOpacity: 0.16,
    shadowRadius: 7,

    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 2,
  },

  disabledSubmitButton: {
    backgroundColor: "#CBD5E1",

    shadowOpacity: 0,
    elevation: 0,
  },

  submitButtonText: {
    color: "#FFFFFF",

    fontSize: 14,
    fontWeight: "800",

    marginLeft: 7,
  },

  /*
    ----------------------------------------------------
    CANCEL
    ----------------------------------------------------
  */

  cancelButton: {
    height: 45,

    justifyContent: "center",
    alignItems: "center",

    marginTop: 4,
  },

  cancelButtonText: {
    color: "#64748B",

    fontSize: 13,
    fontWeight: "700",
  },

  /*
    ----------------------------------------------------
    ERROR STATE
    ----------------------------------------------------
  */

  errorIconContainer: {
    width: 90,
    height: 90,

    borderRadius: 45,

    backgroundColor: "#EFF6FF",

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 5,
  },

  errorTitle: {
    color: "#1E293B",

    fontSize: 21,

    fontWeight: "800",

    marginTop: 15,
  },

  errorText: {
    color: "#64748B",

    textAlign: "center",

    marginTop: 8,

    lineHeight: 21,
  },

  backButton: {
    backgroundColor: "#2563EB",

    borderRadius: 14,

    paddingHorizontal: 22,
    paddingVertical: 13,

    marginTop: 22,

    flexDirection: "row",
    alignItems: "center",
  },

  backButtonText: {
    color: "#FFFFFF",

    fontWeight: "700",

    marginLeft: 7,
  },

  bottomSpacing: {
    height: 25,
  },
});

