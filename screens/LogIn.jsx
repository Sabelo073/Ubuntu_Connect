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

import { useIdTokenAuthRequest } from "expo-auth-session/providers/google";

import { makeRedirectUri } from "expo-auth-session";

import { auth, db } from "../firebaseConfig";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID =
  "849692634225-c1p7k8ntf8l2a6lrhvqqv2r38opm6umd.apps.googleusercontent.com";

const BLUE = "#2563EB";
const GREEN = "#22C55E";
const NAVY = "#0F172A";
const INK = "#1E293B";
const SLATE = "#64748B";
const MUTED = "#94A3B8";
const BORDER = "#E2E8F0";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LogIn = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const [hidePassword, setHidePassword] = useState(true);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  /*
   * GOOGLE AUTH REQUEST
   */

  const [request, response, promptAsync] = useIdTokenAuthRequest({
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
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  /*
   * CHECK ACCOUNT STATUS
   *
   * Missing status = active
   * suspended / archived = cannot enter app
   */

  const checkAccountStatus = async (user) => {
    const userRef = doc(db, "users", user.uid);

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

    const accountStatus = userData.status || "active";

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
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      showMessage(
        "Missing Information",
        "Please enter your email address and password."
      );

      return;
    }

    if (!EMAIL_PATTERN.test(cleanEmail)) {
      showMessage("Invalid Email", "Please enter a valid email address.");

      return;
    }

    try {
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      const user = userCredential.user;

      const userData = await checkAccountStatus(user);

      if (!userData) {
        return;
      }

      const userRole = userData.role?.trim();

      if (userRole === "Admin") {
        navigation.replace("AdminDashboard");
      } else {
        navigation.replace("MainTabs");
      }
    } catch (error) {
      console.log("LOGIN ERROR:", error.code, error.message);

      let errorMessage = "Unable to log in. Check your email and password.";

      if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/invalid-credential") {
        errorMessage = "The email address or password is incorrect.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage =
          "Too many login attempts were made. Please wait before trying again.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage =
          "A network error occurred. Check your internet connection.";
      }

      showMessage("Login Error", errorMessage);
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

      const idToken = result.params?.id_token;

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

      const credential = GoogleAuthProvider.credential(idToken);

      const userCredential = await signInWithCredential(auth, credential);

      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);

      const userDoc = await getDoc(userRef);

      /*
       * FIRST GOOGLE LOGIN
       * Create a basic Ubuntu Connect profile automatically.
       */

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || "",
          name: user.displayName || "Ubuntu Connect User",
          role: "User",
          photoURL: user.photoURL || "",
          provider: "google",
          status: "active",
          createdAt: serverTimestamp(),
        });
      }

      const updatedUserDoc = await getDoc(userRef);

      if (!updatedUserDoc.exists()) {
        await signOut(auth);

        showMessage(
          "Profile Error",
          "Your Ubuntu Connect profile could not be loaded."
        );

        return;
      }

      const userData = updatedUserDoc.data();

      const accountStatus = userData.status || "active";

      if (accountStatus === "suspended") {
        await signOut(auth);

        showMessage(
          "Account Suspended",
          "Your Ubuntu Connect account has been suspended. Please contact an administrator."
        );

        return;
      }

      if (accountStatus === "archived") {
        await signOut(auth);

        showMessage(
          "Account Archived",
          "Your Ubuntu Connect account has been archived. Please contact an administrator."
        );

        return;
      }

      const userRole = userData.role?.trim();

      if (userRole === "Admin") {
        navigation.replace("AdminDashboard");
      } else {
        navigation.replace("MainTabs");
      }
    } catch (error) {
      console.log("GOOGLE LOGIN ERROR:", error.code, error.message);

      let errorMessage = "Google sign in could not be completed.";

      if (error.code === "auth/network-request-failed") {
        errorMessage =
          "A network error occurred. Check your internet connection.";
      } else if (error.code === "auth/account-exists-with-different-credential") {
        errorMessage =
          "An account already exists with this email using another sign-in method.";
      } else if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Google sign in was cancelled.";
      }

      showMessage("Google Sign In Error", errorMessage);
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
      console.log("GOOGLE AUTH RESPONSE ERROR:", response);

      setGoogleLoading(false);
    }
  }, [response]);

  /*
   * FORGOT PASSWORD
   */

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      showMessage(
        "Email Required",
        "Enter your email address first, then press Forgot Password."
      );

      return;
    }

    if (!EMAIL_PATTERN.test(cleanEmail)) {
      showMessage("Invalid Email", "Please enter a valid email address.");

      return;
    }

    try {
      setResettingPassword(true);

      await sendPasswordResetEmail(auth, cleanEmail);

      showMessage(
        "Check Your Email",
        "If an Ubuntu Connect account is associated with that email address, a password-reset link has been sent. Check your inbox and spam folder."
      );
    } catch (error) {
      console.log("PASSWORD RESET ERROR:", error.code, error.message);

      let errorMessage =
        "The password-reset email could not be sent. Please try again.";

      if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage =
          "Too many reset attempts were made. Please wait before trying again.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage =
          "A network error occurred. Check your internet connection and try again.";
      }

      showMessage("Password Reset Error", errorMessage);
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

  const isBusy = loading || resettingPassword || googleLoading;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* HEADER */}

          <View style={styles.header}>
            <View style={styles.logoMark}>
              <Text style={styles.logoBlue}>U</Text>
              <Text style={styles.logoGreen}>C</Text>
            </View>

            <Text style={styles.brand}>
              <Text style={styles.brandBlue}>Ubuntu </Text>
              <Text style={styles.brandGreen}>Connect</Text>
            </Text>
          </View>

          <Text style={styles.welcome}>Welcome back</Text>

          <Text style={styles.subtitle}>
            Sign in to continue making a difference in your community.
          </Text>

          {/* FORM */}

          <View style={styles.formCard}>
            {/* EMAIL */}

            <Text style={styles.label}>Email address</Text>

            <View
              style={[
                styles.inputContainer,
                emailFocused && styles.inputFocused,
              ]}
            >
              <MaterialIcons
                name="mail-outline"
                size={20}
                color={emailFocused ? BLUE : MUTED}
              />

              <TextInput
                placeholder="you@example.com"
                placeholderTextColor={MUTED}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isBusy}
                style={styles.input}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                returnKeyType="next"
              />

              {EMAIL_PATTERN.test(email.trim()) && (
                <MaterialIcons name="check" size={18} color={GREEN} />
              )}
            </View>

            {/* PASSWORD */}

            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>

              <TouchableOpacity
                onPress={handleForgotPassword}
                disabled={isBusy}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {resettingPassword ? (
                  <View style={styles.row}>
                    <ActivityIndicator size="small" color={BLUE} />
                    <Text style={styles.resettingText}>Sending...</Text>
                  </View>
                ) : (
                  <Text style={styles.forgot}>Forgot password?</Text>
                )}
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.inputContainer,
                passwordFocused && styles.inputFocused,
              ]}
            >
              <MaterialIcons
                name="lock-outline"
                size={20}
                color={passwordFocused ? BLUE : MUTED}
              />

              <TextInput
                placeholder="Enter your password"
                placeholderTextColor={MUTED}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={hidePassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isBusy}
                style={styles.input}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <TouchableOpacity
                onPress={() => setHidePassword((current) => !current)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons
                  name={hidePassword ? "visibility-off" : "visibility"}
                  size={20}
                  color={SLATE}
                />
              </TouchableOpacity>
            </View>

            {/* LOGIN */}

            <TouchableOpacity
              style={[styles.loginButton, isBusy && styles.disabledButton]}
              onPress={handleLogin}
              disabled={isBusy}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.row}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.loginText}>Signing in...</Text>
                </View>
              ) : (
                <Text style={styles.loginText}>Log in</Text>
              )}
            </TouchableOpacity>

            {/* DIVIDER */}

            <View style={styles.dividerContainer}>
              <View style={styles.line} />
              <Text style={styles.or}>or</Text>
              <View style={styles.line} />
            </View>

            {/* GOOGLE */}

            <TouchableOpacity
              style={[styles.googleButton, isBusy && styles.disabledButton]}
              onPress={handleGoogleLogin}
              disabled={isBusy || !request}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color={INK} />
              ) : (
                <Text style={styles.googleG}>G</Text>
              )}

              <Text style={styles.googleText}>
                {googleLoading
                  ? "Connecting to Google..."
                  : "Continue with Google"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* GUEST */}

          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGuestLogin}
            disabled={isBusy}
            activeOpacity={0.7}
          >
            <Text style={styles.guestText}>Continue as guest</Text>
            <MaterialIcons name="arrow-forward" size={16} color={GREEN} />
          </TouchableOpacity>

          {/* REGISTER */}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>

            <TouchableOpacity
              onPress={() => navigation.navigate("Register")}
              disabled={isBusy}
              activeOpacity={0.7}
            >
              <Text style={styles.register}>Register</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LogIn;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },

  logoMark: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  logoBlue: {
    fontSize: 20,
    fontWeight: "800",
    color: BLUE,
    letterSpacing: -1.5,
  },

  logoGreen: {
    fontSize: 20,
    fontWeight: "800",
    color: GREEN,
    letterSpacing: -1.5,
  },

  brand: {
    marginLeft: 12,
    fontSize: 18,
  },

  brandBlue: {
    color: BLUE,
    fontWeight: "800",
  },

  brandGreen: {
    color: GREEN,
    fontWeight: "800",
  },

  welcome: {
    fontSize: 30,
    fontWeight: "800",
    color: NAVY,
    letterSpacing: -0.5,
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 26,
    fontSize: 14,
    lineHeight: 21,
    color: SLATE,
  },

  /* FORM */

  formCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 20,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },

  label: {
    color: INK,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  inputContainer: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  inputFocused: {
    borderColor: BLUE,
    backgroundColor: "#FFFFFF",
  },

  input: {
    flex: 1,
    height: "100%",
    color: INK,
    fontSize: 15,
    marginLeft: 10,
  },

  forgot: {
    color: BLUE,
    fontSize: 12,
    fontWeight: "600",
  },

  resettingText: {
    color: BLUE,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },

  /* LOGIN */

  loginButton: {
    height: 52,
    backgroundColor: BLUE,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },

  disabledButton: {
    opacity: 0.6,
  },

  loginText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 0,
  },

  /* DIVIDER */

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },

  or: {
    color: MUTED,
    fontSize: 12,
    marginHorizontal: 12,
  },

  /* GOOGLE */

  googleButton: {
    height: 52,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  googleG: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4285F4",
  },

  googleText: {
    color: INK,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 10,
  },

  /* GUEST */

  guestButton: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    paddingVertical: 6,
  },

  guestText: {
    color: "#16A34A",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 6,
  },

  /* FOOTER */

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },

  footerText: {
    color: SLATE,
    fontSize: 13,
  },

  register: {
    color: BLUE,
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 6,
  },
});