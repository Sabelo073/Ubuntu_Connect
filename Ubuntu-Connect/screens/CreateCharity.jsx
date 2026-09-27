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

import { MaterialIcons } from "@expo/vector-icons";

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
  // ==========================================
  // FORM STATE
  // ==========================================

  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] =
    useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [needs, setNeeds] = useState("");
  const [services, setServices] = useState("");
  const [distance, setDistance] = useState("");

  const [verified, setVerified] =
    useState(true);

  const [checkingAdmin, setCheckingAdmin] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  // ==========================================
  // MESSAGE
  // ==========================================

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

  // ==========================================
  // CHECK ADMIN ACCESS
  // ==========================================

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
          doc(
            db,
            "users",
            currentUser.uid
          )
        );

        if (!userSnapshot.exists()) {
          showMessage(
            "Access Denied",
            "Your user profile could not be found."
          );

          navigation.goBack();

          return;
        }

        const userData =
          userSnapshot.data();

        const userRole =
          userData.role?.trim();

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

  // ==========================================
  // EMAIL VALIDATION
  // ==========================================

  const isValidEmail = (
    emailAddress
  ) => {
    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(
      emailAddress
    );
  };

  // ==========================================
  // CONVERT TEXT TO LIST
  // ==========================================

  const convertToList = (value) => {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(
        (item) => item.length > 0
      );
  };

  // ==========================================
  // RESET FORM
  // ==========================================

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

  // ==========================================
  // CREATE CHARITY
  // ==========================================

  const createCharity = async () => {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      showMessage(
        "Login Required",
        "Please log in before creating a charity."
      );

      return;
    }

    // ----------------------------------------
    // Required fields
    // ----------------------------------------

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

    // ----------------------------------------
    // Contact validation
    // ----------------------------------------

    if (
      !phone.trim() &&
      !email.trim()
    ) {
      showMessage(
        "Contact Required",
        "Enter at least a phone number or an email address."
      );

      return;
    }

    if (
      email.trim() &&
      !isValidEmail(
        email.trim()
      )
    ) {
      showMessage(
        "Invalid Email",
        "Enter a valid email address."
      );

      return;
    }

    // ----------------------------------------
    // Needs and services
    // ----------------------------------------

    const charityNeeds =
      convertToList(needs);

    const charityServices =
      convertToList(services);

    if (
      charityNeeds.length === 0
    ) {
      showMessage(
        "Needs Required",
        "Enter at least one current need."
      );

      return;
    }

    if (
      charityServices.length === 0
    ) {
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

          description:
            description.trim(),

          location:
            location.trim(),

          address:
            address.trim(),

          phone:
            phone.trim(),

          email:
            email
              .trim()
              .toLowerCase(),

          needs: charityNeeds,

          services:
            charityServices,

          distance:
            distance.trim(),

          verified,

          createdBy:
            currentUser.uid,

          createdByEmail:
            currentUser.email || "",

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
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

  // ==========================================
  // ADMIN CHECK LOADING
  // ==========================================

  if (checkingAdmin) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <View
          style={
            styles.loadingIconContainer
          }
        >
          <MaterialIcons
            name="admin-panel-settings"
            size={34}
            color="#2563EB"
          />
        </View>

        <ActivityIndicator
          size="small"
          color="#2563EB"
        />

        <Text
          style={styles.loadingText}
        >
          Checking administrator access...
        </Text>
      </SafeAreaView>
    );
  }

  // ==========================================
  // SCREEN
  // ==========================================

  return (
    <SafeAreaView
      style={styles.container}
      edges={[
        "top",
        "left",
        "right",
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* ==================================
            HEADER
        ================================== */}

        <View style={styles.header}>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              navigation.goBack()
            }
            disabled={creating}
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color="#1E293B"
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerIconContainer
            }
          >
            <MaterialIcons
              name="handshake"
              size={25}
              color="#059669"
            />
          </View>

          <View
            style={
              styles.headerTextContainer
            }
          >
            <Text
              style={styles.heading}
            >
              Create Charity
            </Text>

            <Text
              style={styles.subtitle}
            >
              Add a community organisation
              to Ubuntu Connect.
            </Text>
          </View>

        </View>


        {/* ==================================
            FORM CARD
        ================================== */}

        <View style={styles.formCard}>

          {/* ORGANISATION INFORMATION */}

          <View
            style={
              styles.sectionHeader
            }
          >
            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor:
                    "#EFF6FF",
                },
              ]}
            >
              <MaterialIcons
                name="business"
                size={20}
                color="#2563EB"
              />
            </View>

            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Organisation Information
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Basic details about the charity
              </Text>
            </View>
          </View>


          {/* NAME */}

          <Text style={styles.label}>
            Organisation name
          </Text>

          <View
            style={styles.inputContainer}
          >
            <MaterialIcons
              name="business"
              size={19}
              color="#94A3B8"
            />

            <TextInput
              placeholder="Example: Ubuntu Community Shelter"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
              style={styles.inputWithIcon}
              maxLength={120}
              editable={!creating}
            />
          </View>


          {/* TYPE */}

          <Text style={styles.label}>
            Organisation type
          </Text>

          <View
            style={styles.inputContainer}
          >
            <MaterialIcons
              name="category"
              size={19}
              color="#94A3B8"
            />

            <TextInput
              placeholder="Example: Shelter or Food Bank"
              placeholderTextColor="#94A3B8"
              value={type}
              onChangeText={setType}
              style={styles.inputWithIcon}
              maxLength={80}
              editable={!creating}
            />
          </View>


          {/* DESCRIPTION */}

          <Text style={styles.label}>
            Description
          </Text>

          <View
            style={[
              styles.inputContainer,
              styles.textAreaContainer,
            ]}
          >
            <MaterialIcons
              name="description"
              size={19}
              color="#94A3B8"
              style={
                styles.textAreaIcon
              }
            />

            <TextInput
              placeholder="Describe the organisation and the work it does..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={
                setDescription
              }
              style={[
                styles.inputWithIcon,
                styles.descriptionInput,
              ]}
              multiline
              maxLength={600}
              textAlignVertical="top"
              editable={!creating}
            />
          </View>

          <Text
            style={
              styles.characterCount
            }
          >
            {description.length}/600
          </Text>


          {/* LOCATION */}

          <View
            style={[
              styles.sectionHeader,
              styles.sectionSpacing,
            ]}
          >
            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor:
                    "#F0FDF4",
                },
              ]}
            >
              <MaterialIcons
                name="location-on"
                size={20}
                color="#22C55E"
              />
            </View>

            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Location
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Where the organisation is located
              </Text>
            </View>
          </View>


          {/* CITY */}

          <Text style={styles.label}>
            City or area
          </Text>

          <View
            style={styles.inputContainer}
          >
            <MaterialIcons
              name="location-city"
              size={19}
              color="#94A3B8"
            />

            <TextInput
              placeholder="Example: Johannesburg"
              placeholderTextColor="#94A3B8"
              value={location}
              onChangeText={setLocation}
              style={styles.inputWithIcon}
              maxLength={100}
              editable={!creating}
            />
          </View>


          {/* ADDRESS */}

          <Text style={styles.label}>
            Full address
          </Text>

          <View
            style={styles.inputContainer}
          >
            <MaterialIcons
              name="place"
              size={19}
              color="#94A3B8"
            />

            <TextInput
              placeholder="Example: 25 Main Street, Johannesburg"
              placeholderTextColor="#94A3B8"
              value={address}
              onChangeText={setAddress}
              style={styles.inputWithIcon}
              maxLength={200}
              editable={!creating}
            />
          </View>


          {/* DISTANCE */}

          <Text style={styles.label}>
            Distance description
          </Text>

          <View
            style={styles.inputContainer}
          >
            <MaterialIcons
              name="straighten"
              size={19}
              color="#94A3B8"
            />

            <TextInput
              placeholder="Example: 2.5 km"
              placeholderTextColor="#94A3B8"
              value={distance}
              onChangeText={setDistance}
              style={styles.inputWithIcon}
              maxLength={40}
              editable={!creating}
            />
          </View>

          <Text
            style={styles.optionalText}
          >
            Distance is optional and can be
            entered as text.
          </Text>


          {/* CONTACT INFORMATION */}

          <View
            style={[
              styles.sectionHeader,
              styles.sectionSpacing,
            ]}
          >
            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor:
                    "#F5F3FF",
                },
              ]}
            >
              <MaterialIcons
                name="contact-phone"
                size={20}
                color="#7C3AED"
              />
            </View>

            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Contact Information
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                How users can contact the charity
              </Text>
            </View>
          </View>


          {/* PHONE */}

          <Text style={styles.label}>
            Phone number
          </Text>

          <View
            style={styles.inputContainer}
          >
            <MaterialIcons
              name="phone"
              size={19}
              color="#94A3B8"
            />

            <TextInput
              placeholder="Example: 011 123 4567"
              placeholderTextColor="#94A3B8"
              value={phone}
              onChangeText={setPhone}
              style={styles.inputWithIcon}
              keyboardType="phone-pad"
              maxLength={25}
              editable={!creating}
            />
          </View>


          {/* EMAIL */}

          <Text style={styles.label}>
            Email address
          </Text>

          <View
            style={styles.inputContainer}
          >
            <MaterialIcons
              name="email"
              size={19}
              color="#94A3B8"
            />

            <TextInput
              placeholder="Example: contact@charity.org"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              style={styles.inputWithIcon}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={150}
              editable={!creating}
            />
          </View>


          {/* NEEDS AND SERVICES */}

          <View
            style={[
              styles.sectionHeader,
              styles.sectionSpacing,
            ]}
          >
            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor:
                    "#FFF7ED",
                },
              ]}
            >
              <MaterialIcons
                name="volunteer-activism"
                size={20}
                color="#F97316"
              />
            </View>

            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Needs and Services
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Help the community understand what is needed
              </Text>
            </View>
          </View>


          {/* NEEDS */}

          <Text style={styles.label}>
            Current needs
          </Text>

          <View
            style={[
              styles.inputContainer,
              styles.textAreaContainer,
            ]}
          >
            <MaterialIcons
              name="inventory-2"
              size={19}
              color="#94A3B8"
              style={
                styles.textAreaIcon
              }
            />

            <TextInput
              placeholder="Blankets, clothes, food parcels"
              placeholderTextColor="#94A3B8"
              value={needs}
              onChangeText={setNeeds}
              style={[
                styles.inputWithIcon,
                styles.multilineInput,
              ]}
              multiline
              maxLength={400}
              textAlignVertical="top"
              editable={!creating}
            />
          </View>

          <Text
            style={styles.helpText}
          >
            Separate each need with a comma.
          </Text>


          {/* SERVICES */}

          <Text style={styles.label}>
            Services offered
          </Text>

          <View
            style={[
              styles.inputContainer,
              styles.textAreaContainer,
            ]}
          >
            <MaterialIcons
              name="support"
              size={19}
              color="#94A3B8"
              style={
                styles.textAreaIcon
              }
            />

            <TextInput
              placeholder="Shelter, meals, counselling"
              placeholderTextColor="#94A3B8"
              value={services}
              onChangeText={
                setServices
              }
              style={[
                styles.inputWithIcon,
                styles.multilineInput,
              ]}
              multiline
              maxLength={400}
              textAlignVertical="top"
              editable={!creating}
            />
          </View>

          <Text
            style={styles.helpText}
          >
            Separate each service with a comma.
          </Text>


          {/* VERIFICATION */}

          <TouchableOpacity
            style={[
              styles.verificationSelector,
              verified &&
                styles.verificationSelectorActive,
            ]}
            onPress={() =>
              setVerified(
                (current) => !current
              )
            }
            disabled={creating}
            activeOpacity={0.85}
          >

            <View
              style={[
                styles.checkbox,
                verified &&
                  styles.checkboxSelected,
              ]}
            >
              {verified && (
                <MaterialIcons
                  name="check"
                  size={17}
                  color="#FFFFFF"
                />
              )}
            </View>

            <View
              style={
                styles.verificationTextContainer
              }
            >
              <View
                style={
                  styles.verificationTitleRow
                }
              >
                <Text
                  style={
                    styles.verificationTitle
                  }
                >
                  Verified organisation
                </Text>

                {verified && (
                  <View
                    style={
                      styles.verifiedBadge
                    }
                  >
                    <MaterialIcons
                      name="verified"
                      size={13}
                      color="#16A34A"
                    />

                    <Text
                      style={
                        styles.verifiedBadgeText
                      }
                    >
                      VERIFIED
                    </Text>
                  </View>
                )}
              </View>

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


          {/* CREATE BUTTON */}

          <TouchableOpacity
            style={[
              styles.createButton,
              creating &&
                styles.disabledButton,
            ]}
            onPress={createCharity}
            disabled={creating}
            activeOpacity={0.85}
          >
            {creating ? (
              <View
                style={
                  styles.buttonContent
                }
              >
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
              <View
                style={
                  styles.buttonContent
                }
              >
                <MaterialIcons
                  name="add-business"
                  size={20}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.createButtonText
                  }
                >
                  Create Charity
                </Text>
              </View>
            )}
          </TouchableOpacity>


          {/* CANCEL BUTTON */}

          <TouchableOpacity
            style={
              styles.cancelButton
            }
            onPress={() =>
              navigation.goBack()
            }
            disabled={creating}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name="close"
              size={19}
              color="#64748B"
            />

            <Text
              style={
                styles.cancelButtonText
              }
            >
              Cancel
            </Text>
          </TouchableOpacity>

        </View>


        {/* ==================================
            INFORMATION CARD
        ================================== */}

        <View
          style={
            styles.informationCard
          }
        >
          <View
            style={
              styles.informationIcon
            }
          >
            <MaterialIcons
              name="verified-user"
              size={21}
              color="#D97706"
            />
          </View>

          <View
            style={
              styles.informationContent
            }
          >
            <Text
              style={
                styles.informationTitle
              }
            >
              Before verifying
            </Text>

            <Text
              style={
                styles.informationText
              }
            >
              Confirm that the organisation
              exists and that its contact
              information is correct before
              marking it as verified.
            </Text>
          </View>
        </View>


        <View
          style={{ height: 50 }}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

export default CreateCharity;


// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    paddingHorizontal: 20,
  },

  // ==========================================
  // LOADING
  // ==========================================

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  loadingIconContainer: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  loadingText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    textAlign: "center",
  },

  // ==========================================
  // HEADER
  // ==========================================

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 22,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
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
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },

  // ==========================================
  // FORM CARD
  // ==========================================

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  // ==========================================
  // SECTION HEADER
  // ==========================================

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
  },

  sectionSpacing: {
    marginTop: 12,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  sectionTitle: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 2,
  },

  // ==========================================
  // LABELS
  // ==========================================

  label: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  // ==========================================
  // INPUTS
  // ==========================================

  inputContainer: {
    minHeight: 54,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 17,
  },

  inputWithIcon: {
    flex: 1,
    color: "#1E293B",
    fontSize: 14,
    marginLeft: 9,
    paddingVertical: 13,
  },

  textAreaContainer: {
    alignItems: "flex-start",
    minHeight: 105,
  },

  textAreaIcon: {
    marginTop: 14,
  },

  descriptionInput: {
    height: 110,
  },

  multilineInput: {
    height: 80,
  },

  characterCount: {
    color: "#94A3B8",
    fontSize: 10,
    textAlign: "right",
    marginTop: -11,
    marginBottom: 18,
  },

  optionalText: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: -10,
    marginBottom: 17,
  },

  helpText: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: -10,
    marginBottom: 18,
  },

  // ==========================================
  // VERIFICATION
  // ==========================================

  verificationSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 15,
    marginTop: 3,
    marginBottom: 22,
  },

  verificationSelectorActive: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },

  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  checkboxSelected: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },

  verificationTextContainer: {
    flex: 1,
  },

  verificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  verificationTitle: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "800",
  },

  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginLeft: 7,
    marginTop: 2,
  },

  verifiedBadgeText: {
    color: "#16A34A",
    fontSize: 8,
    fontWeight: "900",
    marginLeft: 3,
  },

  verificationDescription: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  // ==========================================
  // BUTTONS
  // ==========================================

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
    flexDirection: "row",
    marginTop: 12,
  },

  cancelButtonText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },

  // ==========================================
  // INFORMATION CARD
  // ==========================================

  informationCard: {
    flexDirection: "row",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 17,
    padding: 15,
    marginTop: 16,
  },

  informationIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  informationContent: {
    flex: 1,
  },

  informationTitle: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "800",
  },

  informationText: {
    color: "#A16207",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 4,
  },

});