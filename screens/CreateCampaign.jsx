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

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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

  /*
    Displays a message on Web, Android, and iOS.
  */
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

  /*
    Checks whether the logged-in user is an admin.
  */
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
        <View style={styles.loadingIconContainer}>
          <MaterialIcons
            name="campaign"
            size={32}
            color="#2563EB"
          />
        </View>

        <ActivityIndicator
          size="small"
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

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={creating}
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color="#1E293B"
            />
          </TouchableOpacity>

          <View style={styles.headerIcon}>
            <MaterialIcons
              name="campaign"
              size={25}
              color="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.headingContainer}>
          <Text style={styles.heading}>
            Create Campaign
          </Text>

          <Text style={styles.subtitle}>
            Create a community campaign that Ubuntu
            Connect users can support.
          </Text>
        </View>

        {/* BASIC INFORMATION */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <MaterialIcons
              name="edit-note"
              size={20}
              color="#2563EB"
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>
              Campaign Information
            </Text>

            <Text style={styles.sectionSubtitle}>
              Tell the community what this campaign is about.
            </Text>
          </View>
        </View>

        {/* CAMPAIGN TITLE */}
        <Text style={styles.label}>
          Campaign title
        </Text>

        <View style={styles.inputContainer}>
          <MaterialIcons
            name="campaign"
            size={20}
            color="#94A3B8"
            style={styles.inputIcon}
          />

          <TextInput
            placeholder="Example: Winter Warmth Drive"
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            maxLength={100}
          />
        </View>

        {/* ORGANIZATION */}
        <Text style={styles.label}>
          Organization
        </Text>

        <View style={styles.inputContainer}>
          <MaterialIcons
            name="business"
            size={20}
            color="#94A3B8"
            style={styles.inputIcon}
          />

          <TextInput
            placeholder="Example: Ubuntu Shelter"
            placeholderTextColor="#94A3B8"
            value={organization}
            onChangeText={setOrganization}
            style={styles.input}
            maxLength={100}
          />
        </View>

        {/* DESCRIPTION */}
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            Description
          </Text>

          <Text style={styles.characterCount}>
            {description.length}/500
          </Text>
        </View>

        <View
          style={[
            styles.inputContainer,
            styles.descriptionContainer,
          ]}
        >
          <MaterialIcons
            name="description"
            size={20}
            color="#94A3B8"
            style={styles.descriptionIcon}
          />

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
        </View>

        {/* LOCATION */}
        <Text style={styles.label}>
          Location
        </Text>

        <View style={styles.inputContainer}>
          <MaterialIcons
            name="location-on"
            size={20}
            color="#94A3B8"
            style={styles.inputIcon}
          />

          <TextInput
            placeholder="Example: Johannesburg"
            placeholderTextColor="#94A3B8"
            value={location}
            onChangeText={setLocation}
            style={styles.input}
            maxLength={150}
          />
        </View>

        {/* CAMPAIGN TYPE */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconGreen}>
            <MaterialIcons
              name="category"
              size={20}
              color="#22C55E"
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>
              Campaign Type
            </Text>

            <Text style={styles.sectionSubtitle}>
              Choose what the campaign is collecting.
            </Text>
          </View>
        </View>

        <View style={styles.typeRow}>

          {/* ITEMS */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.typeButton,
              campaignType === "Items" &&
                styles.selectedTypeButton,
            ]}
            onPress={() =>
              setCampaignType("Items")
            }
          >
            <View
              style={[
                styles.typeIconContainer,
                campaignType === "Items" &&
                  styles.selectedTypeIconContainer,
              ]}
            >
              <MaterialIcons
                name="inventory-2"
                size={25}
                color={
                  campaignType === "Items"
                    ? "#2563EB"
                    : "#64748B"
                }
              />
            </View>

            <Text
              style={[
                styles.typeButtonText,
                campaignType === "Items" &&
                  styles.selectedTypeButtonText,
              ]}
            >
              Items
            </Text>

            <Text style={styles.typeDescription}>
              Clothing, food, blankets, etc.
            </Text>

            {campaignType === "Items" && (
              <View style={styles.selectedIndicator}>
                <MaterialIcons
                  name="check-circle"
                  size={19}
                  color="#2563EB"
                />
              </View>
            )}
          </TouchableOpacity>

          {/* MONEY */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.typeButton,
              styles.typeButtonRight,
              campaignType === "Money" &&
                styles.selectedTypeButton,
            ]}
            onPress={() =>
              setCampaignType("Money")
            }
          >
            <View
              style={[
                styles.typeIconContainer,
                campaignType === "Money" &&
                  styles.selectedTypeIconContainer,
              ]}
            >
              <MaterialIcons
                name="payments"
                size={25}
                color={
                  campaignType === "Money"
                    ? "#2563EB"
                    : "#64748B"
                }
              />
            </View>

            <Text
              style={[
                styles.typeButtonText,
                campaignType === "Money" &&
                  styles.selectedTypeButtonText,
              ]}
            >
              Money
            </Text>

            <Text style={styles.typeDescription}>
              Financial contributions.
            </Text>

            {campaignType === "Money" && (
              <View style={styles.selectedIndicator}>
                <MaterialIcons
                  name="check-circle"
                  size={19}
                  color="#2563EB"
                />
              </View>
            )}
          </TouchableOpacity>

        </View>

        {/* TARGET DETAILS CARD */}
        <View style={styles.targetCard}>

          <View style={styles.targetCardHeader}>
            <View style={styles.targetIcon}>
              <MaterialIcons
                name={
                  campaignType === "Items"
                    ? "inventory-2"
                    : "account-balance-wallet"
                }
                size={21}
                color="#2563EB"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.targetTitle}>
                {campaignType === "Items"
                  ? "Item Target"
                  : "Funding Target"}
              </Text>

              <Text style={styles.targetSubtitle}>
                {campaignType === "Items"
                  ? "Set what you want the community to collect."
                  : "Set the amount you want the campaign to raise."}
              </Text>
            </View>
          </View>

          {campaignType === "Items" ? (
            <>
              <Text style={styles.label}>
                Item name
              </Text>

              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="category"
                  size={20}
                  color="#94A3B8"
                  style={styles.inputIcon}
                />

                <TextInput
                  placeholder="Example: Blankets"
                  placeholderTextColor="#94A3B8"
                  value={itemName}
                  onChangeText={setItemName}
                  style={styles.input}
                  maxLength={80}
                />
              </View>

              <Text style={styles.label}>
                Target number of items
              </Text>

              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="numbers"
                  size={20}
                  color="#94A3B8"
                  style={styles.inputIcon}
                />

                <TextInput
                  placeholder="Example: 500"
                  placeholderTextColor="#94A3B8"
                  value={targetItems}
                  onChangeText={setTargetItems}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.label}>
                Target amount in Rand
              </Text>

              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="payments"
                  size={20}
                  color="#94A3B8"
                  style={styles.inputIcon}
                />

                <TextInput
                  placeholder="Example: 50000"
                  placeholderTextColor="#94A3B8"
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
            </>
          )}

        </View>

        {/* END DATE */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconPurple}>
            <MaterialIcons
              name="event"
              size={20}
              color="#7C3AED"
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>
              Campaign Duration
            </Text>

            <Text style={styles.sectionSubtitle}>
              Decide when the campaign should end.
            </Text>
          </View>
        </View>

        <Text style={styles.label}>
          End date
        </Text>

        <View style={styles.inputContainer}>
          <MaterialIcons
            name="calendar-today"
            size={20}
            color="#94A3B8"
            style={styles.inputIcon}
          />

          <TextInput
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
            value={endDate}
            onChangeText={setEndDate}
            style={styles.input}
            maxLength={10}
          />
        </View>

        <View style={styles.dateHelpContainer}>
          <MaterialIcons
            name="info-outline"
            size={16}
            color="#64748B"
          />

          <Text style={styles.dateHelp}>
            Example: 2026-12-31
          </Text>
        </View>

        {/* URGENT */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.urgentSelector,
            urgent && styles.urgentSelectorActive,
          ]}
          onPress={() => setUrgent(!urgent)}
        >
          <View
            style={[
              styles.urgentIconContainer,
              urgent &&
                styles.urgentIconContainerActive,
            ]}
          >
            <MaterialIcons
              name="priority-high"
              size={22}
              color={
                urgent ? "#EF4444" : "#64748B"
              }
            />
          </View>

          <View style={styles.urgentTextContainer}>
            <View style={styles.urgentTitleRow}>
              <Text style={styles.urgentTitle}>
                Mark as urgent
              </Text>

              {urgent && (
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentBadgeText}>
                    URGENT
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.urgentDescription}>
              Urgent campaigns display a special alert
              badge to attract attention.
            </Text>
          </View>

          <View
            style={[
              styles.checkbox,
              urgent && styles.checkboxSelected,
            ]}
          >
            {urgent && (
              <MaterialIcons
                name="check"
                size={17}
                color="#FFFFFF"
              />
            )}
          </View>
        </TouchableOpacity>

        {/* CREATE BUTTON */}
        <TouchableOpacity
          activeOpacity={0.85}
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
            <View style={styles.buttonContent}>
              <MaterialIcons
                name="add-circle-outline"
                size={22}
                color="#FFFFFF"
              />

              <Text style={styles.createButtonText}>
                Create Campaign
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* CANCEL */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={creating}
        >
          <MaterialIcons
            name="close"
            size={19}
            color="#64748B"
          />

          <Text style={styles.cancelButtonText}>
            Cancel
          </Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />

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
    paddingTop: 8,
  },

  /* =========================
     LOADING
  ========================= */

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  loadingText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 12,
  },

  /* =========================
     HEADER
  ========================= */

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 18,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },

  headingContainer: {
    marginBottom: 28,
  },

  heading: {
    color: "#1E293B",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  subtitle: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 350,
  },

  /* =========================
     SECTION HEADERS
  ========================= */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
    marginTop: 4,
  },

  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  sectionIconGreen: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  sectionIconPurple: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F5F3FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  sectionTitle: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
    maxWidth: 290,
  },

  /* =========================
     LABELS
  ========================= */

  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  characterCount: {
    color: "#94A3B8",
    fontSize: 11,
    marginBottom: 8,
  },

  /* =========================
     INPUTS
  ========================= */

  inputContainer: {
    minHeight: 55,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    marginBottom: 19,

    shadowColor: "#000000",
    shadowOpacity: 0.025,
    shadowRadius: 4,
    elevation: 1,
  },

  inputIcon: {
    marginRight: 11,
  },

  input: {
    flex: 1,
    minHeight: 53,
    color: "#1E293B",
    fontSize: 15,
    paddingVertical: 12,
  },

  descriptionContainer: {
    minHeight: 130,
    alignItems: "flex-start",
    paddingTop: 14,
  },

  descriptionIcon: {
    marginRight: 11,
    marginTop: 2,
  },

  descriptionInput: {
    height: 110,
    textAlignVertical: "top",
  },

  /* =========================
     CAMPAIGN TYPE
  ========================= */

  typeRow: {
    flexDirection: "row",
    marginBottom: 23,
  },

  typeButton: {
    flex: 1,
    minHeight: 145,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 16,
    marginRight: 7,

    shadowColor: "#000000",
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 2,
  },

  typeButtonRight: {
    marginRight: 0,
    marginLeft: 7,
  },

  selectedTypeButton: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
    borderWidth: 2,
  },

  typeIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  selectedTypeIconContainer: {
    backgroundColor: "#DBEAFE",
  },

  typeButtonText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "800",
  },

  selectedTypeButtonText: {
    color: "#2563EB",
  },

  typeDescription: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    paddingRight: 5,
  },

  selectedIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
  },

  /* =========================
     TARGET CARD
  ========================= */

  targetCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    padding: 18,
    marginBottom: 28,

    borderWidth: 1,
    borderColor: "#E2E8F0",

    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 2,
  },

  targetCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  targetIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  targetTitle: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "800",
  },

  targetSubtitle: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },

  /* =========================
     DATE
  ========================= */

  dateHelpContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -10,
    marginBottom: 25,
    paddingLeft: 3,
  },

  dateHelp: {
    color: "#64748B",
    fontSize: 12,
    marginLeft: 5,
  },

  /* =========================
     URGENT
  ========================= */

  urgentSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 15,
    marginBottom: 25,

    shadowColor: "#000000",
    shadowOpacity: 0.025,
    shadowRadius: 5,
    elevation: 1,
  },

  urgentSelectorActive: {
    backgroundColor: "#FFF7F7",
    borderColor: "#EF4444",
  },

  urgentIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  urgentIconContainerActive: {
    backgroundColor: "#FEE2E2",
  },

  urgentTextContainer: {
    flex: 1,
    paddingRight: 8,
  },

  urgentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  urgentTitle: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "800",
  },

  urgentBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 7,
  },

  urgentBadgeText: {
    color: "#DC2626",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  urgentDescription: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },

  checkboxSelected: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },

  /* =========================
     BUTTONS
  ========================= */

  createButton: {
    minHeight: 58,
    backgroundColor: "#2563EB",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#2563EB",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
  },

  cancelButtonText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 5,
  },
});