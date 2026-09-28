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
  const [hideConfirmPassword, setHideConfirmPassword] =
    useState(true);

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

  const passwordLengthValid =
    password.length >= 6;

  const passwordsMatch =
    confirmPassword.length > 0 &&
    password === confirmPassword;

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

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const user = userCredential.user;

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role: role,
          createdAt: new Date(),
        }
      );

      Alert.alert(
        "Welcome to Ubuntu Connect",
        "Your account has been created successfully. Let's get started!",
        [
          {
            text: "Continue",
            onPress: () =>
              navigation.replace("MainTabs"),
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
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.scrollContent
          }
        >
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="arrow-back"
                size={21}
                color="#1E293B"
              />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoBlue}>
                  U
                </Text>

                <Text style={styles.logoGreen}>
                  C
                </Text>
              </View>

              <View style={styles.logoDot} />
            </View>

            <Text style={styles.heading}>
              Create Your Account
            </Text>

            <Text style={styles.subtitle}>
              Join Ubuntu Connect and become part
              of a community that helps people make
              a difference.
            </Text>
          </View>

          {/* FORM CARD */}
          <View style={styles.formCard}>
            {/* FORM HEADER */}
            <View style={styles.formHeader}>
              <View style={styles.formHeaderIcon}>
                <MaterialIcons
                  name="person-add"
                  size={21}
                  color="#22C55E"
                />
              </View>

              <View style={styles.formHeaderText}>
                <Text style={styles.formTitle}>
                  Create account
                </Text>

                <Text style={styles.formSubtitle}>
                  Enter your details below to get started.
                </Text>
              </View>
            </View>

            {/* FULL NAME */}
            <Text style={styles.label}>
              Full Name
            </Text>

            <View
              style={[
                styles.inputContainer,
                focusedField === "fullName" &&
                  styles.inputFocused,
              ]}
            >
              <View
                style={[
                  styles.inputIconContainer,
                  focusedField === "fullName" &&
                    styles.inputIconFocused,
                ]}
              >
                <MaterialIcons
                  name="person"
                  size={20}
                  color={
                    focusedField === "fullName"
                      ? "#2563EB"
                      : "#64748B"
                  }
                />
              </View>

              <TextInput
                placeholder="Enter your full name"
                placeholderTextColor="#94A3B8"
                value={fullName}
                onChangeText={setFullName}
                style={styles.input}
                onFocus={() =>
                  setFocusedField("fullName")
                }
                onBlur={() =>
                  setFocusedField("")
                }
                autoCapitalize="words"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="next"
              />

              {fullName.trim().length >= 2 && (
                <MaterialIcons
                  name="check-circle"
                  size={18}
                  color="#22C55E"
                />
              )}
            </View>

            {/* EMAIL */}
            <Text style={styles.label}>
              Email address
            </Text>

            <View
              style={[
                styles.inputContainer,
                focusedField === "email" &&
                  styles.inputFocused,
                email.length > 0 &&
                  !isEmailValid &&
                  styles.inputError,
              ]}
            >
              <View
                style={[
                  styles.inputIconContainer,
                  focusedField === "email" &&
                    styles.inputIconFocused,
                ]}
              >
                <MaterialIcons
                  name="email"
                  size={20}
                  color={
                    focusedField === "email"
                      ? "#2563EB"
                      : "#64748B"
                  }
                />
              </View>

              <TextInput
                placeholder="Enter your email"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                onFocus={() =>
                  setFocusedField("email")
                }
                onBlur={() =>
                  setFocusedField("")
                }
                editable={!loading}
                returnKeyType="next"
              />

              {email.length > 0 && (
                <MaterialIcons
                  name={
                    isEmailValid
                      ? "check-circle"
                      : "info-outline"
                  }
                  size={18}
                  color={
                    isEmailValid
                      ? "#22C55E"
                      : "#94A3B8"
                  }
                />
              )}
            </View>

            {email.length > 0 &&
              !isEmailValid && (
                <Text style={styles.helperError}>
                  Please enter a valid email address.
                </Text>
              )}

            {/* PHONE */}
            <Text style={styles.label}>
              Phone Number
            </Text>

            <View
              style={[
                styles.inputContainer,
                focusedField === "phone" &&
                  styles.inputFocused,
              ]}
            >
              <View
                style={[
                  styles.inputIconContainer,
                  focusedField === "phone" &&
                    styles.inputIconFocused,
                ]}
              >
                <MaterialIcons
                  name="phone"
                  size={20}
                  color={
                    focusedField === "phone"
                      ? "#2563EB"
                      : "#64748B"
                  }
                />
              </View>

              <TextInput
                placeholder="Enter your phone number"
                placeholderTextColor="#94A3B8"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={styles.input}
                onFocus={() =>
                  setFocusedField("phone")
                }
                onBlur={() =>
                  setFocusedField("")
                }
                editable={!loading}
                returnKeyType="next"
              />

              {phone.trim().length >= 7 && (
                <MaterialIcons
                  name="check-circle"
                  size={18}
                  color="#22C55E"
                />
              )}
            </View>

            {/* PASSWORD */}
            <View
              style={styles.passwordHeader}
            >
              <Text style={styles.label}>
                Password
              </Text>

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
                styles.inputContainer,
                focusedField === "password" &&
                  styles.inputFocused,
              ]}
            >
              <View
                style={[
                  styles.inputIconContainer,
                  focusedField === "password" &&
                    styles.inputIconFocused,
                ]}
              >
                <MaterialIcons
                  name="lock-outline"
                  size={20}
                  color={
                    focusedField === "password"
                      ? "#2563EB"
                      : "#64748B"
                  }
                />
              </View>

              <TextInput
                placeholder="Create a password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={hidePassword}
                style={styles.input}
                onFocus={() =>
                  setFocusedField("password")
                }
                onBlur={() =>
                  setFocusedField("")
                }
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="next"
              />

              <TouchableOpacity
                onPress={() =>
                  setHidePassword(
                    (current) => !current
                  )
                }
                style={styles.visibilityButton}
                disabled={loading}
              >
                <MaterialIcons
                  name={
                    hidePassword
                      ? "visibility"
                      : "visibility-off"
                  }
                  size={20}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            {/* PASSWORD REQUIREMENT */}
            <View
              style={styles.requirementRow}
            >
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

            {/* CONFIRM PASSWORD */}
            <Text style={styles.label}>
              Confirm Password
            </Text>

            <View
              style={[
                styles.inputContainer,
                focusedField ===
                  "confirmPassword" &&
                  styles.inputFocused,
                confirmPassword.length > 0 &&
                  password !== confirmPassword &&
                  styles.inputError,
              ]}
            >
              <View
                style={[
                  styles.inputIconContainer,
                  focusedField ===
                    "confirmPassword" &&
                    styles.inputIconFocused,
                ]}
              >
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={
                    focusedField ===
                    "confirmPassword"
                      ? "#2563EB"
                      : "#64748B"
                  }
                />
              </View>

              <TextInput
                placeholder="Confirm your password"
                placeholderTextColor="#94A3B8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={
                  hideConfirmPassword
                }
                style={styles.input}
                onFocus={() =>
                  setFocusedField(
                    "confirmPassword"
                  )
                }
                onBlur={() =>
                  setFocusedField("")
                }
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={
                  handleRegister
                }
              />

              <TouchableOpacity
                onPress={() =>
                  setHideConfirmPassword(
                    (current) => !current
                  )
                }
                style={styles.visibilityButton}
                disabled={loading}
              >
                <MaterialIcons
                  name={
                    hideConfirmPassword
                      ? "visibility"
                      : "visibility-off"
                  }
                  size={20}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            {confirmPassword.length > 0 && (
              <View
                style={styles.requirementRow}
              >
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

            {/* ROLE HEADER */}
            <View style={styles.roleHeader}>
              <View style={styles.roleHeaderIcon}>
                <MaterialIcons
                  name="badge"
                  size={21}
                  color="#7C3AED"
                />
              </View>

              <View
                style={styles.roleHeaderText}
              >
                <Text style={styles.formTitle}>
                  How are you joining?
                </Text>

                <Text style={styles.formSubtitle}>
                  Choose the role that best describes you.
                </Text>
              </View>
            </View>

            {/* ROLES */}
            <View style={styles.roleContainer}>
              {roles.map((item) => {
                const selected =
                  role === item.name;

                return (
                  <TouchableOpacity
                    key={item.name}
                    activeOpacity={0.8}
                    disabled={loading}
                    style={[
                      styles.roleButton,
                      selected && {
                        borderColor:
                          item.color,
                        backgroundColor:
                          `${item.color}10`,
                      },
                    ]}
                    onPress={() =>
                      setRole(item.name)
                    }
                  >
                    <View
                      style={[
                        styles.roleIcon,
                        {
                          backgroundColor:
                            selected
                              ? `${item.color}18`
                              : "#F8FAFC",
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={item.icon}
                        size={22}
                        color={
                          selected
                            ? item.color
                            : "#64748B"
                        }
                      />
                    </View>

                    <View
                      style={styles.roleInfo}
                    >
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

                      <Text
                        style={
                          styles.roleDescription
                        }
                      >
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

            {/* SELECTED ROLE */}
            <View
              style={styles.selectedRoleCard}
            >
              <MaterialIcons
                name="info-outline"
                size={19}
                color="#2563EB"
              />

              <Text
                style={styles.selectedRoleText}
              >
                You're joining as{" "}
                <Text
                  style={styles.selectedRoleBold}
                >
                  {role}
                </Text>
                . You can use Ubuntu Connect
                to connect with people and
                contribute to your community.
              </Text>
            </View>

            {/* CREATE ACCOUNT */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.registerButton,
                loading &&
                  styles.disabledButton,
              ]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <View
                  style={styles.buttonContent}
                >
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                  <Text
                    style={styles.registerText}
                  >
                    Creating Account...
                  </Text>
                </View>
              ) : (
                <View
                  style={styles.buttonContent}
                >
                  <MaterialIcons
                    name="person-add"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={styles.registerText}
                  >
                    Create Account
                  </Text>

                  <MaterialIcons
                    name="arrow-forward"
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* SECURITY */}
          <View style={styles.securityCard}>
            <View style={styles.securityIcon}>
              <MaterialIcons
                name="verified-user"
                size={21}
                color="#2563EB"
              />
            </View>

            <View
              style={styles.securityContent}
            >
              <Text
                style={styles.securityTitle}
              >
                Your information is protected
              </Text>

              <Text
                style={styles.securityText}
              >
                Your account details are securely
                stored and protected by Firebase
                Authentication.
              </Text>
            </View>
          </View>

          {/* LOGIN FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?
            </Text>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Login")
              }
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLink}>
                Log in
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 30 }} />
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
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 40,
  },

  /* HEADER */

  header: {
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  logoContainer: {
    position: "relative",
    marginBottom: 17,
  },

  logoCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  logoBlue: {
    fontSize: 39,
    fontWeight: "900",
    color: "#2563EB",
  },

  logoGreen: {
    fontSize: 39,
    fontWeight: "900",
    color: "#22C55E",
  },

  logoDot: {
    position: "absolute",
    right: 2,
    bottom: 5,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: "#F8FAFC",
  },

  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 7,
  },

  subtitle: {
    maxWidth: 335,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
  },

  /* FORM CARD */

  formCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 23,
    padding: 20,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 9,
    elevation: 3,
  },

  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 21,
  },

  formHeaderIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  formHeaderText: {
    flex: 1,
  },

  formTitle: {
    color: "#1E293B",
    fontSize: 18,
    fontWeight: "800",
  },

  formSubtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 3,
  },

  /* LABELS */

  label: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  /* INPUT */

  inputContainer: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 15,
    marginBottom: 17,
    paddingRight: 10,
  },

  inputFocused: {
    borderColor: "#2563EB",
    backgroundColor: "#FFFFFF",
  },

  inputError: {
    borderColor: "#EF4444",
  },

  inputIconContainer: {
    width: 39,
    height: 39,
    borderRadius: 11,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 7,
    marginRight: 5,
  },

  inputIconFocused: {
    backgroundColor: "#EFF6FF",
  },

  input: {
    flex: 1,
    minHeight: 54,
    color: "#1E293B",
    fontSize: 14,
    paddingHorizontal: 9,
  },

  visibilityButton: {
    width: 38,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
  },

  helperError: {
    color: "#EF4444",
    fontSize: 11,
    marginTop: -10,
    marginBottom: 9,
    marginLeft: 3,
  },

  /* PASSWORD */

  passwordHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  passwordStatus: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
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
    marginTop: -7,
    marginBottom: 10,
    marginLeft: 3,
  },

  requirementText: {
    fontSize: 11,
    color: "#94A3B8",
    marginLeft: 6,
  },

  requirementTextGood: {
    color: "#16A34A",
  },

  requirementTextError: {
    color: "#EF4444",
  },

  /* ROLE */

  roleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 16,
  },

  roleHeaderIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#F5F3FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  roleHeaderText: {
    flex: 1,
  },

  roleContainer: {
    gap: 10,
  },

  roleButton: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    padding: 11,
  },

  roleIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  roleInfo: {
    flex: 1,
  },

  roleText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800",
  },

  roleDescription: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 3,
  },

  selectedRoleCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 14,
    padding: 13,
    marginTop: 14,
  },

  selectedRoleText: {
    flex: 1,
    color: "#475569",
    fontSize: 11,
    lineHeight: 17,
    marginLeft: 9,
  },

  selectedRoleBold: {
    color: "#1E40AF",
    fontWeight: "800",
  },

  /* REGISTER BUTTON */

  registerButton: {
    minHeight: 57,
    backgroundColor: "#22C55E",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#22C55E",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 3,
  },

  disabledButton: {
    opacity: 0.65,
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  registerText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginHorizontal: 8,
  },

  /* SECURITY */

  securityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 17,
    padding: 14,
    marginTop: 15,
  },

  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    color: "#1E40AF",
    fontSize: 12,
    fontWeight: "800",
  },

  securityText: {
    color: "#3B82F6",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },

  /* FOOTER */

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },

  footerText: {
    color: "#64748B",
    fontSize: 13,
  },

  loginLink: {
    color: "#22C55E",
    fontWeight: "800",
    fontSize: 13,
    marginLeft: 5,
  },
});