import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { addDoc, collection } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

const RequestHelp = ({ navigation }) => {
  const [category, setCategory] = useState("Food");
  const [itemNeeded, setItemNeeded] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("Normal");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

const categories = [
  {
    name: "Food",
    icon: "restaurant",
    color: "#F97316",
    background: "#FFF7ED",
  },
  {
    name: "Clothing",
    icon: "checkroom",
    color: "#EC4899",
    background: "#FDF2F8",
  },
  {
    name: "Blankets",
    icon: "bed",
    color: "#2563EB",
    background: "#EFF6FF",
  },
  {
    name: "Furniture",
    icon: "chair",
    color: "#92400E",
    background: "#FEF3C7",
  },
  {
    name: "Books",
    icon: "menu-book",
    color: "#7C3AED",
    background: "#F5F3FF",
  },
  {
    name: "School Supplies",
    icon: "school",
    color: "#0891B2",
    background: "#ECFEFF",
  },
  {
    name: "Medical Supplies",
    icon: "medical-services",
    color: "#EF4444",
    background: "#FEF2F2",
  },
  {
    name: "Baby Products",
    icon: "child-care",
    color: "#DB2777",
    background: "#FDF2F8",
  },
  {
    name: "Electronics",
    icon: "devices",
    color: "#475569",
    background: "#F1F5F9",
  },
  {
    name: "Other",
    icon: "category",
    color: "#22C55E",
    background: "#F0FDF4",
  },
];

  const handleSubmitRequest = async () => {
    if (!category || !itemNeeded || !quantity || !description || !location) {
      Alert.alert(
        "Missing Information",
        "Please fill in all required fields."
      );
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        "Not Logged In",
        "Please login before submitting a request."
      );
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "requests"), {
        userId: user.uid,
        category: category,
        itemNeeded: itemNeeded.trim(),
        quantity: quantity.trim(),
        description: description.trim(),
        urgency: urgency,
        location: location.trim(),
        status: "Pending",
        createdAt: new Date(),
      });

      Alert.alert(
        "Request Submitted",
        "Your help request has been submitted successfully."
      );

      setCategory("Food");
      setItemNeeded("");
      setQuantity("");
      setDescription("");
      setUrgency("Normal");
      setLocation("");
    } catch (error) {
      Alert.alert("Request Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyIcon = (level) => {
    if (level === "Low") return "keyboard-arrow-down";
    if (level === "Urgent") return "priority-high";
    return "remove";
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <MaterialIcons
              name="arrow-back"
              size={23}
              color="#1E293B"
            />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.heading}>Request Help</Text>
            <Text style={styles.subtitle}>
              Tell the community what you need.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <MaterialIcons
              name="volunteer-activism"
              size={25}
              color="#7C3AED"
            />
          </View>
        </View>

        {/* Community Support Card */}
        <View style={styles.helpCard}>
          <View style={styles.helpIcon}>
            <MaterialIcons
              name="groups"
              size={25}
              color="#2563EB"
            />
          </View>

          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>Community Support</Text>

            <Text style={styles.helpText}>
              Your request will be shared with donors, charities and
              community members who may be able to help.
            </Text>
          </View>
        </View>

        {/* Request Details */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <MaterialIcons
              name="description"
              size={19}
              color="#2563EB"
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>Request Details</Text>
            <Text style={styles.sectionSubtitle}>
              Tell us what you need
            </Text>
          </View>
        </View>

        {/* Category */}
        <Text style={styles.label}>Category</Text>

        <View style={styles.categoryContainer}>
  {categories.map((item) => {
    const selected = category === item.name;

    return (
      <TouchableOpacity
        key={item.name}
        style={[
          styles.categoryButton,
          selected && styles.activeCategory,
        ]}
        onPress={() => setCategory(item.name)}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.categoryIcon,
            {
              backgroundColor: selected
                ? "rgba(255,255,255,0.18)"
                : item.background,
            },
          ]}
        >
          <MaterialIcons
            name={item.icon}
            size={18}
            color={selected ? "#FFFFFF" : item.color}
          />
        </View>

        <Text
          style={[
            styles.categoryText,
            selected && styles.activeCategoryText,
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>

        {/* Item Needed */}
        <Text style={styles.label}>Item Needed</Text>

        <View style={styles.inputWrapper}>
          <MaterialIcons
            name="inventory-2"
            size={21}
            color="#64748B"
            style={styles.inputIcon}
          />

          <TextInput
            placeholder="e.g. School Uniforms"
            placeholderTextColor="#94A3B8"
            value={itemNeeded}
            onChangeText={setItemNeeded}
            style={styles.input}
          />
        </View>

        {/* Quantity */}
        <Text style={styles.label}>Quantity Needed</Text>

        <View style={styles.inputWrapper}>
          <MaterialIcons
            name="format-list-numbered"
            size={21}
            color="#64748B"
            style={styles.inputIcon}
          />

          <TextInput
            placeholder="e.g. 5"
            keyboardType="numeric"
            placeholderTextColor="#94A3B8"
            value={quantity}
            onChangeText={setQuantity}
            style={styles.input}
          />
        </View>

        {/* Description */}
        <Text style={styles.label}>Description</Text>

        <View style={[styles.inputWrapper, styles.descriptionWrapper]}>
          <MaterialIcons
            name="notes"
            size={21}
            color="#64748B"
            style={styles.descriptionIcon}
          />

          <TextInput
            multiline
            numberOfLines={5}
            placeholder="Describe your situation and needs..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textArea]}
          />
        </View>

        {/* Urgency */}
        <View style={styles.urgencyHeader}>
          <View>
            <Text style={styles.label}>Urgency Level</Text>
            <Text style={styles.helperText}>
              How quickly do you need assistance?
            </Text>
          </View>
        </View>

        <View style={styles.urgencyContainer}>
          {["Low", "Normal", "Urgent"].map((item) => {
            const selected = urgency === item;

            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.urgencyButton,
                  selected && styles.activeUrgency,

                  item === "Low" &&
                    selected &&
                    styles.lowSelected,

                  item === "Normal" &&
                    selected &&
                    styles.normalSelected,

                  item === "Urgent" &&
                    selected &&
                    styles.urgentSelected,
                ]}
                onPress={() => setUrgency(item)}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={getUrgencyIcon(item)}
                  size={19}
                  color={selected ? "#FFFFFF" : "#64748B"}
                />

                <Text
                  style={[
                    styles.urgencyText,
                    selected && styles.activeUrgencyText,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Location Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <MaterialIcons
              name="location-on"
              size={19}
              color="#2563EB"
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.sectionSubtitle}>
              Where can support reach you?
            </Text>
          </View>
        </View>

        <Text style={styles.label}>Your Location</Text>

        <View style={styles.inputWrapper}>
          <MaterialIcons
            name="location-on"
            size={21}
            color="#2563EB"
            style={styles.inputIcon}
          />

          <TextInput
            placeholder="Enter your address or area"
            placeholderTextColor="#94A3B8"
            value={location}
            onChangeText={setLocation}
            style={styles.input}
          />
        </View>

        {/* Information Card */}
        <View style={styles.infoCard}>
          <MaterialIcons
            name="info-outline"
            size={21}
            color="#2563EB"
          />

          <Text style={styles.infoText}>
            Please provide accurate information so community members
            can better understand and respond to your request.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleSubmitRequest}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text style={styles.submitText}>
                Submitting...
              </Text>
            </>
          ) : (
            <>
              <MaterialIcons
                name="volunteer-activism"
                size={21}
                color="#FFFFFF"
              />

              <Text style={styles.submitText}>
                Submit Help Request
              </Text>

              <MaterialIcons
                name="arrow-forward"
                size={21}
                color="#FFFFFF"
              />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.bottomNote}>
          Your request will remain pending until it is reviewed.
        </Text>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default RequestHelp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 22,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 12,
  },

  headerTextContainer: {
    flex: 1,
  },

  heading: {
    fontSize: 27,
    fontWeight: "800",
    color: "#1E293B",
  },

  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Community Card */
  helpCard: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderRadius: 18,
    padding: 17,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  helpIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  helpContent: {
    flex: 1,
  },

  helpTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2563EB",
    marginBottom: 5,
  },

  helpText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },

  /* Section Headers */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    marginTop: 3,
  },

  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
  },

  sectionSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },

  /* Labels */
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginTop: 10,
  },

  helperText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: -5,
    marginBottom: 9,
  },

  /* Category */
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },

  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 9,
  },

  activeCategory: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },

  categoryText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 6,
  },

  activeCategoryText: {
    color: "#FFFFFF",
  },

  /* Inputs */
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    minHeight: 55,
    marginBottom: 6,
  },

  inputIcon: {
    marginLeft: 15,
    marginRight: 3,
  },

  input: {
    flex: 1,
    color: "#1E293B",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },

  descriptionWrapper: {
    alignItems: "flex-start",
    minHeight: 125,
  },

  descriptionIcon: {
    marginLeft: 15,
    marginTop: 17,
    marginRight: 3,
  },

  textArea: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: 16,
    paddingRight: 14,
  },

  /* Urgency */
  urgencyHeader: {
    marginTop: 7,
  },

  urgencyContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },

  urgencyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    paddingVertical: 13,
    marginRight: 8,
  },

  urgencyButtonLast: {
    marginRight: 0,
  },

  activeUrgency: {
    borderWidth: 1.5,
  },

  lowSelected: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },

  normalSelected: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },

  urgentSelected: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },

  urgencyText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 5,
  },

  activeUrgencyText: {
    color: "#FFFFFF",
  },

  /* Information */
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F1F5F9",
    borderRadius: 15,
    padding: 14,
    marginTop: 8,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginLeft: 10,
  },

  /* Submit */
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 20,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  disabledButton: {
    opacity: 0.7,
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginHorizontal: 10,
  },

  bottomNote: {
    textAlign: "center",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 12,
  },
});