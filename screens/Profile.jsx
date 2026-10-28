import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

import AsyncStorage from "@react-native-async-storage/async-storage";

import * as ImagePicker from "expo-image-picker";

import { auth, db } from "../firebaseConfig";
import { useSession } from "../context/SessionContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const Profile = ({ navigation }) => {
  const { endSession } = useSession();

  const [userData, setUserData] = useState(null);
  const [donationCount, setDonationCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");

  /* =====================================================
     LOAD PROFILE + COUNTS
  ===================================================== */

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      return;
    }

    // Load locally saved profile photo
    const loadProfilePhoto = async () => {
      try {
        const savedPhoto = await AsyncStorage.getItem(
          `profilePhoto_${user.uid}`
        );

        if (savedPhoto) {
          setProfilePhoto(savedPhoto);
        }
      } catch (error) {
        console.log(
          "LOAD PROFILE PHOTO ERROR:",
          error.message
        );
      }
    };

    loadProfilePhoto();

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
          error.message || "Could not load profile."
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
        console.log(
          "DONATION COUNT ERROR:",
          error.message
        );
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
        console.log(
          "REQUEST COUNT ERROR:",
          error.message
        );
      }
    );

    return () => {
      unsubscribeUser();
      unsubscribeDonations();
      unsubscribeRequests();
    };
  }, []);

  /* =====================================================
     PROFILE PHOTO - ASYNC STORAGE
  ===================================================== */

  const saveProfilePhoto = async (uri) => {
    try {
      const user = auth.currentUser;

      if (!user) {
        Alert.alert(
          "Not Signed In",
          "Please sign in before changing your profile photo."
        );
        return;
      }

      setUploadingPhoto(true);

      // Save image URI locally on the device
      await AsyncStorage.setItem(
        `profilePhoto_${user.uid}`,
        uri
      );

      // Update screen immediately
      setProfilePhoto(uri);

      Alert.alert(
        "Photo Updated",
        "Your profile photo has been updated successfully."
      );
    } catch (error) {
      console.log(
        "PROFILE PHOTO ERROR:",
        error.message
      );

      Alert.alert(
        "Photo Error",
        "Your profile photo could not be saved."
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow Ubuntu Connect to access your photos."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (
        !result.canceled &&
        result.assets?.length > 0
      ) {
        await saveProfilePhoto(
          result.assets[0].uri
        );
      }
    } catch (error) {
      console.log(
        "GALLERY ERROR:",
        error.message
      );

      Alert.alert(
        "Photo Error",
        "Could not open your photo library."
      );
    }
  };

  const takePhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow Ubuntu Connect to use your camera."
        );
        return;
      }

      const result =
        await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (
        !result.canceled &&
        result.assets?.length > 0
      ) {
        await saveProfilePhoto(
          result.assets[0].uri
        );
      }
    } catch (error) {
      console.log(
        "CAMERA ERROR:",
        error.message
      );

      Alert.alert(
        "Camera Error",
        "Could not open your camera."
      );
    }
  };

  const removeProfilePhoto = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        return;
      }

      setUploadingPhoto(true);

      // Remove locally saved photo
      await AsyncStorage.removeItem(
        `profilePhoto_${user.uid}`
      );

      // Remove photo from screen
      setProfilePhoto("");

      Alert.alert(
        "Photo Removed",
        "Your profile photo has been removed."
      );
    } catch (error) {
      console.log(
        "REMOVE PHOTO ERROR:",
        error.message
      );

      Alert.alert(
        "Remove Failed",
        "Your profile photo could not be removed."
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleProfilePhoto = () => {
    if (uploadingPhoto) {
      return;
    }

    if (profilePhoto) {
      Alert.alert(
        "Profile Photo",
        "What would you like to do?",
        [
          {
            text: "Change Photo",
            onPress: () => {
              Alert.alert(
                "Choose Photo",
                "Select where you want your new profile photo from.",
                [
                  {
                    text: "Camera",
                    onPress: takePhoto,
                  },
                  {
                    text: "Gallery",
                    onPress: pickFromGallery,
                  },
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                ]
              );
            },
          },
          {
            text: "Remove Photo",
            onPress: () => {
              Alert.alert(
                "Remove Photo",
                "Are you sure you want to remove your profile photo?",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Remove",
                    style: "destructive",
                    onPress: removeProfilePhoto,
                  },
                ]
              );
            },
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );

      return;
    }

    Alert.alert(
      "Add Profile Photo",
      "Choose where you want your profile photo from.",
      [
        {
          text: "Camera",
          onPress: takePhoto,
        },
        {
          text: "Gallery",
          onPress: pickFromGallery,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  /* =====================================================
     LOGOUT
  ===================================================== */

  const handleLogout = async () => {
    const logout = async () => {
      try {
        setLoading(true);

        await endSession({
          status: "LoggedOut",
          reason:
            "User logged out manually from Profile.",
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
          style: "destructive",
        },
      ]
    );
  };

  const getInitial = () => {
    if (userData?.fullName) {
      return userData.fullName
        .charAt(0)
        .toUpperCase();
    }

    return "U";
  };

  const displayName =
    userData?.fullName || "Ubuntu Connect User";

  const displayRole =
    userData?.role || "User";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>
              My Profile
            </Text>

            <Text style={styles.headerSubtitle}>
              Manage your Ubuntu Connect account
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <MaterialIcons
              name="person-outline"
              size={25}
              color="#2563EB"
            />
          </View>
        </View>

        {/* PROFILE CARD */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleProfilePhoto}
              disabled={uploadingPhoto}
            >
              <View style={styles.avatar}>
                {profilePhoto ? (
                  <Image
                    source={{
                      uri: profilePhoto,
                    }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {getInitial()}
                  </Text>
                )}

                {uploadingPhoto && (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cameraButton}
              activeOpacity={0.8}
              onPress={handleProfilePhoto}
              disabled={uploadingPhoto}
            >
              <MaterialIcons
                name={
                  uploadingPhoto
                    ? "hourglass-top"
                    : "camera-alt"
                }
                size={15}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <View style={styles.onlineBadge}>
              <MaterialIcons
                name="check"
                size={13}
                color="#FFFFFF"
              />
            </View>
          </View>

          <Text style={styles.photoHint}>
            {uploadingPhoto
              ? "Saving photo..."
              : "Tap your photo to change it"}
          </Text>

          <Text style={styles.name}>
            {displayName}
          </Text>

          <Text style={styles.email}>
            {userData?.email ||
              "No email available"}
          </Text>

          <View style={styles.roleBadge}>
            <MaterialIcons
              name="verified-user"
              size={15}
              color="#2563EB"
            />

            <Text style={styles.roleText}>
              {displayRole}
            </Text>
          </View>

          <View style={styles.impactMessage}>
            <View style={styles.impactIcon}>
              <MaterialIcons
                name="volunteer-activism"
                size={21}
                color="#16A34A"
              />
            </View>

            <Text style={styles.impactMessageText}>
              Every contribution helps strengthen
              the community.
            </Text>
          </View>
        </View>

        {/* IMPACT */}
        <Text style={styles.sectionTitle}>
          Your Impact
        </Text>

        <View style={styles.statsContainer}>
          <View
            style={[
              styles.statCard,
              styles.donationCard,
            ]}
          >
            <View
              style={[
                styles.statIconContainer,
                styles.donationIconBackground,
              ]}
            >
              <MaterialIcons
                name="card-giftcard"
                size={27}
                color="#7C3AED"
              />
            </View>

            <Text style={styles.statNumber}>
              {donationCount}
            </Text>

            <Text style={styles.statLabel}>
              Donations
            </Text>

            <Text style={styles.statDescription}>
              Items contributed
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              styles.requestCard,
            ]}
          >
            <View
              style={[
                styles.statIconContainer,
                styles.requestIconBackground,
              ]}
            >
              <MaterialIcons
                name="volunteer-activism"
                size={27}
                color="#2563EB"
              />
            </View>

            <Text style={styles.statNumber}>
              {requestCount}
            </Text>

            <Text style={styles.statLabel}>
              Requests
            </Text>

            <Text style={styles.statDescription}>
              Help requested
            </Text>
          </View>
        </View>

        {/* ACCOUNT DETAILS */}
        <Text style={styles.sectionTitle}>
          Account Details
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MaterialIcons
                name="person-outline"
                size={21}
                color="#16A34A"
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                Full Name
              </Text>

              <Text style={styles.infoValue}>
                {userData?.fullName ||
                  "Not available"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MaterialIcons
                name="phone"
                size={20}
                color="#16A34A"
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                Phone Number
              </Text>

              <Text style={styles.infoValue}>
                {userData?.phone ||
                  "Not available"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MaterialIcons
                name="email"
                size={20}
                color="#16A34A"
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                Email
              </Text>

              <Text style={styles.infoValue}>
                {userData?.email ||
                  "Not available"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MaterialIcons
                name="badge"
                size={20}
                color="#16A34A"
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                Account Role
              </Text>

              <Text style={styles.infoValue}>
                {userData?.role ||
                  "Not available"}
              </Text>
            </View>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>
          Quick Actions
        </Text>

        <View style={styles.actionCard}>
          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("MyActivity")
            }
          >
            <View
              style={[
                styles.actionIcon,
                styles.purpleActionIcon,
              ]}
            >
              <MaterialIcons
                name="history"
                size={23}
                color="#7C3AED"
              />
            </View>

            <View style={styles.actionContent}>
              <Text style={styles.actionText}>
                My Activity
              </Text>

              <Text style={styles.actionDescription}>
                View your donations and requests
              </Text>
            </View>

            <MaterialIcons
              name="chevron-right"
              size={25}
              color="#94A3B8"
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("EditProfile")
            }
          >
            <View
              style={[
                styles.actionIcon,
                styles.greenActionIcon,
              ]}
            >
              <MaterialIcons
                name="edit"
                size={22}
                color="#16A34A"
              />
            </View>

            <View style={styles.actionContent}>
              <Text style={styles.actionText}>
                Edit Profile
              </Text>

              <Text style={styles.actionDescription}>
                Update your account information
              </Text>
            </View>

            <MaterialIcons
              name="chevron-right"
              size={25}
              color="#94A3B8"
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("Donate")
            }
          >
            <View
              style={[
                styles.actionIcon,
                styles.purpleActionIcon,
              ]}
            >
              <MaterialIcons
                name="card-giftcard"
                size={23}
                color="#7C3AED"
              />
            </View>

            <View style={styles.actionContent}>
              <Text style={styles.actionText}>
                Donate an Item
              </Text>

              <Text style={styles.actionDescription}>
                Give useful items to someone in need
              </Text>
            </View>

            <MaterialIcons
              name="chevron-right"
              size={25}
              color="#94A3B8"
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("RequestHelp")
            }
          >
            <View
              style={[
                styles.actionIcon,
                styles.blueActionIcon,
              ]}
            >
              <MaterialIcons
                name="help-outline"
                size={24}
                color="#2563EB"
              />
            </View>

            <View style={styles.actionContent}>
              <Text style={styles.actionText}>
                Request Help
              </Text>

              <Text style={styles.actionDescription}>
                Ask the community for assistance
              </Text>
            </View>

            <MaterialIcons
              name="chevron-right"
              size={25}
              color="#94A3B8"
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("Campaigns")
            }
          >
            <View
              style={[
                styles.actionIcon,
                styles.orangeActionIcon,
              ]}
            >
              <MaterialIcons
                name="campaign"
                size={23}
                color="#F59E0B"
              />
            </View>

            <View style={styles.actionContent}>
              <Text style={styles.actionText}>
                Campaigns
              </Text>

              <Text style={styles.actionDescription}>
                Discover community campaigns
              </Text>
            </View>

            <MaterialIcons
              name="chevron-right"
              size={25}
              color="#94A3B8"
            />
          </TouchableOpacity>
        </View>

        {/* DANGER ZONE */}
        <Text style={styles.dangerSectionTitle}>
          Danger Zone
        </Text>

        <View style={styles.dangerCard}>
          <View style={styles.dangerInformation}>
            <View style={styles.dangerIconContainer}>
              <MaterialIcons
                name="warning"
                size={23}
                color="#DC2626"
              />
            </View>

            <View style={styles.dangerTextContainer}>
              <Text style={styles.dangerTitle}>
                Delete Account
              </Text>

              <Text style={styles.dangerDescription}>
                Permanently remove your Ubuntu
                Connect account and profile.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.deleteAccountButton}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate("DeleteAccount")
            }
          >
            <MaterialIcons
              name="delete-outline"
              size={19}
              color="#FFFFFF"
            />

            <Text style={styles.deleteAccountText}>
              Delete My Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity
          style={[
            styles.logoutButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleLogout}
          disabled={loading}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="logout"
            size={20}
            color="#FFFFFF"
          />

          <Text style={styles.logoutText}>
            {loading
              ? "Logging out..."
              : "Logout"}
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
  },

  scrollContent: {
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 20,
  },

  heading: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1E293B",
  },

  headerSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 24,
    alignItems: "center",
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#E2E8F0",

    shadowColor: "#1E293B",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 4,
  },

  avatarWrapper: {
    position: "relative",
    marginBottom: 5,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 5,
    borderColor: "#DCFCE7",
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 37,
    fontWeight: "800",
  },

  uploadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
  },

  cameraButton: {
    position: "absolute",
    right: 0,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  onlineBadge: {
    position: "absolute",
    left: -2,
    bottom: 3,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  photoHint: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 7,
  },

  name: {
    fontSize: 23,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
  },

  email: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 5,
    marginBottom: 12,
  },

  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  roleText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 13,
  },

  impactMessage: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 19,
    width: "100%",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },

  impactIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  impactMessageText: {
    flex: 1,
    color: "#166534",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 14,
    paddingLeft: 11,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  statCard: {
    width: "48%",
    borderRadius: 21,
    paddingVertical: 19,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
  },

  donationCard: {
    backgroundColor: "#FAF5FF",
    borderColor: "#E9D5FF",
  },

  requestCard: {
    backgroundColor: "#EFF6FF",
    borderColor: "#DBEAFE",
  },

  statIconContainer: {
    width: 53,
    height: 53,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 9,
  },

  donationIconBackground: {
    backgroundColor: "#EDE9FE",
  },

  requestIconBackground: {
    backgroundColor: "#DBEAFE",
  },

  statNumber: {
    fontSize: 27,
    fontWeight: "800",
    color: "#1E293B",
  },

  statLabel: {
    color: "#334155",
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
  },

  statDescription: {
    color: "#94A3B8",
    marginTop: 3,
    fontSize: 10,
    textAlign: "center",
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 21,
    padding: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#E2E8F0",

    shadowColor: "#1E293B",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 3,
  },

  infoValue: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 13,
  },

  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 21,
    paddingHorizontal: 17,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#E2E8F0",

    shadowColor: "#1E293B",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },

  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  purpleActionIcon: {
    backgroundColor: "#F3E8FF",
  },

  greenActionIcon: {
    backgroundColor: "#DCFCE7",
  },

  blueActionIcon: {
    backgroundColor: "#DBEAFE",
  },

  orangeActionIcon: {
    backgroundColor: "#FEF3C7",
  },

  actionContent: {
    flex: 1,
  },

  actionText: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "750",
  },

  actionDescription: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 3,
  },

  dangerSectionTitle: {
    color: "#B91C1C",
    fontSize: 20,
    fontWeight: "800",
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
    paddingLeft: 10,
    marginBottom: 14,
  },

  dangerCard: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 21,
    padding: 18,
    marginBottom: 20,
  },

  dangerInformation: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  dangerIconContainer: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
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
    flexDirection: "row",
    marginTop: 16,
    gap: 7,
  },

  deleteAccountText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  logoutButton: {
    backgroundColor: "#1E293B",
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,

    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.65,
  },
});