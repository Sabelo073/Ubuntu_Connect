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

          /*
            Role is included unchanged because the
            current Firestore rule protects this field.
          */
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
        <ActivityIndicator
          size="large"
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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.backButtonText}>
              ‹
            </Text>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.heading}>
              Edit Profile
            </Text>

            <Text style={styles.subtitle}>
              Update your Ubuntu Connect details.
            </Text>
          </View>
        </View>

        <View style={styles.profilePreview}>
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

          <View style={styles.previewContent}>
            <Text
              style={styles.previewName}
              numberOfLines={1}
            >
              {fullName.trim() ||
                "Ubuntu Connect User"}
            </Text>

            <Text
              style={styles.previewEmail}
              numberOfLines={1}
            >
              {email || "Email unavailable"}
            </Text>

            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {role}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>
            Personal Information
          </Text>

          <Text style={styles.label}>
            Full name
          </Text>

          <TextInput
            placeholder="Enter your full name"
            placeholderTextColor="#94A3B8"
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
            maxLength={100}
            editable={!saving}
          />

          <Text style={styles.label}>
            Phone number
          </Text>

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

          <Text style={styles.label}>
            Location
          </Text>

          <TextInput
            placeholder="Example: Johannesburg"
            placeholderTextColor="#94A3B8"
            value={location}
            onChangeText={setLocation}
            style={styles.input}
            maxLength={120}
            editable={!saving}
          />

          <Text style={styles.label}>
            Short bio
          </Text>

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

          <Text style={styles.characterCount}>
            {bio.length}/250
          </Text>

          <Text style={styles.sectionTitle}>
            Protected Account Information
          </Text>

          <Text style={styles.label}>
            Email address
          </Text>

          <View style={styles.protectedField}>
            <Text
              style={styles.protectedValue}
              numberOfLines={1}
            >
              {email || "Email unavailable"}
            </Text>

            <Text style={styles.lockIcon}>
              🔒
            </Text>
          </View>

          <Text style={styles.protectedHelp}>
            The email address cannot be changed from
            this screen.
          </Text>

          <Text style={styles.label}>
            Account role
          </Text>

          <View style={styles.protectedField}>
            <Text style={styles.protectedValue}>
              {role}
            </Text>

            <Text style={styles.lockIcon}>
              🔒
            </Text>
          </View>

          <Text style={styles.protectedHelp}>
            Your account role is protected and cannot
            be edited.
          </Text>

          <TouchableOpacity
            style={[
              styles.saveButton,
              saving && styles.disabledButton,
            ]}
            onPress={saveProfile}
            disabled={saving}
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
              <Text style={styles.saveButtonText}>
                Save Changes
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
          <Text style={styles.informationIcon}>
            🌱
          </Text>

          <View style={styles.informationContent}>
            <Text style={styles.informationTitle}>
              Community profile
            </Text>

            <Text style={styles.informationText}>
              Keep your contact details current so
              other community members and
              organisations can coordinate support.
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 22,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  backButtonText: {
    color: "#166534",
    fontSize: 32,
    lineHeight: 34,
  },

  headerTextContainer: {
    flex: 1,
  },

  heading: {
    color: "#14532D",
    fontSize: 28,
    fontWeight: "800",
  },

  subtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 3,
  },

  profilePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 20,
    padding: 17,
    marginBottom: 17,
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#16A34A",
    borderWidth: 4,
    borderColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
  },

  previewContent: {
    flex: 1,
  },

  previewName: {
    color: "#14532D",
    fontSize: 18,
    fontWeight: "800",
  },

  previewEmail: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },

  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DCFCE7",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },

  roleText: {
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "800",
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },

  sectionTitle: {
    color: "#166534",
    fontSize: 17,
    fontWeight: "800",
    borderLeftWidth: 4,
    borderLeftColor: "#22C55E",
    paddingLeft: 9,
    marginBottom: 17,
    marginTop: 5,
  },

  label: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },

  input: {
    minHeight: 55,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: "#1E293B",
    fontSize: 15,
    marginBottom: 18,
  },

  bioInput: {
    height: 120,
  },

  characterCount: {
    color: "#94A3B8",
    fontSize: 11,
    textAlign: "right",
    marginTop: -13,
    marginBottom: 23,
  },

  protectedField: {
    minHeight: 55,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  protectedValue: {
    flex: 1,
    color: "#64748B",
    fontSize: 15,
    fontWeight: "600",
  },

  lockIcon: {
    fontSize: 15,
    marginLeft: 10,
  },

  protectedHelp: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 6,
    marginBottom: 18,
  },

  saveButton: {
    minHeight: 56,
    backgroundColor: "#16A34A",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
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
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },

  cancelButtonText: {
    color: "#16A34A",
    fontSize: 15,
    fontWeight: "700",
  },

  informationCard: {
    flexDirection: "row",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 17,
    padding: 16,
    marginTop: 16,
  },

  informationIcon: {
    fontSize: 23,
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
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});