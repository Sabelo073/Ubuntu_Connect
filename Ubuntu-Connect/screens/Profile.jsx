import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";


import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";
import { useSession } from "../context/SessionContext";
import { Ionicons } from "@expo/vector-icons";

const Profile = ({ navigation }) => {
  const { endSession } = useSession();
  const [userData, setUserData] = useState(null);
  const [donationCount, setDonationCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      return;
    }

  const unsubscribeUser = onSnapshot(
  doc(db, "users", user.uid),
  (userSnapshot) => {
    if (userSnapshot.exists()) {
      setUserData(userSnapshot.data());
    }
  },
  (error) => {
    console.log(
      "PROFILE LISTENER ERROR:",
      error.code,
      error.message
    );

    Alert.alert(
      "Profile Error",
      error.message
    );
  }
);

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
  unsubscribeUser();
  unsubscribeDonations();
  unsubscribeRequests();
};
  }, []);

 const handleLogout = async () => {
  const logout = async () => {
    try {
      setLoading(true);

      await endSession({
        status: "LoggedOut",
        reason: "User logged out manually from Profile.",
      });
    } catch (error) {
      console.log(
        "PROFILE LOGOUT ERROR:",
        error.code,
        error.message
      );

      Alert.alert(
        "Logout Error",
        error.message ||
          "You could not be logged out."
      );
    } finally {
      setLoading(false);
    }
  };

  if (
    Platform.OS === "web" &&
    typeof window !== "undefined"
  ) {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (confirmed) {
      await logout();
    }

    return;
  }

  Alert.alert(
    "Logout",
    "Are you sure you want to log out?",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        onPress: logout,
      },
    ]
  );
};
  

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View />

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
          <View style={styles.impactMessage}>
 <Ionicons
  name="leaf"
  size={20}
  color="#16A34A"
  style={{ marginRight: 10 }}
/>

  <Text style={styles.impactMessageText}>
    Every contribution helps strengthen the community.
  </Text>
</View>
        </View>

        <Text style={styles.sectionTitle}>Your Impact</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
           <Ionicons
  name="gift"
  size={30}
  color="#7C3AED"
/>
            <Text style={styles.statNumber}>{donationCount}</Text>
            <Text style={styles.statLabel}>Donations</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
  name="help-circle"
  size={30}
  color="#2563EB"
/>

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
  onPress={() =>
    navigation.navigate("MyActivity")
  }
>
  <Ionicons
  name="document-text"
  size={24}
  color="#7C3AED"
  style={{ marginRight: 14 }}
/>
<TouchableOpacity
  style={styles.actionRow}
  onPress={() =>
    navigation.navigate("EditProfile")
  }
>
 <Ionicons
  name="create"
  size={24}
  color="#22C55E"
  style={{ marginRight: 14 }}
/>

  <Text style={styles.actionText}>
    Edit Profile
  </Text>

  <Text style={styles.actionArrow}>
    ›
  </Text>
</TouchableOpacity>

<View style={styles.divider} />
  <Text style={styles.actionText}>
    My Activity
  </Text>

  <Text style={styles.actionArrow}>
    ›
  </Text>
</TouchableOpacity>

<View style={styles.divider} />
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate("Donate")}
          >
          <Ionicons
  name="gift"
  size={24}
  color="#7C3AED"
  style={{ marginRight: 14 }}
/>

            <Text style={styles.actionText}>Donate an Item</Text>

            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate("RequestHelp")}
          >
            <Ionicons
  name="help-circle"
  size={24}
  color="#2563EB"
  style={{ marginRight: 14 }}
/>
            <Text style={styles.actionText}>Request Help</Text>

            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate("Campaigns")}
          >
           <Ionicons
  name="megaphone"
  size={24}
  color="#F59E0B"
  style={{ marginRight: 14 }}
/>
            <Text style={styles.actionText}>Campaigns</Text>

            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>
<Text style={styles.dangerSectionTitle}>
  Danger Zone
</Text>

<View style={styles.dangerCard}>
  <View style={styles.dangerInformation}>
    <Ionicons
  name="warning"
  size={24}
  color="#DC2626"
  style={{ marginRight: 12 }}
/>

    <View style={styles.dangerTextContainer}>
      <Text style={styles.dangerTitle}>
        Delete Account
      </Text>

      <Text style={styles.dangerDescription}>
        Permanently remove your Ubuntu Connect
        account and profile.
      </Text>
    </View>
  </View>

  <TouchableOpacity
    style={styles.deleteAccountButton}
    onPress={() =>
      navigation.navigate("DeleteAccount")
    }
  >
    <Text style={styles.deleteAccountText}>
      Delete My Account
    </Text>
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
          <View
  style={{
    flexDirection: "row",
    alignItems: "center",
  }}
>
  <Ionicons
    name="log-out"
    size={18}
    color="#FFFFFF"
  />
  <Text
    style={[
      styles.logoutText,
      { marginLeft: 8 }
    ]}
  >
    {loading ? "Logging out..." : "Logout"}
  </Text>
</View>
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
    backgroundColor:"#fffefeba",
    paddingHorizontal: 20,
  },

heading: {
  fontSize: 30,
  fontWeight: "800",
  color: "#212023e5",
  marginTop: 20,
  marginBottom: 20,
},

profileCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 24,
  padding: 24,
  alignItems: "center",
  marginBottom: 25,

  borderWidth: 1,
  borderColor: "#DDD6FE",

  shadowColor: "#7C3AED",
  shadowOpacity: 0.08,
  shadowRadius: 10,
  elevation: 3,
},

avatar: {
  width: 95,
  height: 95,
  borderRadius: 50,

  backgroundColor: "#0b9c21",

  justifyContent: "center",
  alignItems: "center",

  marginBottom: 15,

  borderWidth: 5,
  borderColor: "#EDE9FE",

  shadowColor: "#7C3AED",
  shadowOpacity: 0.2,
  shadowRadius: 12,
  elevation: 4,
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
  backgroundColor: "#EDE9FE",
  paddingHorizontal: 16,
  paddingVertical: 7,
  borderRadius: 20,
},

roleText: {
  color: "#7C3AED",
  fontWeight: "700",
},
  roleText: {
    color: "#16A34A",
    fontWeight: "700",
  },

sectionTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: "#2563EB",
  marginBottom: 15,

  borderLeftWidth: 4,
  borderLeftColor: "#7C3AED",

  paddingLeft: 10,
},


  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },

statCard: {
  width: "48%",
  backgroundColor: "#FAF5FF",

  borderRadius: 20,
  paddingVertical: 24,
  alignItems: "center",

  borderWidth: 1,
  borderColor: "#DDD6FE",

  shadowColor: "#7C3AED",
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 3,},

  statIcon: {
    fontSize: 30,
    marginBottom: 8,
  },

statNumber: {
  fontSize: 26,
  fontWeight: "800",
  color: "#16A34A",
},

statLabel: {
  color: "#166534",
  marginTop: 5,
  fontWeight: "600",
},

infoCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 20,
  padding: 18,
  marginBottom: 25,
  borderWidth: 1,
  borderColor: "#DCFCE7",
  borderTopWidth: 4,
  borderTopColor: "#22C55E",
},

infoLabel: {
  color: "#16A34A",
  fontSize: 13,
  fontWeight: "700",
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
  borderWidth: 1,
  borderColor: "#DCFCE7",
},

actionRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 17,
  paddingHorizontal: 4,
},

actionText: {
  flex: 1,
  color: "#166534",
  fontSize: 16,
  fontWeight: "700",
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

impactMessage: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#F0FDF4",
  borderRadius: 14,
  paddingHorizontal: 13,
  paddingVertical: 11,
  marginTop: 18,
  width: "100%",
  borderWidth: 1,
  borderColor: "#BBF7D0",
},



impactMessageText: {
  flex: 1,
  color: "#166534",
  fontSize: 12,
  fontWeight: "600",
  lineHeight: 18,
},

actionArrow: {
  color: "#22C55E",
  fontSize: 27,
  fontWeight: "700",
},
dangerSectionTitle: {
  color: "#B91C1C",
  fontSize: 20,
  fontWeight: "800",
  borderLeftWidth: 4,
  borderLeftColor: "#EF4444",
  paddingLeft: 10,
  marginBottom: 15,
},

dangerCard: {
  backgroundColor: "#FEF2F2",
  borderWidth: 1,
  borderColor: "#FECACA",
  borderRadius: 20,
  padding: 18,
  marginBottom: 20,
},

dangerInformation: {
  flexDirection: "row",
  alignItems: "flex-start",
},

dangerIcon: {
  fontSize: 24,
  marginRight: 12,
},

dangerTextContainer: {
  flex: 1,
},

dangerTitle: {
  color: "#991B1B",
  fontSize: 16,
  fontWeight: "800",
},

dangerDescription: {
  color: "#B91C1C",
  fontSize: 12,
  lineHeight: 18,
  marginTop: 4,
},

deleteAccountButton: {
  minHeight: 48,
  backgroundColor: "#DC2626",
  borderRadius: 13,
  justifyContent: "center",
  alignItems: "center",
  marginTop: 16,
},

deleteAccountText: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "800",
},
});