import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import * as WebBrowser from "expo-web-browser";

import {
  useIdTokenAuthRequest,
} from "expo-auth-session/providers/google";

import {
  makeRedirectUri,
} from "expo-auth-session";

import { auth, db } from "../firebaseConfig";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID =
  "849692634225-c1p7k8ntf8l2a6lrhvqqv2r38opm6umd.apps.googleusercontent.com";

const LogIn = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [resettingPassword, setResettingPassword] =
    useState(false);

  const [hidePassword, setHidePassword] =
    useState(true);

  const [emailFocused, setEmailFocused] =
    useState(false);

  const [passwordFocused, setPasswordFocused] =
    useState(false);

  /*
   * GOOGLE AUTH REQUEST
   */

  const [request, response, promptAsync] =
    useIdTokenAuthRequest({
      clientId: GOOGLE_WEB_CLIENT_ID,

      redirectUri: makeRedirectUri({
        scheme: "ubuntuconnect",
        path: "oauth",
      }),
    });

  /*
   * MESSAGE
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
   * CHECK ACCOUNT STATUS
   *
   * Missing status = active
   *
   * suspended = cannot enter app
   * archived = cannot enter app
   * active = allowed to continue
   */

  const checkAccountStatus = async (user) => {
    const userRef = doc(
      db,
      "users",
      user.uid
    );

    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await signOut(auth);

      showMessage(
        "Profile Not Found",
        "Your account exists, but your profile was not found in Ubuntu Connect."
      );

      return null;
    }

    const userData = userDoc.data();

    const accountStatus =
      userData.status || "active";

    if (accountStatus === "suspended") {
      await signOut(auth);

      showMessage(
        "Account Suspended",
        "Your Ubuntu Connect account has been suspended. Please contact an administrator."
      );

      return null;
    }

    if (accountStatus === "archived") {
      await signOut(auth);

      showMessage(
        "Account Archived",
        "Your Ubuntu Connect account has been archived. Please contact an administrator."
      );

      return null;
    }

    return userData;
  };

  /*
   * EMAIL LOGIN
   */

  const handleLogin = async () => {
    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      showMessage(
        "Missing Information",
        "Please enter your email address and password."
      );

      return;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      showMessage(
        "Invalid Email",
        "Please enter a valid email address."
      );

      return;
    }

    try {
      setLoading(true);

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      const user = userCredential.user;

      /*
       * CHECK ACCOUNT STATUS
       */

      const userData =
        await checkAccountStatus(user);

      if (!userData) {
        return;
      }

      const userRole =
        userData.role?.trim();

      /*
       * NAVIGATION
       */

      if (userRole === "Admin") {
        navigation.replace(
          "AdminDashboard"
        );
      } else {
        navigation.replace(
          "MainTabs"
        );
      }

    } catch (error) {
      console.log(
        "LOGIN ERROR:",
        error.code,
        error.message
      );

      let errorMessage =
        "Unable to log in. Check your email and password.";

      if (
        error.code ===
        "auth/invalid-email"
      ) {
        errorMessage =
          "Please enter a valid email address.";

      } else if (
        error.code ===
        "auth/invalid-credential"
      ) {
        errorMessage =
          "The email address or password is incorrect.";

      } else if (
        error.code ===
        "auth/too-many-requests"
      ) {
        errorMessage =
          "Too many login attempts were made. Please wait before trying again.";

      } else if (
        error.code ===
        "auth/network-request-failed"
      ) {
        errorMessage =
          "A network error occurred. Check your internet connection.";
      }

      showMessage(
        "Login Error",
        errorMessage
      );

    } finally {
      setLoading(false);
    }
  };

  /*
   * GOOGLE LOGIN / SIGN UP
   */

  const handleGoogleLogin = async () => {
    if (!request) {
      showMessage(
        "Google Sign In",
        "Google Sign In is still loading. Please try again."
      );

      return;
    }

    try {
      setGoogleLoading(true);

      const result = await promptAsync();

      if (result?.type !== "success") {
        if (result?.type !== "cancel") {
          showMessage(
            "Google Sign In",
            "Google sign in could not be completed."
          );
        }

        setGoogleLoading(false);

        return;
      }

      const idToken =
        result.params?.id_token;

      if (!idToken) {
        showMessage(
          "Google Sign In Error",
          "Google did not return the required authentication token."
        );

        return;
      }

      /*
       * Convert Google token into Firebase credential
       */

      const credential =
        GoogleAuthProvider.credential(
          idToken
        );

      const userCredential =
        await signInWithCredential(
          auth,
          credential
        );

      const user =
        userCredential.user;

      /*
       * Check whether a Firestore profile exists
       */

      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const userDoc =
        await getDoc(userRef);

      /*
       * FIRST GOOGLE LOGIN
       *
       * Create a basic Ubuntu Connect
       * profile automatically.
       */

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: user.uid,

          email:
            user.email || "",

          name:
            user.displayName ||
            "Ubuntu Connect User",

          role: "User",

          photoURL:
            user.photoURL || "",

          provider: "google",

          status: "active",

          createdAt:
            serverTimestamp(),
        });
      }

      /*
       * GET LATEST PROFILE
       */

      const updatedUserDoc =
        await getDoc(userRef);

      if (!updatedUserDoc.exists()) {
        await signOut(auth);

        showMessage(
          "Profile Error",
          "Your Ubuntu Connect profile could not be loaded."
        );

        return;
      }

      const userData =
        updatedUserDoc.data();

      /*
       * CHECK ACCOUNT STATUS
       */

      const accountStatus =
        userData.status || "active";

      if (
        accountStatus === "suspended"
      ) {
        await signOut(auth);

        showMessage(
          "Account Suspended",
          "Your Ubuntu Connect account has been suspended. Please contact an administrator."
        );

        return;
      }

      if (
        accountStatus === "archived"
      ) {
        await signOut(auth);

        showMessage(
          "Account Archived",
          "Your Ubuntu Connect account has been archived. Please contact an administrator."
        );

        return;
      }

      /*
       * NAVIGATE ACCORDING TO ROLE
       */

      const userRole =
        userData.role?.trim();

      if (userRole === "Admin") {
        navigation.replace(
          "AdminDashboard"
        );
      } else {
        navigation.replace(
          "MainTabs"
        );
      }

    } catch (error) {
      console.log(
        "GOOGLE LOGIN ERROR:",
        error.code,
        error.message
      );

      let errorMessage =
        "Google sign in could not be completed.";

      if (
        error.code ===
        "auth/network-request-failed"
      ) {
        errorMessage =
          "A network error occurred. Check your internet connection.";

      } else if (
        error.code ===
        "auth/account-exists-with-different-credential"
      ) {
        errorMessage =
          "An account already exists with this email using another sign-in method.";

      } else if (
        error.code ===
        "auth/popup-closed-by-user"
      ) {
        errorMessage =
          "Google sign in was cancelled.";
      }

      showMessage(
        "Google Sign In Error",
        errorMessage
      );

    } finally {
      setGoogleLoading(false);
    }
  };

  /*
   * GOOGLE RESPONSE LISTENER
   */

  useEffect(() => {
    if (!response) {
      return;
    }

    if (response.type === "error") {
      console.log(
        "GOOGLE AUTH RESPONSE ERROR:",
        response
      );

      setGoogleLoading(false);
    }
  }, [response]);

  /*
   * FORGOT PASSWORD
   */

  const handleForgotPassword = async () => {
    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      showMessage(
        "Email Required",
        "Enter your email address first, then press Forgot Password."
      );

      return;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      showMessage(
        "Invalid Email",
        "Please enter a valid email address."
      );

      return;
    }

    try {
      setResettingPassword(true);

      await sendPasswordResetEmail(
        auth,
        cleanEmail
      );

      showMessage(
        "Check Your Email",
        "If an Ubuntu Connect account is associated with that email address, a password-reset link has been sent. Check your inbox and spam folder."
      );

    } catch (error) {
      console.log(
        "PASSWORD RESET ERROR:",
        error.code,
        error.message
      );

      let errorMessage =
        "The password-reset email could not be sent. Please try again.";

      if (
        error.code ===
        "auth/invalid-email"
      ) {
        errorMessage =
          "Please enter a valid email address.";

      } else if (
        error.code ===
        "auth/too-many-requests"
      ) {
        errorMessage =
          "Too many reset attempts were made. Please wait before trying again.";

      } else if (
        error.code ===
        "auth/network-request-failed"
      ) {
        errorMessage =
          "A network error occurred. Check your internet connection and try again.";
      }

      showMessage(
        "Password Reset Error",
        errorMessage
      );

    } finally {
      setResettingPassword(false);
    }
  };

  /*
   * GUEST
   */

  const handleGuestLogin = () => {
    showMessage(
      "Guest Access Coming Soon",
      "Guest access is not available yet. Please log in or create an account."
    );
  };

  const isBusy =
    loading ||
    resettingPassword ||
    googleLoading;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
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

            <Text style={styles.welcome}>
              Welcome Back
            </Text>

            <Text style={styles.subtitle}>
              Sign in to continue making a
              difference in your community.
            </Text>
          </View>

          {/* LOGIN CARD */}

          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View
                style={styles.formHeaderIcon}
              >
                <MaterialIcons
                  name="lock-open"
                  size={21}
                  color="#7C3AED"
                />
              </View>

              <View
                style={styles.formHeaderText}
              >
                <Text style={styles.formTitle}>
                  Sign in
                </Text>

                <Text
                  style={styles.formSubtitle}
                >
                  Enter your account details
                  below.
                </Text>
              </View>
            </View>

            {/* EMAIL */}

            <Text style={styles.label}>
              Email address
            </Text>

            <View style={styles.inputContainer}>
              <View
                style={[
                  styles.inputIconContainer,
                  emailFocused &&
                    styles.inputIconFocused,
                ]}
              >
                <MaterialIcons
                  name="email"
                  size={20}
                  color={
                    emailFocused
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
                editable={!isBusy}
                style={styles.input}
                onFocus={() =>
                  setEmailFocused(true)
                }
                onBlur={() =>
                  setEmailFocused(false)
                }
                returnKeyType="next"
              />

              {email.length > 0 && (
                <MaterialIcons
                  name={
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                      email.trim()
                    )
                      ? "check-circle"
                      : "info-outline"
                  }
                  size={18}
                  color={
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                      email.trim()
                    )
                      ? "#22C55E"
                      : "#94A3B8"
                  }
                />
              )}
            </View>

            {/* PASSWORD */}

            <Text style={styles.label}>
              Password
            </Text>

            <View style={styles.inputContainer}>
              <View
                style={[
                  styles.inputIconContainer,
                  passwordFocused &&
                    styles.inputIconFocused,
                ]}
              >
                <MaterialIcons
                  name="lock-outline"
                  size={20}
                  color={
                    passwordFocused
                      ? "#2563EB"
                      : "#64748B"
                  }
                />
              </View>

              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={hidePassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isBusy}
                style={styles.input}
                onFocus={() =>
                  setPasswordFocused(true)
                }
                onBlur={() =>
                  setPasswordFocused(false)
                }
                returnKeyType="done"
                onSubmitEditing={
                  handleLogin
                }
              />

              <TouchableOpacity
                style={styles.visibilityButton}
                onPress={() =>
                  setHidePassword(
                    (current) => !current
                  )
                }
                activeOpacity={0.7}
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

            {/* FORGOT PASSWORD */}

            <TouchableOpacity
              style={styles.forgotButton}
              onPress={handleForgotPassword}
              disabled={isBusy}
              activeOpacity={0.7}
            >
              {resettingPassword ? (
                <View
                  style={
                    styles.resetLoadingContainer
                  }
                >
                  <ActivityIndicator
                    size="small"
                    color="#2563EB"
                  />

                  <Text
                    style={styles.resettingText}
                  >
                    Sending reset link...
                  </Text>
                </View>
              ) : (
                <View
                  style={styles.forgotContent}
                >
                  <MaterialIcons
                    name="lock-reset"
                    size={17}
                    color="#2563EB"
                  />

                  <Text
                    style={styles.forgot}
                  >
                    Forgot Password?
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* LOGIN */}

            <TouchableOpacity
              style={[
                styles.loginButton,
                isBusy &&
                  styles.disabledButton,
              ]}
              onPress={handleLogin}
              disabled={isBusy}
              activeOpacity={0.85}
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
                    style={styles.loginText}
                  >
                    Signing In...
                  </Text>
                </View>
              ) : (
                <View
                  style={styles.buttonContent}
                >
                  <MaterialIcons
                    name="login"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={styles.loginText}
                  >
                    Login
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* DIVIDER */}

            <View
              style={styles.dividerContainer}
            >
              <View style={styles.line} />

              <View style={styles.orContainer}>
                <Text style={styles.or}>
                  OR
                </Text>
              </View>

              <View style={styles.line} />
            </View>

            {/* GOOGLE */}

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={
                isBusy || !request
              }
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#1E293B"
                />
              ) : (
                <View
                  style={styles.googleIcon}
                >
                  <Text
                    style={styles.googleG}
                  >
                    G
                  </Text>
                </View>
              )}

              <Text
                style={styles.googleText}
              >
                {googleLoading
                  ? "Connecting to Google..."
                  : "Continue with Google"}
              </Text>
            </TouchableOpacity>

            {/* GUEST */}

            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleGuestLogin}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="person-outline"
                size={20}
                color="#22C55E"
              />

              <Text
                style={styles.guestText}
              >
                Continue as Guest
              </Text>

              <MaterialIcons
                name="chevron-right"
                size={20}
                color="#22C55E"
              />
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
                Your account is secure
              </Text>

              <Text
                style={styles.securityText}
              >
                Your login details are protected
                by Firebase Authentication.
              </Text>
            </View>
          </View>

          {/* REGISTER */}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?
            </Text>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate(
                  "Register"
                )
              }
              disabled={isBusy}
              activeOpacity={0.7}
            >
              <Text style={styles.register}>
                Register
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LogIn;

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
    paddingTop: 25,
    paddingBottom: 40,
  },

  /* HEADER */

  header: {
    alignItems: "center",
    marginBottom: 25,
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

  welcome: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 7,
  },

  subtitle: {
    maxWidth: 330,
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
    backgroundColor: "#F5F3FF",
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

  /* FORGOT */

  forgotButton: {
    alignSelf: "flex-end",
    minHeight: 30,
    justifyContent: "center",
    marginTop: -5,
    marginBottom: 16,
  },

  forgotContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  forgot: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 5,
  },

  resetLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  resettingText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 7,
  },

  /* LOGIN */

  loginButton: {
    minHeight: 57,
    backgroundColor: "#7C3AED",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#7C3AED",
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

  loginText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 8,
  },

  /* DIVIDER */

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },

  orContainer: {
    paddingHorizontal: 11,
  },

  or: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
  },

  /* GOOGLE */

  googleButton: {
    minHeight: 55,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  googleIcon: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  googleG: {
    fontSize: 20,
    fontWeight: "900",
    color: "#4285F4",
  },

  googleText: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "800",
  },

  /* GUEST */

  guestButton: {
    minHeight: 55,
    borderWidth: 1.5,
    borderColor: "#22C55E",
    backgroundColor: "#F0FDF4",
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  guestText: {
    color: "#16A34A",
    fontWeight: "800",
    fontSize: 14,
    marginLeft: 7,
    marginRight: 5,
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

  register: {
    color: "#22C55E",
    fontWeight: "800",
    fontSize: 13,
    marginLeft: 5,
  },
});