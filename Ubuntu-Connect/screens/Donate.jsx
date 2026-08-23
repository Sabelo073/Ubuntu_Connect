import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";

import * as ImagePicker from "expo-image-picker";

import { addDoc, collection } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

const Donate = () => {
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Clothes");
  const [condition, setCondition] = useState("Good");
  const [description, setDescription] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("Pickup");
  const [address, setAddress] = useState("");

  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState("");

  const [loading, setLoading] = useState(false);

  const categories = [
    "Food",
    "Clothes",
    "Furniture",
    "Books",
    "Electronics",
    "School Supplies",
    "Toys",
    "Blankets",
  ];

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.2,
      base64: true,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
    }
  };

  const handleSubmitDonation = async () => {
    if (!itemName || !category || !description || !address) {
      Alert.alert("Missing Information", "Please fill in all required fields.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Not Logged In", "Please login before submitting a donation.");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "donations"), {
        userId: user.uid,
        itemName: itemName.trim(),
        category: category,
        condition: condition,
        description: description.trim(),
        deliveryMethod: deliveryMethod,
        address: address.trim(),
        imageBase64: imageBase64,
        status: "Pending",
        createdAt: new Date(),
      });

      Alert.alert("Success", "Your donation has been submitted successfully.");

      setItemName("");
      setCategory("Clothes");
      setCondition("Good");
      setDescription("");
      setDeliveryMethod("Pickup");
      setAddress("");
      setImageUri(null);
      setImageBase64("");
    } catch (error) {
      Alert.alert("Donation Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Donate an Item</Text>

        {/* Upload Image */}
        <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
            />
          ) : (
            <>
              <Text style={styles.camera}>📷</Text>
              <Text style={styles.imageText}>Upload Item Photo</Text>
              <Text style={styles.smallText}>
                Tap to choose from gallery
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Item Name */}
        <Text style={styles.label}>Item Name</Text>
        <TextInput
          placeholder="e.g. Winter Jacket"
          placeholderTextColor="#94A3B8"
          value={itemName}
          onChangeText={setItemName}
          style={styles.input}
        />

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

        {/* Condition */}
        <Text style={styles.label}>Condition</Text>

        <View style={styles.choiceRow}>
          {["New", "Good", "Fair"].map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.choiceButton,
                condition === item && styles.selected,
              ]}
              onPress={() => setCondition(item)}
            >
              <Text
                style={[
                  styles.choiceText,
                  condition === item && styles.selectedText,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.label}>Description</Text>

        <TextInput
          multiline
          numberOfLines={5}
          placeholder="Tell us about the item..."
          placeholderTextColor="#94A3B8"
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.textarea]}
        />

        {/* Delivery Method */}
        <Text style={styles.label}>Delivery Method</Text>

        <View style={styles.choiceRow}>
          {["Pickup", "Drop-off"].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.choiceButton,
                deliveryMethod === option && styles.selected,
              ]}
              onPress={() => setDeliveryMethod(option)}
            >
              <Text
                style={[
                  styles.choiceText,
                  deliveryMethod === option && styles.selectedText,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Address */}
        <Text style={styles.label}>Address</Text>

        <TextInput
          placeholder="Collection or drop-off address"
          placeholderTextColor="#94A3B8"
          value={address}
          onChangeText={setAddress}
          style={styles.input}
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleSubmitDonation}
          disabled={loading}
        >
          <Text style={styles.submitText}>
            {loading ? "Submitting..." : "Submit Donation"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Donate;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
  },

  heading: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 20,
    marginBottom: 25,
  },

  imageBox: {
    backgroundColor: "#FFFFFF",
    height: 180,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
    overflow: "hidden",
  },

  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },

  camera: {
    fontSize: 40,
    marginBottom: 10,
  },

  imageText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "600",
  },

  smallText: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 6,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
    marginTop: 10,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    height: 55,
    justifyContent: "center",
    marginBottom: 15,
    color: "#1E293B",
  },

  textarea: {
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

  choiceRow: {
    flexDirection: "row",
    marginBottom: 15,
  },

  choiceButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginRight: 10,
  },

  selected: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },

  choiceText: {
    color: "#475569",
    fontWeight: "600",
  },

  selectedText: {
    color: "#FFFFFF",
  },

  submitButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 18,
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