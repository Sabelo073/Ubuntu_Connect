import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { auth, db } from "../firebaseConfig";

function EditProfile({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("User");

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
    const loadUserProfile = async () => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setLoading(false);

        showMessage(
          "Login Required",
          "Please log in to edit your profile."
        );

        navigation.replace("Login");
        return;
      }

      try {
        const userReference = doc(
          db,
          "users",
          currentUser.uid
        );

        const userSnapshot = await getDoc(
          userReference
        );

        if (!userSnapshot.exists()) {
          showMessage(
            "Profile Error",
            "Your profile could not be found."
          );

          navigation.goBack();
          return;
        }

        const userData = userSnapshot.data();

        setFullName(userData.fullName || "");
        setPhone(userData.phone || "");
        setLocation(userData.location || "");
        setBio(userData.bio || "");

        setEmail(
          userData.email ||
            currentUser.email ||
            ""
        );

        setRole(userData.role || "User");
      } catch (error) {
        console.log(
          "LOAD PROFILE ERROR:",
          error.code,
          error.message
        );

        showMessage(
          "Profile Error",
          error.message ||
            "Your profile could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [navigation]);

  const validatePhone = (phoneNumber) => {
    if (!phoneNumber.trim()) {
      return true;
    }

    const phonePattern =
      /^[0-9+\s()-]{7,20}$/;

    return phonePattern.test(
      phoneNumber.trim()
    );
  };

  const saveProfile = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      showMessage(
        "Login Required",
        "Please log in before updating your profile."
      );

      return;
    }

    if (!fullName.trim()) {
      showMessage(
        "Name Required",
        "Please enter your full name."
      );

      return;
    }

    if (fullName.trim().length < 2) {
      showMessage(
        "Invalid Name",
        "Your full name must contain at least 2 characters."
      );

      return;
    }

    if (!validatePhone(phone)) {
      showMessage(
        "Invalid Phone Number",
        "Enter a valid phone number using numbers, spaces, brackets, plus signs, or hyphens."
      );

      return;
    }

    if (bio.trim().length > 250) {
      showMessage(
        "Bio Too Long",
        "Your bio cannot contain more than 250 characters."
      );

      return;
    }

    try {
      setSaving(true);

      await updateDoc(
        doc(db, "users", currentUser.uid),
        {
          fullName: fullName.trim(),
          phone: phone.trim(),
          location: location.trim(),
          bio: bio.trim(),

          role,

          updatedAt: serverTimestamp(),
        }
      );

      showMessage(
        "Profile Updated",
        "Your profile was updated successfully."
      );

      navigation.goBack();
    } catch (error) {
      console.log(
        "UPDATE PROFILE ERROR:",
        error.code,
        error.message
      );

      showMessage(
        "Update Error",
        `${error.code || "Unknown error"}\n\n${
          error.message ||
          "Your profile could not be updated."
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <View style={styles.loadingIcon}>
          <MaterialIcons
            name="person"
            size={32}
            color="#16A34A"
          />
        </View>

        <ActivityIndicator
          size="small"
          color="#16A34A"
        />

        <Text style={styles.loadingText}>
          Loading your profile...
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
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="arrow-back"
              size={23}
              color="#166534"
            />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.heading}>
              Edit Profile
            </Text>

            <Text style={styles.subtitle}>
              Keep your Ubuntu Connect details up to date.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <MaterialIcons
              name="manage-accounts"
              size={23}
              color="#16A34A"
            />
          </View>
        </View>

        {/* PROFILE PREVIEW */}
        <View style={styles.profilePreview}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {fullName.trim()
                  ? fullName
                      .trim()
                      .charAt(0)
                      .toUpperCase()
                  : "U"}
              </Text>
            </View>

            <View style={styles.avatarCheck}>
              <MaterialIcons
                name="check"
                size={12}
                color="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.previewContent}>
            <Text
              style={styles.previewName}
              numberOfLines={1}
            >
              {fullName.trim() ||
                "Ubuntu Connect User"}
            </Text>

            <View style={styles.previewEmailRow}>
              <MaterialIcons
                name="email"
                size={14}
                color="#64748B"
              />

              <Text
                style={styles.previewEmail}
                numberOfLines={1}
              >
                {email || "Email unavailable"}
              </Text>
            </View>

            <View style={styles.roleBadge}>
              <MaterialIcons
                name="verified-user"
                size={13}
                color="#16A34A"
              />

              <Text style={styles.roleText}>
                {role}
              </Text>
            </View>
          </View>
        </View>

        {/* FORM */}
        <View style={styles.formCard}>
          {/* PERSONAL INFORMATION */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <MaterialIcons
                name="person"
                size={19}
                color="#16A34A"
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Personal Information
              </Text>

              <Text style={styles.sectionSubtitle}>
                Update the details visible on your profile.
              </Text>
            </View>
          </View>

          {/* FULL NAME */}
          <Text style={styles.label}>
            Full name
          </Text>

          <View style={styles.inputWrapper}>
            <MaterialIcons
              name="person-outline"
              size={20}
              color="#64748B"
              style={styles.inputIcon}
            />

            <TextInput
              placeholder="Enter your full name"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              maxLength={100}
              editable={!saving}
            />
          </View>

          {/* PHONE */}
          <Text style={styles.label}>
            Phone number
          </Text>

          <View style={styles.inputWrapper}>
            <MaterialIcons
              name="phone"
              size={20}
              color="#64748B"
              style={styles.inputIcon}
            />

            <TextInput
              placeholder="Example: 071 234 5678"
              placeholderTextColor="#94A3B8"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
              maxLength={20}
              editable={!saving}
            />
          </View>

          {/* LOCATION */}
          <Text style={styles.label}>
            Location
          </Text>

          <View style={styles.inputWrapper}>
            <MaterialIcons
              name="location-on"
              size={20}
              color="#64748B"
              style={styles.inputIcon}
            />

            <TextInput
              placeholder="Example: Johannesburg"
              placeholderTextColor="#94A3B8"
              value={location}
              onChangeText={setLocation}
              style={styles.input}
              maxLength={120}
              editable={!saving}
            />
          </View>

          {/* BIO */}
          <View style={styles.labelRow}>
            <Text style={styles.label}>
              Short bio
            </Text>

            <Text style={styles.characterCountTop}>
              {bio.length}/250
            </Text>
          </View>

          <View
            style={[
              styles.inputWrapper,
              styles.bioWrapper,
            ]}
          >
            <MaterialIcons
              name="description"
              size={20}
              color="#64748B"
              style={styles.bioIcon}
            />

            <TextInput
              placeholder="Tell the community a little about yourself..."
              placeholderTextColor="#94A3B8"
              value={bio}
              onChangeText={setBio}
              multiline
              textAlignVertical="top"
              maxLength={250}
              style={[
                styles.input,
                styles.bioInput,
              ]}
              editable={!saving}
            />
          </View>

          {/* PROTECTED INFORMATION */}
          <View
            style={[
              styles.sectionHeader,
              styles.protectedSectionHeader,
            ]}
          >
            <View style={styles.protectedSectionIcon}>
              <MaterialIcons
                name="shield"
                size={19}
                color="#2563EB"
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Protected Account Information
              </Text>

              <Text style={styles.sectionSubtitle}>
                These details are managed securely.
              </Text>
            </View>
          </View>

          {/* EMAIL */}
          <Text style={styles.label}>
            Email address
          </Text>

          <View style={styles.protectedField}>
            <View style={styles.protectedIcon}>
              <MaterialIcons
                name="email"
                size={19}
                color="#64748B"
              />
            </View>

            <Text
              style={styles.protectedValue}
              numberOfLines={1}
            >
              {email || "Email unavailable"}
            </Text>

            <MaterialIcons
              name="lock"
              size={18}
              color="#94A3B8"
            />
          </View>

          <View style={styles.helpRow}>
            <MaterialIcons
              name="info-outline"
              size={14}
              color="#94A3B8"
            />

            <Text style={styles.protectedHelp}>
              The email address cannot be changed from
              this screen.
            </Text>
          </View>

          {/* ROLE */}
          <Text style={styles.label}>
            Account role
          </Text>

          <View style={styles.protectedField}>
            <View style={styles.protectedIcon}>
              <MaterialIcons
                name="admin-panel-settings"
                size={19}
                color="#64748B"
              />
            </View>

            <Text style={styles.protectedValue}>
              {role}
            </Text>

            <MaterialIcons
              name="lock"
              size={18}
              color="#94A3B8"
            />
          </View>

          <View style={styles.helpRow}>
            <MaterialIcons
              name="info-outline"
              size={14}
              color="#94A3B8"
            />

            <Text style={styles.protectedHelp}>
              Your account role is protected and cannot
              be edited.
            </Text>
          </View>

          {/* SAVE */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              saving && styles.disabledButton,
            ]}
            onPress={saveProfile}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text style={styles.saveButtonText}>
                  Saving Changes...
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
                  Save Changes
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* CANCEL */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="close"
              size={19}
              color="#16A34A"
            />

            <Text style={styles.cancelButtonText}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>

        {/* INFORMATION CARD */}
        <View style={styles.informationCard}>
          <View style={styles.informationIcon}>
            <MaterialIcons
              name="volunteer-activism"
              size={24}
              color="#16A34A"
            />
          </View>

          <View style={styles.informationContent}>
            <Text style={styles.informationTitle}>
              Community profile
            </Text>

            <Text style={styles.informationText}>
              Keep your contact details current so
              community members and organisations can
              coordinate support more easily.
            </Text>
          </View>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default EditProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    paddingHorizontal: 20,
  },

  /* LOADING */

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  loadingText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 20,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  headerTextContainer: {
    flex: 1,
  },

  heading: {
    color: "#14532D",
    fontSize: 27,
    fontWeight: "800",
  },

  subtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  /* PROFILE PREVIEW */

  profilePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 22,
    padding: 17,
    marginBottom: 17,
  },

  avatarContainer: {
    position: "relative",
    marginRight: 15,
  },

  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#16A34A",
    borderWidth: 4,
    borderColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },

  avatarCheck: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: "#16A34A",
    borderWidth: 2,
    borderColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
  },

  previewContent: {
    flex: 1,
    minWidth: 0,
  },

  previewName: {
    color: "#14532D",
    fontSize: 18,
    fontWeight: "800",
  },

  previewEmailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  previewEmail: {
    flex: 1,
    color: "#64748B",
    fontSize: 12,
    marginLeft: 5,
  },

  roleBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 8,
  },

  roleText: {
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 4,
  },

  /* FORM */

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 19,
    marginTop: 2,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  sectionTitle: {
    color: "#166534",
    fontSize: 16,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 3,
  },

  protectedSectionHeader: {
    marginTop: 15,
  },

  protectedSectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  /* LABELS */

  label: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  characterCountTop: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 8,
  },

  /* INPUTS */

  inputWrapper: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 15,
    marginBottom: 17,
  },

  inputIcon: {
    marginLeft: 15,
  },

  input: {
    flex: 1,
    minHeight: 53,
    color: "#1E293B",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },

  bioWrapper: {
    alignItems: "flex-start",
    minHeight: 120,
    marginBottom: 24,
  },

  bioIcon: {
    marginLeft: 15,
    marginTop: 16,
  },

  bioInput: {
    height: 118,
  },

  /* PROTECTED FIELDS */

  protectedField: {
    minHeight: 55,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  protectedIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  protectedValue: {
    flex: 1,
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },

  helpRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
    marginBottom: 17,
  },

  protectedHelp: {
    flex: 1,
    color: "#94A3B8",
    fontSize: 10,
    lineHeight: 15,
    marginLeft: 5,
  },

  /* BUTTONS */

  saveButton: {
    minHeight: 56,
    backgroundColor: "#16A34A",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#16A34A",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 3,
  },

  disabledButton: {
    opacity: 0.6,
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
    marginLeft: 8,
  },

  cancelButton: {
    minHeight: 52,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    marginTop: 11,
  },

  cancelButtonText: {
    color: "#16A34A",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 5,
  },

  /* INFORMATION CARD */

  informationCard: {
    flexDirection: "row",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
  },

  informationIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  informationContent: {
    flex: 1,
  },

  informationTitle: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "800",
  },

  informationText: {
    color: "#15803D",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
});