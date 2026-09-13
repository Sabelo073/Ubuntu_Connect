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
  Timestamp,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

function CreateCampaign({ navigation }) {
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const [campaignType, setCampaignType] =
    useState("Items");

  const [itemName, setItemName] = useState("");
  const [targetItems, setTargetItems] = useState("");

  const [targetAmount, setTargetAmount] =
    useState("");

  const [endDate, setEndDate] = useState("");
  const [urgent, setUrgent] = useState(false);

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
        showMessage(
          "Login Required",
          "Please log in before creating a campaign."
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

        if (userData.role?.trim() !== "Admin") {
          showMessage(
            "Access Denied",
            "Only administrators can create campaigns."
          );

          navigation.goBack();
          return;
        }

        if (userData.organization) {
          setOrganization(userData.organization);
        }

        setCheckingAdmin(false);
      } catch (error) {
        console.log(
          "CAMPAIGN ADMIN CHECK ERROR:",
          error.code,
          error.message
        );

        showMessage(
          "Access Error",
          error.message ||
            "Administrator access could not be checked."
        );

        navigation.goBack();
      }
    };

    checkAdminAccess();
  }, [navigation]);

  const resetForm = () => {
    setTitle("");
    setOrganization("");
    setDescription("");
    setLocation("");
    setCampaignType("Items");
    setItemName("");
    setTargetItems("");
    setTargetAmount("");
    setEndDate("");
    setUrgent(false);
  };

  const validateDate = () => {
    if (!endDate.trim()) {
      return null;
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!datePattern.test(endDate.trim())) {
      showMessage(
        "Invalid Date",
        "Enter the end date using YYYY-MM-DD. Example: 2026-12-31."
      );

      return false;
    }

    const selectedDate = new Date(
      `${endDate.trim()}T23:59:59`
    );

    if (Number.isNaN(selectedDate.getTime())) {
      showMessage(
        "Invalid Date",
        "Please enter a valid end date."
      );

      return false;
    }

    if (selectedDate <= new Date()) {
      showMessage(
        "Invalid Date",
        "The campaign end date must be in the future."
      );

      return false;
    }

    return Timestamp.fromDate(selectedDate);
  };

  const createCampaign = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      showMessage(
        "Login Required",
        "Please log in before creating a campaign."
      );

      return;
    }

    if (
      !title.trim() ||
      !organization.trim() ||
      !description.trim() ||
      !location.trim()
    ) {
      showMessage(
        "Missing Information",
        "Enter the campaign title, organization, description, and location."
      );

      return;
    }

    if (campaignType === "Items") {
      if (!itemName.trim() || !targetItems.trim()) {
        showMessage(
          "Missing Information",
          "Enter the item name and target number of items."
        );

        return;
      }

      const itemTarget = Number(targetItems);

      if (
        Number.isNaN(itemTarget) ||
        itemTarget <= 0
      ) {
        showMessage(
          "Invalid Target",
          "The target items must be greater than zero."
        );

        return;
      }
    }

    if (campaignType === "Money") {
      if (!targetAmount.trim()) {
        showMessage(
          "Missing Information",
          "Enter the campaign target amount."
        );

        return;
      }

      const amountTarget = Number(targetAmount);

      if (
        Number.isNaN(amountTarget) ||
        amountTarget <= 0
      ) {
        showMessage(
          "Invalid Amount",
          "The target amount must be greater than zero."
        );

        return;
      }
    }

    const campaignEndDate = validateDate();

    if (campaignEndDate === false) {
      return;
    }

    try {
      setCreating(true);

      const campaignData = {
        title: title.trim(),
        organization: organization.trim(),
        description: description.trim(),
        location: location.trim(),

        campaignType,

        itemName:
          campaignType === "Items"
            ? itemName.trim()
            : "",

        targetItems:
          campaignType === "Items"
            ? Number(targetItems)
            : 0,

        collectedItems: 0,

        targetAmount:
          campaignType === "Money"
            ? Number(targetAmount)
            : 0,

        currentAmount: 0,

        urgent,
        status: "Active",

        createdBy: currentUser.uid,
        createdByEmail: currentUser.email || "",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        endDate: campaignEndDate,
      };

      await addDoc(
        collection(db, "campaigns"),
        campaignData
      );

      showMessage(
        "Campaign Created",
        "The campaign was created successfully."
      );

      resetForm();

      navigation.goBack();
    } catch (error) {
      console.log(
        "CREATE CAMPAIGN ERROR:",
        error.code,
        error.message
      );

      showMessage(
        "Campaign Error",
        error.message ||
          "The campaign could not be created."
      );
    } finally {
      setCreating(false);
    }
  };

  if (checkingAdmin) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
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
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.heading}>
          Create Campaign
        </Text>

        <Text style={styles.subtitle}>
          Create a community campaign that Ubuntu
          Connect users can support.
        </Text>

        <Text style={styles.label}>
          Campaign title
        </Text>

        <TextInput
          placeholder="Example: Winter Warmth Drive"
          placeholderTextColor="#94A3B8"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          maxLength={100}
        />

        <Text style={styles.label}>
          Organization
        </Text>

        <TextInput
          placeholder="Example: Ubuntu Shelter"
          placeholderTextColor="#94A3B8"
          value={organization}
          onChangeText={setOrganization}
          style={styles.input}
          maxLength={100}
        />

        <Text style={styles.label}>
          Description
        </Text>

        <TextInput
          placeholder="Explain the campaign and why support is needed..."
          placeholderTextColor="#94A3B8"
          value={description}
          onChangeText={setDescription}
          style={[
            styles.input,
            styles.descriptionInput,
          ]}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />

        <Text style={styles.characterCount}>
          {description.length}/500
        </Text>

        <Text style={styles.label}>
          Location
        </Text>

        <TextInput
          placeholder="Example: Johannesburg"
          placeholderTextColor="#94A3B8"
          value={location}
          onChangeText={setLocation}
          style={styles.input}
          maxLength={150}
        />

        <Text style={styles.label}>
          Campaign type
        </Text>

        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              campaignType === "Items" &&
                styles.selectedTypeButton,
            ]}
            onPress={() =>
              setCampaignType("Items")
            }
          >
            <Text
              style={[
                styles.typeButtonText,
                campaignType === "Items" &&
                  styles.selectedTypeButtonText,
              ]}
            >
              📦 Items
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              campaignType === "Money" &&
                styles.selectedTypeButton,
            ]}
            onPress={() =>
              setCampaignType("Money")
            }
          >
            <Text
              style={[
                styles.typeButtonText,
                campaignType === "Money" &&
                  styles.selectedTypeButtonText,
              ]}
            >
              💰 Money
            </Text>
          </TouchableOpacity>
        </View>

        {campaignType === "Items" ? (
          <>
            <Text style={styles.label}>
              Item name
            </Text>

            <TextInput
              placeholder="Example: Blankets"
              placeholderTextColor="#94A3B8"
              value={itemName}
              onChangeText={setItemName}
              style={styles.input}
              maxLength={80}
            />

            <Text style={styles.label}>
              Target number of items
            </Text>

            <TextInput
              placeholder="Example: 500"
              placeholderTextColor="#94A3B8"
              value={targetItems}
              onChangeText={setTargetItems}
              keyboardType="numeric"
              style={styles.input}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>
              Target amount in Rand
            </Text>

            <TextInput
              placeholder="Example: 50000"
              placeholderTextColor="#94A3B8"
              value={targetAmount}
              onChangeText={setTargetAmount}
              keyboardType="numeric"
              style={styles.input}
            />
          </>
        )}

        <Text style={styles.label}>
          End date
        </Text>

        <TextInput
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94A3B8"
          value={endDate}
          onChangeText={setEndDate}
          style={styles.input}
          maxLength={10}
        />

        <Text style={styles.dateHelp}>
          Example: 2026-12-31
        </Text>

        <TouchableOpacity
          style={[
            styles.urgentSelector,
            urgent && styles.urgentSelectorActive,
          ]}
          onPress={() => setUrgent(!urgent)}
        >
          <View
            style={[
              styles.checkbox,
              urgent && styles.checkboxSelected,
            ]}
          >
            {urgent && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>

          <View style={styles.urgentTextContainer}>
            <Text style={styles.urgentTitle}>
              Mark as urgent
            </Text>

            <Text style={styles.urgentDescription}>
              Urgent campaigns display a special alert
              badge.
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.createButton,
            creating && styles.disabledButton,
          ]}
          onPress={createCampaign}
          disabled={creating}
        >
          {creating ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text style={styles.createButtonText}>
                Creating Campaign...
              </Text>
            </View>
          ) : (
            <Text style={styles.createButtonText}>
              Create Campaign
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={creating}
        >
          <Text style={styles.cancelButtonText}>
            Cancel
          </Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default CreateCampaign;

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

  heading: {
    color: "#1E293B",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 20,
  },

  subtitle: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
    marginBottom: 25,
  },

  label: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },

  input: {
    minHeight: 55,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: "#1E293B",
    fontSize: 15,
    marginBottom: 18,
  },

  descriptionInput: {
    height: 120,
  },

  characterCount: {
    color: "#94A3B8",
    fontSize: 11,
    textAlign: "right",
    marginTop: -13,
    marginBottom: 18,
  },

  typeRow: {
    flexDirection: "row",
    marginBottom: 20,
  },

  typeButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 7,
  },

  selectedTypeButton: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
    borderWidth: 2,
  },

  typeButtonText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },

  selectedTypeButtonText: {
    color: "#2563EB",
    fontWeight: "800",
  },

  dateHelp: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 20,
  },

  urgentSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },

  urgentSelectorActive: {
    backgroundColor: "#FFF7F7",
    borderColor: "#EF4444",
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  checkboxSelected: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },

  checkmark: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  urgentTextContainer: {
    flex: 1,
  },

  urgentTitle: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "700",
  },

  urgentDescription: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },

  createButton: {
    minHeight: 56,
    backgroundColor: "#2563EB",
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
});