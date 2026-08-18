import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import { signOut } from "firebase/auth";
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
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

const AdminDashboard = ({ navigation }) => {
  const [adminData, setAdminData] = useState(null);
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      navigation.replace("Login");
      return;
    }

    const checkAdminAccess = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (!userDoc.exists()) {
          Alert.alert("Access Denied", "User profile not found.");
          navigation.replace("Login");
          return;
        }

        const userData = userDoc.data();

        if (userData.role !== "Admin") {
          Alert.alert(
            "Access Denied",
            "Only admins can access this dashboard."
          );
          navigation.replace("MainTabs");
          return;
        }

        setAdminData(userData);
        setLoading(false);
      } catch (error) {
        Alert.alert("Admin Error", error.message);
        navigation.replace("MainTabs");
      }
    };

    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    const donationsQuery = query(
      collection(db, "donations"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribeDonations = onSnapshot(
      donationsQuery,
      (snapshot) => {
        const donationList = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setDonations(donationList);
      },
      (error) => {
        console.log("ADMIN DONATIONS ERROR:", error.message);
      }
    );

    const requestsQuery = query(
      collection(db, "requests"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribeRequests = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const requestList = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setRequests(requestList);
      },
      (error) => {
        console.log("ADMIN REQUESTS ERROR:", error.message);
      }
    );

    const usersQuery = collection(db, "users");

    const unsubscribeUsers = onSnapshot(
      usersQuery,
      (snapshot) => {
        setUsersCount(snapshot.size);
      },
      (error) => {
        console.log("ADMIN USERS ERROR:", error.message);
      }
    );

    return () => {
      unsubscribeDonations();
      unsubscribeRequests();
      unsubscribeUsers();
    };
  }, [loading]);

  const createNotification = async (userId, title, message, type) => {
    try {
      await addDoc(collection(db, "notifications"), {
        userId: userId,
        title: title,
        message: message,
        type: type,
        read: false,
        createdAt: new Date(),
      });
    } catch (error) {
      console.log("NOTIFICATION ERROR:", error.message);
    }
  };

  const updateDonationStatus = async (donation, newStatus) => {
    try {
      await updateDoc(doc(db, "donations", donation.id), {
        status: newStatus,
      });

      await createNotification(
        donation.userId,
        `Donation ${newStatus}`,
        `Your donation "${donation.itemName}" has been ${newStatus.toLowerCase()}.`,
        "donation"
      );

      Alert.alert(
        "Success",
        `Donation ${newStatus.toLowerCase()} successfully.`
      );
    } catch (error) {
      Alert.alert("Update Error", error.message);
    }
  };

  const updateRequestStatus = async (request, newStatus) => {
    try {
      await updateDoc(doc(db, "requests", request.id), {
        status: newStatus,
      });

      await createNotification(
        request.userId,
        `Request ${newStatus}`,
        `Your request for "${request.itemNeeded}" has been ${newStatus.toLowerCase()}.`,
        "request"
      );

      Alert.alert(
        "Success",
        `Request ${newStatus.toLowerCase()} successfully.`
      );
    } catch (error) {
      Alert.alert("Update Error", error.message);
    }
  };

  const deleteDonation = (donation) => {
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
          onPress: async () => {
            try {
              await createNotification(
                donation.userId,
                "Donation Deleted",
                `Your donation "${donation.itemName}" was deleted by an admin.`,
                "donation"
              );

              await deleteDoc(doc(db, "donations", donation.id));

              Alert.alert("Deleted", "Donation deleted successfully.");
            } catch (error) {
              Alert.alert("Delete Error", error.message);
            }
          },
        },
      ]
    );
  };

  const deleteRequest = (request) => {
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
          onPress: async () => {
            try {
              await createNotification(
                request.userId,
                "Request Deleted",
                `Your request for "${request.itemNeeded}" was deleted by an admin.`,
                "request"
              );

              await deleteDoc(doc(db, "requests", request.id));

              Alert.alert("Deleted", "Request deleted successfully.");
            } catch (error) {
              Alert.alert("Delete Error", error.message);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("Login");
    } catch (error) {
      Alert.alert("Logout Error", error.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Checking admin access...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Welcome Admin 👋</Text>
            <Text style={styles.adminName}>
              {adminData?.fullName || "Administrator"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButtonSmall}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonSmallText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statValue}>{usersCount}</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🎁</Text>
            <Text style={styles.statValue}>{donations.length}</Text>
            <Text style={styles.statLabel}>Donations</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🙏</Text>
            <Text style={styles.statValue}>{requests.length}</Text>
            <Text style={styles.statLabel}>Requests</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={styles.statValue}>
              {
                donations.filter((item) => item.status === "Pending").length +
                requests.filter((item) => item.status === "Pending").length
              }
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Manage Donations</Text>

        {donations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No donations found.</Text>
          </View>
        ) : (
          donations.map((donation) => (
            <View key={donation.id} style={styles.manageCard}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTitle}>
                  🎁 {donation.itemName}
                </Text>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {donation.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardSubtitle}>
                {donation.category} • {donation.condition}
              </Text>

              <Text style={styles.cardDescription} numberOfLines={2}>
                {donation.description}
              </Text>

              <Text style={styles.cardMeta}>
                📍 {donation.address}
              </Text>

              <Text style={styles.cardMeta}>
                Method: {donation.deliveryMethod}
              </Text>

              <Text style={styles.adminActionsTitle}>Admin Actions</Text>

              <View style={styles.adminButtonRow}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => updateDonationStatus(donation, "Approved")}
                >
                  <Text style={styles.adminButtonText}>✅ Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => updateDonationStatus(donation, "Rejected")}
                >
                  <Text style={styles.adminButtonText}>❌ Reject</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteDonation(donation)}
              >
                <Text style={styles.deleteText}>Delete Donation</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Manage Help Requests</Text>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No help requests found.</Text>
          </View>
        ) : (
          requests.map((request) => (
            <View key={request.id} style={styles.manageCard}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTitle}>
                  🙏 {request.itemNeeded}
                </Text>

                <View
                  style={[
                    styles.requestBadge,
                    request.urgency === "Urgent" && styles.urgentBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.requestBadgeText,
                      request.urgency === "Urgent" && styles.urgentBadgeText,
                    ]}
                  >
                    {request.urgency}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardSubtitle}>
                {request.category} • Quantity: {request.quantity}
              </Text>

              <Text style={styles.cardDescription} numberOfLines={2}>
                {request.description}
              </Text>

              <Text style={styles.cardMeta}>
                📍 {request.location}
              </Text>

              <Text style={styles.cardMeta}>
                Status: {request.status}
              </Text>

              <Text style={styles.adminActionsTitle}>Admin Actions</Text>

              <View style={styles.adminButtonRow}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => updateRequestStatus(request, "Approved")}
                >
                  <Text style={styles.adminButtonText}>✅ Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => updateRequestStatus(request, "Rejected")}
                >
                  <Text style={styles.adminButtonText}>❌ Reject</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteRequest(request)}
              >
                <Text style={styles.deleteText}>Delete Request</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />

      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminDashboard;

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
    fontSize: 16,
    fontWeight: "600",
  },

  header: {
    marginTop: 20,
    marginBottom: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  welcome: {
    color: "#64748B",
    fontSize: 16,
  },

  adminName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 4,
  },

  logoutButtonSmall: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },

  logoutButtonSmallText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 13,
  },

  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 15,
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2563EB",
  },

  statLabel: {
    color: "#64748B",
    marginTop: 5,
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 15,
  },

  manageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
    marginRight: 10,
  },

  cardSubtitle: {
    color: "#2563EB",
    fontWeight: "600",
    marginBottom: 6,
  },

  cardDescription: {
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 8,
  },

  cardMeta: {
    color: "#475569",
    marginBottom: 4,
    fontSize: 13,
  },

  statusBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  statusText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "700",
  },

  requestBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  requestBadgeText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },

  urgentBadge: {
    backgroundColor: "#FEE2E2",
  },

  urgentBadgeText: {
    color: "#DC2626",
  },

  adminActionsTitle: {
    marginTop: 16,
    marginBottom: 10,
    color: "#1E293B",
    fontWeight: "700",
    fontSize: 15,
  },

  adminButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },

  approveButton: {
    flex: 1,
    backgroundColor: "#22C55E",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#16A34A",
  },

  rejectButton: {
    flex: 1,
    backgroundColor: "#F97316",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#EA580C",
  },

  adminButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  deleteButton: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 14,
  },

  deleteText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },

  emptyText: {
    color: "#64748B",
    fontWeight: "600",
  },
});