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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

const Register = ({ navigation }) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [role, setRole] = useState("Donor");
  const [loading, setLoading] = useState(false);

  const [hidePassword, setHidePassword] = useState(true);
  const [hideConfirmPassword, setHideConfirmPassword] = useState(true);

  const [focusedField, setFocusedField] = useState("");

  const roles = [
    {
      name: "Donor",
      icon: "card-giftcard",
      color: "#22C55E",
      description: "Give items or support",
    },
    {
      name: "Recipient",
      icon: "volunteer-activism",
      color: "#2563EB",
      description: "Request help",
    },
    {
      name: "Volunteer",
      icon: "groups",
      color: "#7C3AED",
      description: "Help the community",
    },
    {
      name: "NGO",
      icon: "handshake",
      color: "#F97316",
      description: "Support community work",
    },
  ];

  const isEmailValid =
    email.length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const passwordLengthValid = password.length >= 6;
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const getFirebaseErrorMessage = (error) => {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists. Try logging in instead.";

      case "auth/invalid-email":
        return "Please enter a valid email address.";

      case "auth/weak-password":
        return "Your password is too weak. Please choose a stronger password.";

      case "auth/network-request-failed":
        return "There seems to be a network problem. Please check your internet connection.";

      case "auth/too-many-requests":
        return "Too many registration attempts. Please wait a moment and try again.";

      default:
        return "We couldn't create your account right now. Please try again.";
    }
  };

  const handleRegister = async () => {
    if (
      !fullName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        "Almost there",
        "Please complete all the required fields before creating your account."
      );
      return;
    }

    if (fullName.trim().length < 2) {
      Alert.alert(
        "Check your name",
        "Please enter your full name."
      );
      return;
    }

    if (!isEmailValid) {
      Alert.alert(
        "Check your email",
        "Please enter a valid email address."
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Password too short",
        "Your password must contain at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords don't match",
        "Please make sure both password fields are the same."
      );
      return;
    }

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: role,
        createdAt: new Date(),
      });

      Alert.alert(
        "Welcome to Ubuntu Connect",
        "Your account has been created successfully. Let's get started!",
        [
          {
            text: "Continue",
            onPress: () => navigation.replace("MainTabs"),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Registration couldn't be completed",
        getFirebaseErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons
                name="arrow-back"
                size={22}
                color="#1E293B"
              />
            </TouchableOpacity>

            <View style={styles.logo}>
              <MaterialIcons
                name="volunteer-activism"
                size={27}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.heading}>Create Account</Text>

            <Text style={styles.subtitle}>
              Join Ubuntu Connect and become part of a community that helps
              people make a difference.
            </Text>
          </View>

          {/* Welcome Card */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeIcon}>
              <MaterialIcons
                name="groups"
                size={26}
                color="#2563EB"
              />
            </View>

            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeTitle}>
                Welcome to Ubuntu Connect
              </Text>

              <Text style={styles.welcomeText}>
                Connect with donors, recipients, volunteers and NGOs to
                create meaningful impact together.
              </Text>
            </View>
          </View>

          {/* Account Information */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <MaterialIcons
                name="person-outline"
                size={20}
                color="#2563EB"
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Your Information
              </Text>

              <Text style={styles.sectionSubtitle}>
                Tell us a little about yourself
              </Text>
            </View>
          </View>

          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>

          <View
            style={[
              styles.inputWrapper,
              focusedField === "fullName" && styles.inputFocused,
            ]}
          >
            <MaterialIcons
              name="person"
              size={21}
              color={
                focusedField === "fullName"
                  ? "#2563EB"
                  : "#94A3B8"
              }
            />

            <TextInput
              placeholder="Enter your full name"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              onFocus={() => setFocusedField("fullName")}
              onBlur={() => setFocusedField("")}
              autoCapitalize="words"
            />

            {fullName.trim().length >= 2 && (
              <MaterialIcons
                name="check-circle"
                size={20}
                color="#22C55E"
              />
            )}
          </View>

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>

          <View
            style={[
              styles.inputWrapper,
              focusedField === "email" && styles.inputFocused,
              email.length > 0 &&
                !isEmailValid &&
                styles.inputError,
            ]}
          >
            <MaterialIcons
              name="email"
              size={21}
              color={
                focusedField === "email"
                  ? "#2563EB"
                  : "#94A3B8"
              }
            />

            <TextInput
              placeholder="Enter your email"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField("")}
            />

            {isEmailValid && (
              <MaterialIcons
                name="check-circle"
                size={20}
                color="#22C55E"
              />
            )}
          </View>

          {email.length > 0 && !isEmailValid && (
            <Text style={styles.helperError}>
              Please enter a valid email address.
            </Text>
          )}

          {/* Phone */}
          <Text style={styles.label}>Phone Number</Text>

          <View
            style={[
              styles.inputWrapper,
              focusedField === "phone" && styles.inputFocused,
            ]}
          >
            <MaterialIcons
              name="phone"
              size={21}
              color={
                focusedField === "phone"
                  ? "#2563EB"
                  : "#94A3B8"
              }
            />

            <TextInput
              placeholder="Enter your phone number"
              placeholderTextColor="#94A3B8"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
              onFocus={() => setFocusedField("phone")}
              onBlur={() => setFocusedField("")}
            />

            {phone.trim().length >= 7 && (
              <MaterialIcons
                name="check-circle"
                size={20}
                color="#22C55E"
              />
            )}
          </View>

          {/* Password Section */}
          <View style={styles.passwordSectionHeader}>
            <View>
              <Text style={styles.label}>Password</Text>
            </View>

            {password.length > 0 && (
              <Text
                style={[
                  styles.passwordStatus,
                  passwordLengthValid
                    ? styles.passwordGood
                    : styles.passwordWeak,
                ]}
              >
                {passwordLengthValid
                  ? "Looks good"
                  : "Too short"}
              </Text>
            )}
          </View>

          <View
            style={[
              styles.inputWrapper,
              focusedField === "password" && styles.inputFocused,
            ]}
          >
            <MaterialIcons
              name="lock"
              size={21}
              color={
                focusedField === "password"
                  ? "#2563EB"
                  : "#94A3B8"
              }
            />

            <TextInput
              placeholder="Create a password"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={hidePassword}
              style={styles.input}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField("")}
            />

            <TouchableOpacity
              onPress={() => setHidePassword(!hidePassword)}
              style={styles.eyeButton}
            >
              <MaterialIcons
                name={
                  hidePassword
                    ? "visibility"
                    : "visibility-off"
                }
                size={21}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>

          {/* Password requirement */}
          <View style={styles.requirementRow}>
            <MaterialIcons
              name={
                passwordLengthValid
                  ? "check-circle"
                  : "radio-button-unchecked"
              }
              size={17}
              color={
                passwordLengthValid
                  ? "#22C55E"
                  : "#94A3B8"
              }
            />

            <Text
              style={[
                styles.requirementText,
                passwordLengthValid &&
                  styles.requirementTextGood,
              ]}
            >
              At least 6 characters
            </Text>
          </View>

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password</Text>

          <View
            style={[
              styles.inputWrapper,
              focusedField === "confirmPassword" &&
                styles.inputFocused,
              confirmPassword.length > 0 &&
                password !== confirmPassword &&
                styles.inputError,
            ]}
          >
            <MaterialIcons
              name="lock-outline"
              size={21}
              color={
                focusedField === "confirmPassword"
                  ? "#2563EB"
                  : "#94A3B8"
              }
            />

            <TextInput
              placeholder="Confirm your password"
              placeholderTextColor="#94A3B8"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={hideConfirmPassword}
              style={styles.input}
              onFocus={() =>
                setFocusedField("confirmPassword")
              }
              onBlur={() => setFocusedField("")}
            />

            <TouchableOpacity
              onPress={() =>
                setHideConfirmPassword(
                  !hideConfirmPassword
                )
              }
              style={styles.eyeButton}
            >
              <MaterialIcons
                name={
                  hideConfirmPassword
                    ? "visibility"
                    : "visibility-off"
                }
                size={21}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>

          {confirmPassword.length > 0 && (
            <View style={styles.requirementRow}>
              <MaterialIcons
                name={
                  passwordsMatch
                    ? "check-circle"
                    : "error-outline"
                }
                size={17}
                color={
                  passwordsMatch
                    ? "#22C55E"
                    : "#EF4444"
                }
              />

              <Text
                style={[
                  styles.requirementText,
                  passwordsMatch
                    ? styles.requirementTextGood
                    : styles.requirementTextError,
                ]}
              >
                {passwordsMatch
                  ? "Passwords match"
                  : "Passwords do not match"}
              </Text>
            </View>
          )}

          {/* Role */}
          <View style={styles.roleHeader}>
            <View style={styles.sectionIcon}>
              <MaterialIcons
                name="badge"
                size={20}
                color="#7C3AED"
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                How are you joining?
              </Text>

              <Text style={styles.sectionSubtitle}>
                Choose the role that best describes you
              </Text>
            </View>
          </View>

          <View style={styles.roleContainer}>
            {roles.map((item) => {
              const selected = role === item.name;

              return (
                <TouchableOpacity
                  key={item.name}
                  activeOpacity={0.8}
                  style={[
                    styles.roleButton,
                    selected && {
                      borderColor: item.color,
                      backgroundColor: `${item.color}10`,
                    },
                  ]}
                  onPress={() => setRole(item.name)}
                >
                  <View
                    style={[
                      styles.roleIcon,
                      {
                        backgroundColor: selected
                          ? `${item.color}18`
                          : "#F8FAFC",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={23}
                      color={
                        selected
                          ? item.color
                          : "#64748B"
                      }
                    />
                  </View>

                  <View style={styles.roleInfo}>
                    <Text
                      style={[
                        styles.roleText,
                        selected && {
                          color: item.color,
                        },
                      ]}
                    >
                      {item.name}
                    </Text>

                    <Text style={styles.roleDescription}>
                      {item.description}
                    </Text>
                  </View>

                  <MaterialIcons
                    name={
                      selected
                        ? "radio-button-checked"
                        : "radio-button-unchecked"
                    }
                    size={21}
                    color={
                      selected
                        ? item.color
                        : "#CBD5E1"
                    }
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected Role Feedback */}
          <View style={styles.selectedRoleCard}>
            <MaterialIcons
              name="info-outline"
              size={20}
              color="#2563EB"
            />

            <Text style={styles.selectedRoleText}>
              You're joining as{" "}
              <Text style={styles.selectedRoleBold}>
                {role}
              </Text>
              . You can use Ubuntu Connect to connect with
              people and contribute to your community.
            </Text>
          </View>

          {/* Create Account */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.registerButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text style={styles.registerText}>
                  Creating Account...
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons
                  name="person-add"
                  size={21}
                  color="#FFFFFF"
                />

                <Text style={styles.registerText}>
                  Create Account
                </Text>

                <MaterialIcons
                  name="arrow-forward"
                  size={21}
                  color="#FFFFFF"
                />
              </>
            )}
          </TouchableOpacity>

          {/* Security Note */}
          <View style={styles.securityCard}>
            <MaterialIcons
              name="verified-user"
              size={21}
              color="#22C55E"
            />

            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>
                Your information is protected
              </Text>

              <Text style={styles.securityText}>
                Your account details are securely stored and
                used to provide your Ubuntu Connect experience.
              </Text>
            </View>
          </View>

          {/* Login */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?
            </Text>

            <TouchableOpacity
              onPress={() => navigation.navigate("Login")}
              disabled={loading}
            >
              <Text style={styles.loginLink}>
                {" "}Log in
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 35 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },

  header: {
    alignItems: "center",
    paddingTop: 12,
    marginBottom: 22,
  },

  backButton: {
    alignSelf: "flex-start",
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  logo: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#2563EB",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 5,
  },

  heading: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 340,
  },

  welcomeCard: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 18,
    padding: 16,
    marginBottom: 25,
  },

  welcomeIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  welcomeContent: {
    flex: 1,
  },

  welcomeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2563EB",
    marginBottom: 5,
  },

  welcomeText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },

  sectionIcon: {
    width: 40,
    height: 40,
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
    color: "#64748B",
    marginTop: 2,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginTop: 16,
  },

  inputWrapper: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    paddingHorizontal: 15,
  },

  inputFocused: {
    borderColor: "#2563EB",
    backgroundColor: "#FFFFFF",
  },

  inputError: {
    borderColor: "#EF4444",
  },

  input: {
    flex: 1,
    height: 54,
    paddingHorizontal: 11,
    fontSize: 15,
    color: "#1E293B",
  },

  eyeButton: {
    padding: 5,
  },

  helperError: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 3,
  },

  passwordSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  passwordStatus: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },

  passwordGood: {
    color: "#22C55E",
  },

  passwordWeak: {
    color: "#F97316",
  },

  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    marginLeft: 3,
  },

  requirementText: {
    fontSize: 12,
    color: "#94A3B8",
    marginLeft: 6,
  },

  requirementTextGood: {
    color: "#16A34A",
  },

  requirementTextError: {
    color: "#EF4444",
  },

  roleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 28,
    marginBottom: 12,
  },

  roleContainer: {
    gap: 10,
  },

  roleButton: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 12,
  },

  roleIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  roleInfo: {
    flex: 1,
  },

  roleText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "800",
  },

  roleDescription: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 3,
  },

  selectedRoleCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 14,
    padding: 13,
    marginTop: 14,
  },

  selectedRoleText: {
    flex: 1,
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 9,
  },

  selectedRoleBold: {
    color: "#166534",
    fontWeight: "800",
  },

  registerButton: {
    minHeight: 58,
    backgroundColor: "#22C55E",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 22,
    shadowColor: "#22C55E",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  disabledButton: {
    opacity: 0.7,
  },

  registerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  securityCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    padding: 14,
    marginTop: 16,
  },

  securityContent: {
    flex: 1,
    marginLeft: 10,
  },

  securityTitle: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 3,
  },

  securityText: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 17,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },

  footerText: {
    color: "#64748B",
    fontSize: 14,
  },

  loginLink: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "800",
  },
});