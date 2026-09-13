import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

function CreateCharity({ navigation }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [needs, setNeeds] = useState("");
  const [services, setServices] = useState("");
  const [distance, setDistance] = useState("");
  const [verified, setVerified] = useState(true);

  const [checkingAdmin, setCheckingAdmin] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

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
    const checkAdminAccess = async () => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setCheckingAdmin(false);

        showMessage(
          "Login Required",
          "Please log in before creating a charity."
        );

        navigation.replace("Login");
        return;
      }

      try {
        const userSnapshot = await getDoc(
          doc(db, "users", currentUser.uid)
        );

        if (!userSnapshot.exists()) {
          showMessage(
            "Access Denied",
            "Your user profile could not be found."
          );

          navigation.goBack();
          return;
        }

        const userData = userSnapshot.data();
        const userRole = userData.role?.trim();

        if (userRole !== "Admin") {
          showMessage(
            "Access Denied",
            "Only administrators can create charities."
          );

          navigation.goBack();
          return;
        }
      } catch (error) {
        console.log(
          "CHARITY ADMIN CHECK ERROR:",
          error.code,
          error.message
        );

        showMessage(
          "Access Error",
          error.message ||
            "Administrator access could not be checked."
        );

        navigation.goBack();
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminAccess();
  }, [navigation]);

  const isValidEmail = (emailAddress) => {
    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(emailAddress);
  };

  const convertToList = (value) => {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  };

  const resetForm = () => {
    setName("");
    setType("");
    setDescription("");
    setLocation("");
    setAddress("");
    setPhone("");
    setEmail("");
    setNeeds("");
    setServices("");
    setDistance("");
    setVerified(true);
  };

  const createCharity = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      showMessage(
        "Login Required",
        "Please log in before creating a charity."
      );

      return;
    }

    if (
      !name.trim() ||
      !type.trim() ||
      !description.trim() ||
      !location.trim() ||
      !address.trim()
    ) {
      showMessage(
        "Missing Information",
        "Enter the charity name, type, description, location, and address."
      );

      return;
    }

    if (!phone.trim() && !email.trim()) {
      showMessage(
        "Contact Required",
        "Enter at least a phone number or an email address."
      );

      return;
    }

    if (
      email.trim() &&
      !isValidEmail(email.trim())
    ) {
      showMessage(
        "Invalid Email",
        "Enter a valid email address."
      );

      return;
    }

    const charityNeeds =
      convertToList(needs);

    const charityServices =
      convertToList(services);

    if (charityNeeds.length === 0) {
      showMessage(
        "Needs Required",
        "Enter at least one current need."
      );

      return;
    }

    if (charityServices.length === 0) {
      showMessage(
        "Services Required",
        "Enter at least one service offered by the charity."
      );

      return;
    }

    try {
      setCreating(true);

      await addDoc(
        collection(db, "charities"),
        {
          name: name.trim(),
          type: type.trim(),
          description: description.trim(),
          location: location.trim(),
          address: address.trim(),

          phone: phone.trim(),
          email: email.trim().toLowerCase(),

          needs: charityNeeds,
          services: charityServices,

          distance: distance.trim(),
          verified,

          createdBy: currentUser.uid,
          createdByEmail:
            currentUser.email || "",

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      showMessage(
        "Charity Created",
        `${name.trim()} was created successfully.`
      );

      resetForm();
      navigation.goBack();
    } catch (error) {
      console.log(
        "CREATE CHARITY ERROR:",
        error.code,
        error.message
      );

      showMessage(
        "Charity Error",
        `${error.code || "Unknown error"}\n\n${
          error.message ||
          "The charity could not be created."
        }`
      );
    } finally {
      setCreating(false);
    }
  };

  if (checkingAdmin) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Checking administrator access...
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
            disabled={creating}
          >
            <Text style={styles.backButtonText}>
              ‹
            </Text>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.heading}>
              Create Charity
            </Text>

            <Text style={styles.subtitle}>
              Add a community organisation to
              Ubuntu Connect.
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>
            Organisation Information
          </Text>

          <Text style={styles.label}>
            Organisation name
          </Text>

          <TextInput
            placeholder="Example: Ubuntu Community Shelter"
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
            style={styles.input}
            maxLength={120}
            editable={!creating}
          />

          <Text style={styles.label}>
            Organisation type
          </Text>

          <TextInput
            placeholder="Example: Shelter or Food Bank"
            placeholderTextColor="#94A3B8"
            value={type}
            onChangeText={setType}
            style={styles.input}
            maxLength={80}
            editable={!creating}
          />

          <Text style={styles.label}>
            Description
          </Text>

          <TextInput
            placeholder="Describe the organisation and the work it does..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            style={[
              styles.input,
              styles.descriptionInput,
            ]}
            multiline
            maxLength={600}
            textAlignVertical="top"
            editable={!creating}
          />

          <Text style={styles.characterCount}>
            {description.length}/600
          </Text>

          <Text style={styles.sectionTitle}>
            Location
          </Text>

          <Text style={styles.label}>
            City or area
          </Text>

          <TextInput
            placeholder="Example: Johannesburg"
            placeholderTextColor="#94A3B8"
            value={location}
            onChangeText={setLocation}
            style={styles.input}
            maxLength={100}
            editable={!creating}
          />

          <Text style={styles.label}>
            Full address
          </Text>

          <TextInput
            placeholder="Example: 25 Main Street, Johannesburg"
            placeholderTextColor="#94A3B8"
            value={address}
            onChangeText={setAddress}
            style={styles.input}
            maxLength={200}
            editable={!creating}
          />

          <Text style={styles.label}>
            Distance description
          </Text>

          <TextInput
            placeholder="Example: 2.5 km"
            placeholderTextColor="#94A3B8"
            value={distance}
            onChangeText={setDistance}
            style={styles.input}
            maxLength={40}
            editable={!creating}
          />

          <Text style={styles.optionalText}>
            Distance is optional and can be entered
            as text.
          </Text>

          <Text style={styles.sectionTitle}>
            Contact Information
          </Text>

          <Text style={styles.label}>
            Phone number
          </Text>

          <TextInput
            placeholder="Example: 011 123 4567"
            placeholderTextColor="#94A3B8"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            keyboardType="phone-pad"
            maxLength={25}
            editable={!creating}
          />

          <Text style={styles.label}>
            Email address
          </Text>

          <TextInput
            placeholder="Example: contact@charity.org"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={150}
            editable={!creating}
          />

          <Text style={styles.sectionTitle}>
            Needs and Services
          </Text>

          <Text style={styles.label}>
            Current needs
          </Text>

          <TextInput
            placeholder="Blankets, clothes, food parcels"
            placeholderTextColor="#94A3B8"
            value={needs}
            onChangeText={setNeeds}
            style={[
              styles.input,
              styles.multilineInput,
            ]}
            multiline
            maxLength={400}
            textAlignVertical="top"
            editable={!creating}
          />

          <Text style={styles.helpText}>
            Separate each need with a comma.
          </Text>

          <Text style={styles.label}>
            Services offered
          </Text>

          <TextInput
            placeholder="Shelter, meals, counselling"
            placeholderTextColor="#94A3B8"
            value={services}
            onChangeText={setServices}
            style={[
              styles.input,
              styles.multilineInput,
            ]}
            multiline
            maxLength={400}
            textAlignVertical="top"
            editable={!creating}
          />

          <Text style={styles.helpText}>
            Separate each service with a comma.
          </Text>

          <TouchableOpacity
            style={[
              styles.verificationSelector,
              verified &&
                styles.verificationSelectorActive,
            ]}
            onPress={() =>
              setVerified((current) => !current)
            }
            disabled={creating}
          >
            <View
              style={[
                styles.checkbox,
                verified &&
                  styles.checkboxSelected,
              ]}
            >
              {verified && (
                <Text style={styles.checkmark}>
                  ✓
                </Text>
              )}
            </View>

            <View
              style={
                styles.verificationTextContainer
              }
            >
              <Text
                style={styles.verificationTitle}
              >
                Verified organisation
              </Text>

              <Text
                style={
                  styles.verificationDescription
                }
              >
                Verified charities display a green
                verification badge.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.createButton,
              creating &&
                styles.disabledButton,
            ]}
            onPress={createCharity}
            disabled={creating}
          >
            {creating ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.createButtonText
                  }
                >
                  Creating Charity...
                </Text>
              </View>
            ) : (
              <Text
                style={styles.createButtonText}
              >
                Create Charity
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() =>
              navigation.goBack()
            }
            disabled={creating}
          >
            <Text
              style={styles.cancelButtonText}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.informationCard}>
          <Text style={styles.informationTitle}>
            Before verifying
          </Text>

          <Text style={styles.informationText}>
            Confirm that the organisation exists and
            that its contact information is correct
            before marking it as verified.
          </Text>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default CreateCharity;

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

  backButton: {
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

  backButtonText: {
    color: "#1E293B",
    fontSize: 32,
    lineHeight: 34,
  },

  headerTextContainer: {
    flex: 1,
  },

  heading: {
    color: "#1E293B",
    fontSize: 27,
    fontWeight: "800",
  },

  subtitle: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },

  sectionTitle: {
    color: "#2563EB",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 16,
    marginTop: 7,
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

  descriptionInput: {
    height: 130,
  },

  multilineInput: {
    height: 95,
  },

  characterCount: {
    color: "#94A3B8",
    fontSize: 11,
    textAlign: "right",
    marginTop: -13,
    marginBottom: 20,
  },

  optionalText: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: -12,
    marginBottom: 20,
  },

  helpText: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: -12,
    marginBottom: 20,
  },

  verificationSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    marginBottom: 24,
  },

  verificationSelectorActive: {
    backgroundColor: "#F0FDF4",
    borderColor: "#22C55E",
  },

  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  checkboxSelected: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },

  checkmark: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  verificationTextContainer: {
    flex: 1,
  },

  verificationTitle: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "700",
  },

  verificationDescription: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },

  createButton: {
    minHeight: 56,
    backgroundColor: "#22C55E",
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
    justifyContent: "center",
  },

  createButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 8,
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
    marginTop: 16,
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
});