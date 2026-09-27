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
  ActivityIndicator,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import * as ImagePicker from "expo-image-picker";

import { addDoc, collection } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const Donate = ({ navigation }) => {
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
    {
      name: "Food",
      icon: "restaurant",
      color: "#F97316",
      background: "#FFF7ED",
    },
    {
      name: "Clothes",
      icon: "checkroom",
      color: "#2563EB",
      background: "#EFF6FF",
    },
    {
      name: "Furniture",
      icon: "chair",
      color: "#7C3AED",
      background: "#F5F3FF",
    },
    {
      name: "Books",
      icon: "menu-book",
      color: "#22C55E",
      background: "#F0FDF4",
    },
    {
      name: "Electronics",
      icon: "devices",
      color: "#2563EB",
      background: "#EFF6FF",
    },
    {
      name: "School Supplies",
      icon: "school",
      color: "#F97316",
      background: "#FFF7ED",
    },
    {
      name: "Toys",
      icon: "toys",
      color: "#7C3AED",
      background: "#F5F3FF",
    },
    {
      name: "Blankets",
      icon: "bed",
      color: "#22C55E",
      background: "#F0FDF4",
    },
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

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,
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
    if (
      !itemName ||
      !category ||
      !description ||
      !address
    ) {
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
        "Please login before submitting a donation."
      );
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

      Alert.alert(
        "Donation Submitted",
        "Your donation has been submitted successfully."
      );

      setItemName("");
      setCategory("Clothes");
      setCondition("Good");
      setDescription("");
      setDeliveryMethod("Pickup");
      setAddress("");
      setImageUri(null);
      setImageBase64("");
    } catch (error) {
      Alert.alert(
        "Donation Error",
        error.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* =====================================
            HEADER
        ===================================== */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons
              name="arrow-back"
              size={23}
              color="#1E293B"
            />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.heading}>
              Donate an Item
            </Text>

            <Text style={styles.subtitle}>
              Give something useful a second life.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <MaterialIcons
              name="card-giftcard"
              size={24}
              color="#2563EB"
            />
          </View>
        </View>

        {/* =====================================
            INTRO CARD
        ===================================== */}
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <MaterialIcons
              name="volunteer-activism"
              size={25}
              color="#22C55E"
            />
          </View>

          <View style={styles.introContent}>
            <Text style={styles.introTitle}>
              Make someone's day
            </Text>

            <Text style={styles.introText}>
              Your unused items could make a real
              difference to someone in your community.
            </Text>
          </View>
        </View>

        {/* =====================================
            PHOTO
        ===================================== */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Item Photo
            </Text>

            <Text style={styles.sectionSubtitle}>
              Help others see what you're offering
            </Text>
          </View>

          <Text style={styles.optional}>
            Optional
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.imageBox,
            imageUri && styles.imageBoxWithImage,
          ]}
          onPress={pickImage}
          activeOpacity={0.8}
        >
          {imageUri ? (
            <>
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
              />

              <View style={styles.changeImageOverlay}>
                <MaterialIcons
                  name="photo-camera"
                  size={18}
                  color="#FFFFFF"
                />

                <Text style={styles.changeImageText}>
                  Change Photo
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.uploadIcon}>
                <MaterialIcons
                  name="add-a-photo"
                  size={30}
                  color="#2563EB"
                />
              </View>

              <Text style={styles.imageText}>
                Add a photo
              </Text>

              <Text style={styles.smallText}>
                Tap to choose an image from your gallery
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* =====================================
            ITEM DETAILS
        ===================================== */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Item Details
            </Text>

            <Text style={styles.sectionSubtitle}>
              Tell the community about your donation
            </Text>
          </View>
        </View>

        <Text style={styles.label}>
          Item Name
        </Text>

        <View style={styles.inputWrapper}>
          <MaterialIcons
            name="inventory-2"
            size={20}
            color="#64748B"
          />

          <TextInput
            placeholder="e.g. Winter Jacket"
            placeholderTextColor="#94A3B8"
            value={itemName}
            onChangeText={setItemName}
            style={styles.input}
          />
        </View>

        {/* =====================================
            CATEGORY
        ===================================== */}
        <Text style={styles.label}>
          Category
        </Text>

        <View style={styles.categoryContainer}>
          {categories.map((item) => {
            const isSelected =
              category === item.name;

            return (
              <TouchableOpacity
                key={item.name}
                style={[
                  styles.categoryButton,
                  isSelected &&
                    styles.activeCategory,
                ]}
                onPress={() =>
                  setCategory(item.name)
                }
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.categoryIcon,
                    {
                      backgroundColor: isSelected
                        ? "rgba(255,255,255,0.18)"
                        : item.background,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={item.icon}
                    size={17}
                    color={
                      isSelected
                        ? "#FFFFFF"
                        : item.color
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.categoryText,
                    isSelected &&
                      styles.activeCategoryText,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* =====================================
            CONDITION
        ===================================== */}
        <Text style={styles.label}>
          Condition
        </Text>

        <View style={styles.choiceRow}>
          {[
            {
              name: "New",
              icon: "auto-awesome",
            },
            {
              name: "Good",
              icon: "verified",
            },
            {
              name: "Fair",
              icon: "recycling",
            },
          ].map((item) => {
            const isSelected =
              condition === item.name;

            return (
              <TouchableOpacity
                key={item.name}
                style={[
                  styles.choiceButton,
                  isSelected &&
                    styles.selected,
                ]}
                onPress={() =>
                  setCondition(item.name)
                }
              >
                <MaterialIcons
                  name={item.icon}
                  size={18}
                  color={
                    isSelected
                      ? "#FFFFFF"
                      : "#64748B"
                  }
                />

                <Text
                  style={[
                    styles.choiceText,
                    isSelected &&
                      styles.selectedText,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* =====================================
            DESCRIPTION
        ===================================== */}
        <Text style={styles.label}>
          Description
        </Text>

        <View
          style={[
            styles.inputWrapper,
            styles.textareaWrapper,
          ]}
        >
          <MaterialIcons
            name="description"
            size={20}
            color="#64748B"
            style={styles.textareaIcon}
          />

          <TextInput
            multiline
            numberOfLines={5}
            placeholder="Tell us about the item, its size, colour, features or anything else that may be useful..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            style={[
              styles.input,
              styles.textarea,
            ]}
            textAlignVertical="top"
          />
        </View>

        {/* =====================================
            DELIVERY
        ===================================== */}
        <Text style={styles.label}>
          Delivery Method
        </Text>

        <View style={styles.deliveryContainer}>
          <TouchableOpacity
            style={[
              styles.deliveryCard,
              deliveryMethod === "Pickup" &&
                styles.deliveryCardSelected,
            ]}
            onPress={() =>
              setDeliveryMethod("Pickup")
            }
          >
            <View
              style={[
                styles.deliveryIcon,
                deliveryMethod === "Pickup" &&
                  styles.deliveryIconSelected,
              ]}
            >
              <MaterialIcons
                name="local-shipping"
                size={23}
                color={
                  deliveryMethod === "Pickup"
                    ? "#FFFFFF"
                    : "#2563EB"
                }
              />
            </View>

            <View style={styles.deliveryText}>
              <Text
                style={[
                  styles.deliveryTitle,
                  deliveryMethod === "Pickup" &&
                    styles.deliveryTitleSelected,
                ]}
              >
                Pickup
              </Text>

              <Text style={styles.deliveryDescription}>
                Recipient collects the item
              </Text>
            </View>

            {deliveryMethod === "Pickup" && (
              <MaterialIcons
                name="check-circle"
                size={21}
                color="#22C55E"
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deliveryCard,
              deliveryMethod === "Drop-off" &&
                styles.deliveryCardSelected,
            ]}
            onPress={() =>
              setDeliveryMethod("Drop-off")
            }
          >
            <View
              style={[
                styles.deliveryIcon,
                deliveryMethod === "Drop-off" &&
                  styles.deliveryIconSelected,
              ]}
            >
              <MaterialIcons
                name="store"
                size={23}
                color={
                  deliveryMethod === "Drop-off"
                    ? "#FFFFFF"
                    : "#7C3AED"
                }
              />
            </View>

            <View style={styles.deliveryText}>
              <Text
                style={[
                  styles.deliveryTitle,
                  deliveryMethod === "Drop-off" &&
                    styles.deliveryTitleSelected,
                ]}
              >
                Drop-off
              </Text>

              <Text style={styles.deliveryDescription}>
                You deliver the item
              </Text>
            </View>

            {deliveryMethod === "Drop-off" && (
              <MaterialIcons
                name="check-circle"
                size={21}
                color="#22C55E"
              />
            )}
          </TouchableOpacity>
        </View>

        {/* =====================================
            ADDRESS
        ===================================== */}
        <Text style={styles.label}>
          Address
        </Text>

        <View style={styles.inputWrapper}>
          <MaterialIcons
            name="location-on"
            size={20}
            color="#64748B"
          />

          <TextInput
            placeholder="Collection or drop-off address"
            placeholderTextColor="#94A3B8"
            value={address}
            onChangeText={setAddress}
            style={styles.input}
          />
        </View>

        {/* =====================================
            INFO
        ===================================== */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <MaterialIcons
              name="info-outline"
              size={21}
              color="#2563EB"
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              A quick reminder
            </Text>

            <Text style={styles.infoText}>
              Please make sure the item is safe,
              accurately described and ready for the
              selected delivery method.
            </Text>
          </View>
        </View>

        {/* =====================================
            SUBMIT
        ===================================== */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            loading &&
              styles.disabledButton,
          ]}
          onPress={handleSubmitDonation}
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
                Submitting Donation...
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
                Submit Donation
              </Text>

              <MaterialIcons
                name="arrow-forward"
                size={19}
                color="#FFFFFF"
              />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.bottomText}>
          Your donation will be reviewed before
          appearing to other users.
        </Text>

        <View style={{ height: 60 }} />

      </ScrollView>
    </SafeAreaView>
  );
};

export default Donate;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  /* =====================================
     HEADER
  ===================================== */

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 20,
  },

  backButton: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 12,
  },

  headerTextContainer: {
    flex: 1,
  },

  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 3,
  },

  headerIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },

  /* =====================================
     INTRO
  ===================================== */

  introCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 26,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  introContent: {
    flex: 1,
  },

  introTitle: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "800",
  },

  introText: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },

  /* =====================================
     SECTIONS
  ===================================== */

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 13,
  },

  sectionTitle: {
    color: "#1E293B",
    fontSize: 17,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 3,
  },

  optional: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
  },

  /* =====================================
     IMAGE
  ===================================== */

  imageBox: {
    height: 190,
    backgroundColor: "#FFFFFF",
    borderRadius: 21,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 27,
    overflow: "hidden",
  },

  imageBoxWithImage: {
    borderStyle: "solid",
    borderColor: "#E2E8F0",
  },

  uploadIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  imageText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "800",
  },

  smallText: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 5,
  },

  previewImage: {
    width: "100%",
    height: "100%",
  },

  changeImageOverlay: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    backgroundColor: "rgba(15,23,42,0.78)",
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  changeImageText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 6,
  },

  /* =====================================
     INPUTS
  ===================================== */

  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  inputWrapper: {
    minHeight: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
  },

  input: {
    flex: 1,
    color: "#1E293B",
    fontSize: 14,
    paddingHorizontal: 10,
    minHeight: 52,
  },

  textareaWrapper: {
    minHeight: 125,
    alignItems: "flex-start",
    paddingTop: 14,
  },

  textareaIcon: {
    marginTop: 2,
  },

  textarea: {
    minHeight: 105,
    textAlignVertical: "top",
    paddingTop: 0,
  },

  /* =====================================
     CATEGORY
  ===================================== */

  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 13,
  },

  categoryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 7,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  activeCategory: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },

  categoryIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },

  categoryText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 11,
  },

  activeCategoryText: {
    color: "#FFFFFF",
  },

  /* =====================================
     CONDITION
  ===================================== */

  choiceRow: {
    flexDirection: "row",
    marginBottom: 17,
  },

  choiceButton: {
    flex: 1,
    minHeight: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginRight: 8,
  },

  selected: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },

  choiceText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 5,
  },

  selectedText: {
    color: "#FFFFFF",
  },

  /* =====================================
     DELIVERY
  ===================================== */

  deliveryContainer: {
    marginBottom: 3,
  },

  deliveryCard: {
    backgroundColor: "#FFFFFF",
    minHeight: 72,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  deliveryCardSelected: {
    borderColor: "#22C55E",
    backgroundColor: "#F0FDF4",
  },

  deliveryIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  deliveryIconSelected: {
    backgroundColor: "#22C55E",
  },

  deliveryText: {
    flex: 1,
  },

  deliveryTitle: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "800",
  },

  deliveryTitleSelected: {
    color: "#166534",
  },

  deliveryDescription: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 3,
  },

  /* =====================================
     INFO
  ===================================== */

  infoCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 17,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  infoIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color: "#1E40AF",
    fontSize: 12,
    fontWeight: "800",
  },

  infoText: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },

  /* =====================================
     SUBMIT
  ===================================== */

  submitButton: {
    backgroundColor: "#2563EB",
    minHeight: 55,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },

  disabledButton: {
    opacity: 0.65,
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginHorizontal: 9,
  },

  bottomText: {
    color: "#94A3B8",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 15,
    marginTop: 10,
  },
});