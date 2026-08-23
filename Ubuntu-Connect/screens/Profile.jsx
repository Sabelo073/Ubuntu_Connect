import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";

import { signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

const Profile = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [donationCount, setDonationCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        Alert.alert("Profile Error", error.message);
      }
    };

    fetchUserProfile();

    const donationsQuery = query(
      collection(db, "donations"),
      where("userId", "==", user.uid)
    );

    const unsubscribeDonations = onSnapshot(
      donationsQuery,
      (snapshot) => {
        setDonationCount(snapshot.size);
      },
      (error) => {
        console.log("DONATION COUNT ERROR:", error.message);
      }
    );

    const requestsQuery = query(
      collection(db, "requests"),
      where("userId", "==", user.uid)
    );

    const unsubscribeRequests = onSnapshot(
      requestsQuery,
      (snapshot) => {
        setRequestCount(snapshot.size);
      },
      (error) => {
        console.log("REQUEST COUNT ERROR:", error.message);
      }
    );

    return () => {
      unsubscribeDonations();
      unsubscribeRequests();
    };
  }, []);

  const handleLogout = async () => {
    try {
      setLoading(true);

      await signOut(auth);

      navigation.replace("Login");
    } catch (error) {
      Alert.alert("Logout Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <Text style={styles.heading}>Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userData?.fullName
                ? userData.fullName.charAt(0).toUpperCase()
                : "U"}
            </Text>
          </View>

          <Text style={styles.name}>
            {userData?.fullName || "Ubuntu Connect User"}
          </Text>

          <Text style={styles.email}>
            {userData?.email || "No email available"}
          </Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {userData?.role || "User"}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your Impact</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🎁</Text>
            <Text style={styles.statNumber}>{donationCount}</Text>
            <Text style={styles.statLabel}>Donations</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🙏</Text>
            <Text style={styles.statNumber}>{requestCount}</Text>
            <Text style={styles.statLabel}>Requests</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Account Details</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Full Name</Text>
          <Text style={styles.infoValue}>
            {userData?.fullName || "Not available"}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.infoLabel}>Phone Number</Text>
          <Text style={styles.infoValue}>
            {userData?.phone || "Not available"}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>
            {userData?.email || "Not available"}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.infoLabel}>Role</Text>
          <Text style={styles.infoValue}>
            {userData?.role || "Not available"}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionCard}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate("Donate")}
          >
            <Text style={styles.actionEmoji}>🎁</Text>
            <Text style={styles.actionText}>Donate an Item</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate("RequestHelp")}
          >
            <Text style={styles.actionEmoji}>🙏</Text>
            <Text style={styles.actionText}>Request Help</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate("Campaigns")}
          >
            <Text style={styles.actionEmoji}>📢</Text>
            <Text style={styles.actionText}>Campaigns</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.logoutButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleLogout}
          disabled={loading}
        >
          <Text style={styles.logoutText}>
            {loading ? "Logging out..." : "Logout"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />

      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
  },

  heading: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 20,
    marginBottom: 20,
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 25,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  avatar: {
    width: 95,
    height: 95,
    borderRadius: 50,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
  },

  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },

  email: {
    color: "#64748B",
    marginTop: 6,
    marginBottom: 12,
  },

  roleBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },

  roleText: {
    color: "#16A34A",
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 15,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  statIcon: {
    fontSize: 30,
    marginBottom: 8,
  },

  statNumber: {
    fontSize: 26,
    fontWeight: "800",
    color: "#2563EB",
  },

  statLabel: {
    color: "#64748B",
    marginTop: 5,
    fontWeight: "600",
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 25,
  },

  infoLabel: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },

  infoValue: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 14,
  },

  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 18,
    marginBottom: 25,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },

  actionEmoji: {
    fontSize: 24,
    marginRight: 14,
  },

  actionText: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "600",
  },

  logoutButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.7,
  },

  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});