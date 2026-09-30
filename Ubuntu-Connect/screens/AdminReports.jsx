import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import {
  collection,
  onSnapshot,
  updateDoc,
  addDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

import { useSession } from "../context/SessionContext";


const AdminReports = ({ navigation }) => {
  const { writeAuditLog } = useSession();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filter, setFilter] = useState("pending");


  /*
   * ---------------------------------------------------------
   * SHOW MESSAGE
   * ---------------------------------------------------------
   */

  const showMessage = (title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };


  /*
   * ---------------------------------------------------------
   * CONFIRMATION
   * ---------------------------------------------------------
   */

  const showConfirmation = (
    title,
    message,
    onConfirm
  ) => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `${title}\n\n${message}`
      );

      if (confirmed) {
        onConfirm();
      }

      return;
    }

    Alert.alert(
      title,
      message,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: onConfirm,
          style: "destructive",
        },
      ]
    );
  };


  /*
   * ---------------------------------------------------------
   * LOAD REPORTS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "reports"),
      (snapshot) => {
        const reportList = snapshot.docs.map(
          (reportDoc) => ({
            id: reportDoc.id,
            ...reportDoc.data(),
          })
        );

        /*
         * Sort newest reports first.
         *
         * We do this in JavaScript instead of using
         * orderBy() so that the app does not require
         * a Firestore composite index.
         */

        reportList.sort((a, b) => {
          const dateA =
            a.createdAt?.toDate?.()?.getTime?.() ||
            0;

          const dateB =
            b.createdAt?.toDate?.()?.getTime?.() ||
            0;

          return dateB - dateA;
        });

        setReports(reportList);
        setLoading(false);
      },
      (error) => {
        console.log(
          "REPORTS LOAD ERROR:",
          error.code,
          error.message
        );

        setLoading(false);

        showMessage(
          "Reports Error",
          "We could not load the user reports."
        );
      }
    );

    return () => unsubscribe();
  }, []);


  /*
   * ---------------------------------------------------------
   * FORMAT DATE
   * ---------------------------------------------------------
   */

  const formatDate = (timestamp) => {
    if (!timestamp) {
      return "Date unavailable";
    }

    try {
      const date = timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

      return date.toLocaleString();
    } catch (error) {
      return "Date unavailable";
    }
  };


  /*
   * ---------------------------------------------------------
   * CREATE NOTIFICATION
   * ---------------------------------------------------------
   */

  const createNotification = async (
    userId,
    title,
    message,
    type
  ) => {
    if (!userId) {
      console.log(
        "NOTIFICATION SKIPPED: User ID missing."
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
   * ---------------------------------------------------------
   * UPDATE USER STATUS
   * ---------------------------------------------------------
   */

  const updateUserStatus = async (
    report,
    newStatus
  ) => {
    if (!auth.currentUser) {
      showMessage(
        "Authentication Error",
        "Your admin session could not be found."
      );
      return;
    }

    if (!report?.reportedUserId) {
      showMessage(
        "Error",
        "The reported user's ID could not be found."
      );
      return;
    }

    setProcessingId(report.id);

    try {
      /*
       * Update the user document.
       */

      await updateDoc(
        doc(
          db,
          "users",
          report.reportedUserId
        ),
        {
          status: newStatus,
          statusUpdatedAt: serverTimestamp(),
          statusUpdatedBy:
            auth.currentUser.uid,
        }
      );


      /*
       * Update the report.
       */

      await updateDoc(
        doc(db, "reports", report.id),
        {
          status: "reviewed",
          reviewedAt: serverTimestamp(),
          reviewedBy:
            auth.currentUser.uid,
          adminNotes:
            `Admin action: User status changed to ${newStatus}.`,
        }
      );


      /*
       * Create audit log.
       */

      let auditAction = "";

      if (newStatus === "suspended") {
        auditAction = "USER_SUSPENDED";
      } else if (newStatus === "archived") {
        auditAction = "USER_ARCHIVED";
      } else {
        auditAction = "USER_REACTIVATED";
      }

      await writeAuditLog({
        action: auditAction,
        description:
          `Admin changed the status of ${report.reportedUserName || "user"} to ${newStatus} after reviewing a user report.`,
        actorRole: "Admin",
        targetType: "User",
        targetId:
          report.reportedUserId,
        metadata: {
          reportId: report.id,
          reportedUserId:
            report.reportedUserId,
          reportedUserName:
            report.reportedUserName || "",
          reporterId:
            report.reporterId || "",
          reporterName:
            report.reporterName || "",
          reason:
            report.reasonTitle ||
            report.reason ||
            "Other",
          newStatus,
        },
      });


      /*
       * Send notification.
       */

      if (newStatus === "suspended") {
        await createNotification(
          report.reportedUserId,
          "Account Suspended",
          "Your Ubuntu Connect account has been suspended following a user report review.",
          "account_status"
        );
      }

      if (newStatus === "archived") {
        await createNotification(
          report.reportedUserId,
          "Account Archived",
          "Your Ubuntu Connect account has been archived following a user report review.",
          "account_status"
        );
      }

      if (newStatus === "active") {
        await createNotification(
          report.reportedUserId,
          "Account Active",
          "Your Ubuntu Connect account has been kept active after the report was reviewed.",
          "account_status"
        );
      }


      /*
       * Clear selected report.
       */

      setSelectedReport(null);

      showMessage(
        "Action Completed",
        `The user's account is now ${newStatus}.`
      );
    } catch (error) {
      console.log(
        "USER STATUS ERROR:",
        error.code,
        error.message
      );

      showMessage(
        "Action Failed",
        "We could not update the user's account. Please try again."
      );
    } finally {
      setProcessingId(null);
    }
  };


  /*
   * ---------------------------------------------------------
   * MARK REPORT REVIEWED
   * ---------------------------------------------------------
   */

  const markReportReviewed = async (
    report
  ) => {
    if (!auth.currentUser) {
      showMessage(
        "Authentication Error",
        "Your admin session could not be found."
      );
      return;
    }

    if (!report?.id) {
      return;
    }

    setProcessingId(report.id);

    try {
      await updateDoc(
        doc(db, "reports", report.id),
        {
          status: "reviewed",
          reviewedAt: serverTimestamp(),
          reviewedBy:
            auth.currentUser.uid,
          adminNotes:
            "Report reviewed by administrator.",
        }
      );


      await writeAuditLog({
        action: "REPORT_REVIEWED",
        description:
          `Admin reviewed a report involving ${report.reportedUserName || "a user"}.`,
        actorRole: "Admin",
        targetType: "Report",
        targetId: report.id,
        metadata: {
          reportedUserId:
            report.reportedUserId || "",
          reportedUserName:
            report.reportedUserName || "",
          reporterId:
            report.reporterId || "",
          reporterName:
            report.reporterName || "",
          reason:
            report.reasonTitle ||
            report.reason ||
            "Other",
        },
      });


      setSelectedReport(null);

      showMessage(
        "Report Reviewed",
        "The report has been marked as reviewed."
      );
    } catch (error) {
      console.log(
        "REPORT REVIEW ERROR:",
        error.code,
        error.message
      );

      showMessage(
        "Error",
        "We could not mark this report as reviewed."
      );
    } finally {
      setProcessingId(null);
    }
  };


  /*
   * ---------------------------------------------------------
   * FILTER REPORTS
   * ---------------------------------------------------------
   */

  const filteredReports =
    reports.filter((report) => {
      if (filter === "all") {
        return true;
      }

      return (
        report.status === filter
      );
    });


  /*
   * ---------------------------------------------------------
   * COUNTS
   * ---------------------------------------------------------
   */

  const pendingCount =
    reports.filter(
      (report) =>
        report.status === "pending"
    ).length;

  const reviewedCount =
    reports.filter(
      (report) =>
        report.status === "reviewed"
    ).length;


  /*
   * ---------------------------------------------------------
   * REASON ICON
   * ---------------------------------------------------------
   */

  const getReasonIcon = (reason) => {
    switch (reason) {
      case "harassment":
        return "report-problem";

      case "inappropriate_content":
        return "block";

      case "scam":
        return "warning";

      case "impersonation":
        return "person-search";

      case "unsafe_behavior":
        return "security";

      default:
        return "flag";
    }
  };


  /*
   * ---------------------------------------------------------
   * STATUS DISPLAY
   * ---------------------------------------------------------
   */

  const getStatusColor = (status) => {
    if (status === "reviewed") {
      return "#16A34A";
    }

    return "#F97316";
  };


  /*
   * ---------------------------------------------------------
   * REPORT CARD
   * ---------------------------------------------------------
   */

  const renderReportCard = (report) => {
    const isProcessing =
      processingId === report.id;

    const statusColor =
      getStatusColor(report.status);

    return (
      <TouchableOpacity
        key={report.id}
        style={styles.reportCard}
        activeOpacity={0.85}
        onPress={() =>
          setSelectedReport(report)
        }
        disabled={isProcessing}
      >

        <View style={styles.reportTopRow}>

          <View style={styles.reportIcon}>
            <MaterialIcons
              name={getReasonIcon(
                report.reason
              )}
              size={22}
              color="#2563EB"
            />
          </View>

          <View style={styles.reportMain}>
            <Text
              style={styles.reportUser}
              numberOfLines={1}
            >
              {report.reportedUserName ||
                "Unknown User"}
            </Text>

            <Text
              style={styles.reportReason}
              numberOfLines={1}
            >
              {report.reasonTitle ||
                report.reason ||
                "Other"}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  `${statusColor}15`,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: statusColor,
                },
              ]}
            >
              {report.status ===
              "reviewed"
                ? "Reviewed"
                : "Pending"}
            </Text>
          </View>

        </View>


        <View style={styles.reportInfoRow}>

          <MaterialIcons
            name="person-outline"
            size={16}
            color="#64748B"
          />

          <Text
            style={styles.reportInfoText}
            numberOfLines={1}
          >
            Reported by{" "}
            {report.reporterName ||
              "Unknown User"}
          </Text>

        </View>


        <View style={styles.reportInfoRow}>

          <MaterialIcons
            name="schedule"
            size={16}
            color="#64748B"
          />

          <Text
            style={styles.reportInfoText}
          >
            {formatDate(
              report.createdAt
            )}
          </Text>

        </View>


        {report.details ? (
          <Text
            style={styles.detailsPreview}
            numberOfLines={2}
          >
            {report.details}
          </Text>
        ) : null}


        <View style={styles.viewReportRow}>

          <Text style={styles.viewReportText}>
            View Report
          </Text>

          <MaterialIcons
            name="arrow-forward"
            size={18}
            color="#2563EB"
          />

        </View>

      </TouchableOpacity>
    );
  };


  /*
   * ---------------------------------------------------------
   * REPORT DETAILS
   * ---------------------------------------------------------
   */

  const renderReportDetails = () => {
    if (!selectedReport) {
      return null;
    }

    const report =
      selectedReport;

    const isProcessing =
      processingId === report.id;

    const userStatus =
      report.reportedUserStatus ||
      "active";

    return (
      <View style={styles.detailsOverlay}>

        <SafeAreaView
          style={styles.detailsSafeArea}
        >

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.detailsContent
            }
          >

            {/* HEADER */}

            <View style={styles.detailsHeader}>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() =>
                  setSelectedReport(null)
                }
                disabled={isProcessing}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={22}
                  color="#1E293B"
                />
              </TouchableOpacity>

              <View style={styles.detailsTitleContainer}>

                <Text
                  style={styles.detailsTitle}
                >
                  Report Details
                </Text>

                <Text
                  style={styles.detailsSubtitle}
                >
                  Review this user report
                </Text>

              </View>

            </View>


            {/* REPORT STATUS */}

            <View style={styles.statusCard}>

              <View
                style={[
                  styles.largeStatusIcon,
                  {
                    backgroundColor:
                      report.status ===
                      "reviewed"
                        ? "#F0FDF4"
                        : "#FFF7ED",
                  },
                ]}
              >
                <MaterialIcons
                  name={
                    report.status ===
                    "reviewed"
                      ? "check-circle"
                      : "pending"
                  }
                  size={25}
                  color={
                    report.status ===
                    "reviewed"
                      ? "#16A34A"
                      : "#F97316"
                  }
                />
              </View>

              <View
                style={
                  styles.statusCardText
                }
              >
                <Text
                  style={
                    styles.statusCardTitle
                  }
                >
                  Report Status
                </Text>

                <Text
                  style={[
                    styles.statusCardValue,
                    {
                      color:
                        report.status ===
                        "reviewed"
                          ? "#16A34A"
                          : "#F97316",
                    },
                  ]}
                >
                  {report.status ===
                  "reviewed"
                    ? "Reviewed"
                    : "Pending Review"}
                </Text>
              </View>

            </View>


            {/* REPORTED USER */}

            <View style={styles.sectionCard}>

              <View
                style={styles.sectionHeader}
              >
                <MaterialIcons
                  name="person"
                  size={21}
                  color="#2563EB"
                />

                <Text
                  style={styles.sectionTitle}
                >
                  Reported User
                </Text>
              </View>

              <Text
                style={styles.userName}
              >
                {report.reportedUserName ||
                  "Unknown User"}
              </Text>

              <Text
                style={styles.userId}
                numberOfLines={1}
              >
                User ID:{" "}
                {report.reportedUserId ||
                  "Not available"}
              </Text>

            </View>


            {/* REPORTER */}

            <View style={styles.sectionCard}>

              <View
                style={styles.sectionHeader}
              >
                <MaterialIcons
                  name="person-outline"
                  size={21}
                  color="#22C55E"
                />

                <Text
                  style={styles.sectionTitle}
                >
                  Reported By
                </Text>
              </View>

              <Text
                style={styles.userName}
              >
                {report.reporterName ||
                  "Unknown User"}
              </Text>

              <Text
                style={styles.userId}
                numberOfLines={1}
              >
                User ID:{" "}
                {report.reporterId ||
                  "Not available"}
              </Text>

            </View>


            {/* REASON */}

            <View style={styles.sectionCard}>

              <View
                style={styles.sectionHeader}
              >
                <MaterialIcons
                  name={getReasonIcon(
                    report.reason
                  )}
                  size={21}
                  color="#F97316"
                />

                <Text
                  style={styles.sectionTitle}
                >
                  Reason
                </Text>
              </View>

              <Text
                style={styles.reasonTitle}
              >
                {report.reasonTitle ||
                  report.reason ||
                  "Other"}
              </Text>

            </View>


            {/* DETAILS */}

            <View style={styles.sectionCard}>

              <View
                style={styles.sectionHeader}
              >
                <MaterialIcons
                  name="description"
                  size={21}
                  color="#7C3AED"
                />

                <Text
                  style={styles.sectionTitle}
                >
                  Additional Details
                </Text>
              </View>

              <Text
                style={styles.reportDetailsText}
              >
                {report.details?.trim()
                  ? report.details
                  : "No additional details were provided."}
              </Text>

            </View>


            {/* DATE */}

            <View style={styles.sectionCard}>

              <View
                style={styles.sectionHeader}
              >
                <MaterialIcons
                  name="event"
                  size={21}
                  color="#64748B"
                />

                <Text
                  style={styles.sectionTitle}
                >
                  Submitted
                </Text>
              </View>

              <Text
                style={styles.reportDetailsText}
              >
                {formatDate(
                  report.createdAt
                )}
              </Text>

            </View>


            {/* ACTIONS */}

            <View style={styles.actionsCard}>

              <Text
                style={styles.actionsTitle}
              >
                Admin Actions
              </Text>

              <Text
                style={styles.actionsSubtitle}
              >
                Choose what should happen to
                this user's account.
              </Text>


              {/* SUSPEND */}

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.suspendButton,
                  isProcessing &&
                    styles.disabledButton,
                ]}
                disabled={isProcessing}
                onPress={() =>
                  showConfirmation(
                    "Suspend User",
                    `Are you sure you want to suspend ${report.reportedUserName || "this user"}?`,
                    () =>
                      updateUserStatus(
                        report,
                        "suspended"
                      )
                  )
                }
              >

                {isProcessing ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <MaterialIcons
                    name="block"
                    size={20}
                    color="#FFFFFF"
                  />
                )}

                <Text
                  style={
                    styles.actionButtonText
                  }
                >
                  Suspend User
                </Text>

              </TouchableOpacity>


              {/* ARCHIVE */}

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.archiveButton,
                  isProcessing &&
                    styles.disabledButton,
                ]}
                disabled={isProcessing}
                onPress={() =>
                  showConfirmation(
                    "Archive User",
                    `Are you sure you want to archive ${report.reportedUserName || "this user"}?`,
                    () =>
                      updateUserStatus(
                        report,
                        "archived"
                      )
                  )
                }
              >

                <MaterialIcons
                  name="archive"
                  size={20}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.actionButtonText
                  }
                >
                  Archive User
                </Text>

              </TouchableOpacity>


              {/* KEEP ACTIVE */}

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.activeButton,
                  isProcessing &&
                    styles.disabledButton,
                ]}
                disabled={isProcessing}
                onPress={() =>
                  showConfirmation(
                    "Keep User Active",
                    `Keep ${report.reportedUserName || "this user"} active?`,
                    () =>
                      updateUserStatus(
                        report,
                        "active"
                      )
                  )
                }
              >

                <MaterialIcons
                  name="check-circle"
                  size={20}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.actionButtonText
                  }
                >
                  Keep User Active
                </Text>

              </TouchableOpacity>


              {/* MARK REVIEWED */}

              {report.status !==
                "reviewed" && (
                <TouchableOpacity
                  style={[
                    styles.reviewButton,
                    isProcessing &&
                      styles.disabledReviewButton,
                  ]}
                  disabled={isProcessing}
                  onPress={() =>
                    showConfirmation(
                      "Mark Report Reviewed",
                      "Mark this report as reviewed without changing the user's account status?",
                      () =>
                        markReportReviewed(
                          report
                        )
                    )
                  }
                >

                  <MaterialIcons
                    name="done"
                    size={20}
                    color="#2563EB"
                  />

                  <Text
                    style={
                      styles.reviewButtonText
                    }
                  >
                    Mark Report Reviewed
                  </Text>

                </TouchableOpacity>
              )}

            </View>

            <View
              style={{
                height: 30,
              }}
            />

          </ScrollView>

        </SafeAreaView>

      </View>
    );
  };


  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
      >

        <View style={styles.loadingContainer}>

          <ActivityIndicator
            size="large"
            color="#2563EB"
          />

          <Text
            style={styles.loadingText}
          >
            Loading user reports...
          </Text>

        </View>

      </SafeAreaView>
    );
  }


  /*
   * ---------------------------------------------------------
   * MAIN SCREEN
   * ---------------------------------------------------------
   */

  return (
    <SafeAreaView
      style={styles.container}
    >

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* HEADER */}

        <View style={styles.header}>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              navigation.goBack()
            }
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color="#1E293B"
            />
          </TouchableOpacity>

          <View
            style={styles.headerText}
          >
            <Text
              style={styles.heading}
            >
              User Reports
            </Text>

            <Text
              style={styles.subtitle}
            >
              Review complaints and manage
              reported accounts.
            </Text>
          </View>

        </View>


        {/* SUMMARY */}

        <View style={styles.summaryRow}>

          <View style={styles.summaryCard}>

            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor:
                    "#FFF7ED",
                },
              ]}
            >
              <MaterialIcons
                name="pending-actions"
                size={22}
                color="#F97316"
              />
            </View>

            <Text
              style={styles.summaryNumber}
            >
              {pendingCount}
            </Text>

            <Text
              style={styles.summaryLabel}
            >
              Pending
            </Text>

          </View>


          <View style={styles.summaryCard}>

            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor:
                    "#F0FDF4",
                },
              ]}
            >
              <MaterialIcons
                name="check-circle"
                size={22}
                color="#16A34A"
              />
            </View>

            <Text
              style={styles.summaryNumber}
            >
              {reviewedCount}
            </Text>

            <Text
              style={styles.summaryLabel}
            >
              Reviewed
            </Text>

          </View>


          <View style={styles.summaryCard}>

            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor:
                    "#EFF6FF",
                },
              ]}
            >
              <MaterialIcons
                name="flag"
                size={22}
                color="#2563EB"
              />
            </View>

            <Text
              style={styles.summaryNumber}
            >
              {reports.length}
            </Text>

            <Text
              style={styles.summaryLabel}
            >
              Total
            </Text>

          </View>

        </View>


        {/* FILTERS */}

        <View style={styles.filterCard}>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "pending" &&
                styles.filterButtonActive,
            ]}
            onPress={() =>
              setFilter("pending")
            }
          >
            <Text
              style={[
                styles.filterText,
                filter === "pending" &&
                  styles.filterTextActive,
              ]}
            >
              Pending
            </Text>
          </TouchableOpacity>


          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "reviewed" &&
                styles.filterButtonActive,
            ]}
            onPress={() =>
              setFilter("reviewed")
            }
          >
            <Text
              style={[
                styles.filterText,
                filter === "reviewed" &&
                  styles.filterTextActive,
              ]}
            >
              Reviewed
            </Text>
          </TouchableOpacity>


          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "all" &&
                styles.filterButtonActive,
            ]}
            onPress={() =>
              setFilter("all")
            }
          >
            <Text
              style={[
                styles.filterText,
                filter === "all" &&
                  styles.filterTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

        </View>


        {/* REPORTS */}

        <View style={styles.sectionHeadingRow}>

          <Text
            style={styles.sectionHeading}
          >
            {filter === "pending"
              ? "Pending Reports"
              : filter === "reviewed"
              ? "Reviewed Reports"
              : "All Reports"}
          </Text>

          <Text
            style={styles.sectionCount}
          >
            {filteredReports.length}
          </Text>

        </View>


        {filteredReports.length === 0 ? (

          <View style={styles.emptyCard}>

            <View
              style={styles.emptyIcon}
            >
              <MaterialIcons
                name={
                  filter === "pending"
                    ? "check-circle"
                    : "inbox"
                }
                size={32}
                color="#2563EB"
              />
            </View>

            <Text
              style={styles.emptyTitle}
            >
              {filter === "pending"
                ? "No pending reports"
                : "No reports found"}
            </Text>

            <Text
              style={styles.emptyText}
            >
              {filter === "pending"
                ? "There are currently no user reports waiting for review."
                : "There are no reports in this category yet."}
            </Text>

          </View>

        ) : (

          <View>
            {filteredReports.map(
              renderReportCard
            )}
          </View>

        )}

        <View
          style={{
            height: 30,
          }}
        />

      </ScrollView>


      {/* DETAILS OVERLAY */}

      {selectedReport &&
        renderReportDetails()}

    </SafeAreaView>
  );
};


export default AdminReports;


/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 30,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 13,
  },


  /*
   * HEADER
   */

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  backButton: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  heading: {
    color: "#1E293B",
    fontSize: 25,
    fontWeight: "800",
  },

  subtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },


  /*
   * SUMMARY
   */

  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 17,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 17,
    padding: 13,
    alignItems: "center",
  },

  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  summaryNumber: {
    color: "#1E293B",
    fontSize: 21,
    fontWeight: "800",
  },

  summaryLabel: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 2,
  },


  /*
   * FILTERS
   */

  filterCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    padding: 5,
    marginBottom: 20,
  },

  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: "center",
  },

  filterButtonActive: {
    backgroundColor: "#EFF6FF",
  },

  filterText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },

  filterTextActive: {
    color: "#2563EB",
  },


  /*
   * SECTION
   */

  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },

  sectionHeading: {
    color: "#1E293B",
    fontSize: 17,
    fontWeight: "800",
  },

  sectionCount: {
    minWidth: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#E0F2FE",
    color: "#2563EB",
    textAlign: "center",
    textAlignVertical: "center",
    paddingTop: 5,
    fontSize: 11,
    fontWeight: "800",
  },


  /*
   * REPORT CARD
   */

  reportCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 15,
    marginBottom: 11,
  },

  reportTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  reportIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  reportMain: {
    flex: 1,
    marginRight: 8,
  },

  reportUser: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "800",
  },

  reportReason: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 3,
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

  reportInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },

  reportInfoText: {
    flex: 1,
    color: "#64748B",
    fontSize: 11,
    marginLeft: 7,
  },

  detailsPreview: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 17,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    marginBottom: 10,
  },

  viewReportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },

  viewReportText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "800",
    marginRight: 5,
  },


  /*
   * EMPTY
   */

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 19,
    padding: 30,
    alignItems: "center",
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 13,
  },

  emptyTitle: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyText: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 280,
  },


  /*
   * DETAILS OVERLAY
   */

  detailsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#F8FAFC",
    zIndex: 100,
  },

  detailsSafeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  detailsContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
  },

  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  detailsTitleContainer: {
    flex: 1,
  },

  detailsTitle: {
    color: "#1E293B",
    fontSize: 23,
    fontWeight: "800",
  },

  detailsSubtitle: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 3,
  },


  /*
   * STATUS CARD
   */

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 17,
    padding: 14,
    marginBottom: 12,
  },

  largeStatusIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  statusCardText: {
    flex: 1,
  },

  statusCardTitle: {
    color: "#64748B",
    fontSize: 11,
  },

  statusCardValue: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 3,
  },


  /*
   * SECTION CARD
   */

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 17,
    padding: 15,
    marginBottom: 11,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },

  sectionTitle: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 8,
  },

  userName: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "800",
  },

  userId: {
    color: "#94A3B8",
    fontSize: 9,
    marginTop: 5,
  },

  reasonTitle: {
    color: "#F97316",
    fontSize: 15,
    fontWeight: "800",
  },

  reportDetailsText: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 19,
  },


  /*
   * ACTIONS
   */

  actionsCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 19,
    padding: 17,
    marginTop: 2,
  },

  actionsTitle: {
    color: "#1E293B",
    fontSize: 17,
    fontWeight: "800",
  },

  actionsSubtitle: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 15,
  },

  actionButton: {
    minHeight: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  suspendButton: {
    backgroundColor: "#EF4444",
  },

  archiveButton: {
    backgroundColor: "#64748B",
  },

  activeButton: {
    backgroundColor: "#22C55E",
  },

  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 8,
  },

  disabledButton: {
    opacity: 0.55,
  },

  reviewButton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  disabledReviewButton: {
    opacity: 0.55,
  },

  reviewButtonText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 8,
  },

});