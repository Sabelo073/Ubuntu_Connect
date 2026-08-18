import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import { addDoc, collection } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

const RequestHelp = () => {
  const [category, setCategory] = useState("Food");
  const [itemNeeded, setItemNeeded] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("Normal");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const categories = [
    "Food",
    "Clothing",
    "Blankets",
    "Furniture",
    "Books",
    "School Supplies",
    "Medical Supplies",
    "Baby Products",
    "Electronics",
    "Other",
  ];

  const handleSubmitRequest = async () => {
    if (!category || !itemNeeded || !quantity || !description || !location) {
      Alert.alert("Missing Information", "Please fill in all required fields.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Not Logged In", "Please login before submitting a request.");
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

      Alert.alert("Success", "Your help request has been submitted successfully.");

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <Text style={styles.heading}>Request Help</Text>

        <Text style={styles.subtitle}>
          Let the community know what support you need.
        </Text>

        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>❤️ Community Support</Text>
          <Text style={styles.helpText}>
            Your request will be shared with nearby donors, charities, and NGOs who may be able to help.
          </Text>
        </View>

        {/* Category */}
        <Text style={styles.label}>Category</Text>

        <View style={styles.categoryContainer}>
          {categories.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.categoryButton,
                category === item && styles.activeCategory,
              ]}
              onPress={() => setCategory(item)}
            >
              <Text
                style={[
                  styles.categoryText,
                  category === item && styles.activeCategoryText,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Item Needed */}
        <Text style={styles.label}>Item Needed</Text>

        <TextInput
          placeholder="e.g. School Uniforms"
          placeholderTextColor="#94A3B8"
          value={itemNeeded}
          onChangeText={setItemNeeded}
          style={styles.input}
        />

        {/* Quantity */}
        <Text style={styles.label}>Quantity Needed</Text>

        <TextInput
          placeholder="e.g. 5"
          keyboardType="numeric"
          placeholderTextColor="#94A3B8"
          value={quantity}
          onChangeText={setQuantity}
          style={styles.input}
        />

        {/* Description */}
        <Text style={styles.label}>Description</Text>

        <TextInput
          multiline
          numberOfLines={5}
          placeholder="Describe your situation and needs..."
          placeholderTextColor="#94A3B8"
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.textArea]}
        />

        {/* Urgency */}
        <Text style={styles.label}>Urgency Level</Text>

        <View style={styles.urgencyContainer}>
          {["Low", "Normal", "Urgent"].map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.urgencyButton,
                urgency === item && styles.activeUrgency,
                item === "Urgent" && urgency === item && styles.urgentSelected,
              ]}
              onPress={() => setUrgency(item)}
            >
              <Text
                style={[
                  styles.urgencyText,
                  urgency === item && styles.activeUrgencyText,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Location */}
        <Text style={styles.label}>Location</Text>

        <TextInput
          placeholder="Enter your address"
          placeholderTextColor="#94A3B8"
          value={location}
          onChangeText={setLocation}
          style={styles.input}
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleSubmitRequest}
          disabled={loading}
        >
          <Text style={styles.submitText}>
            {loading ? "Submitting..." : "Submit Request"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />

      </ScrollView>
    </SafeAreaView>
  );
};

export default RequestHelp;

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
  },

  subtitle: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 20,
  },

  helpCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },

  helpTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 8,
  },

  helpText: {
    color: "#475569",
    lineHeight: 22,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    height: 55,
    paddingHorizontal: 16,
    justifyContent: "center",
    marginBottom: 12,
    color: "#1E293B",
  },

  textArea: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: 16,
  },

  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },

  categoryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 10,
  },

  activeCategory: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  categoryText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 13,
  },

  activeCategoryText: {
    color: "#FFFFFF",
  },

  urgencyContainer: {
    flexDirection: "row",
    marginBottom: 15,
  },

  urgencyButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginRight: 8,
  },

  activeUrgency: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },

  urgentSelected: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },

  urgencyText: {
    color: "#475569",
    fontWeight: "600",
  },

  activeUrgencyText: {
    color: "#FFFFFF",
  },

  submitButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
  },

  disabledButton: {
    opacity: 0.7,
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});