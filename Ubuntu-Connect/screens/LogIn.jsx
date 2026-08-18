import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";

import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

const LogIn = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(
        "Missing Information",
        "Please enter your email and password."
      );
      return;
    }

    try {
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        Alert.alert(
          "Profile Not Found",
          "Your account exists, but your profile was not found in Firestore."
        );
        return;
      }

      const userData = userDoc.data();
      const userRole = userData.role?.trim();

      if (userRole === "Admin") {
        navigation.replace("AdminDashboard");
      } else {
        navigation.replace("MainTabs");
      }
    } catch (error) {
      Alert.alert("Login Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    navigation.replace("MainTabs");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoBlue}>U</Text>
          <Text style={styles.logoGreen}>C</Text>
        </View>

        <Text style={styles.welcome}>Welcome Back</Text>

        <Text style={styles.subtitle}>
          Continue making a difference in your community
        </Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <TextInput
          placeholder="Email Address"
          placeholderTextColor="#94A3B8"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#94A3B8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity>
          <Text style={styles.forgot}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.loginButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginText}>
            {loading ? "Checking Role..." : "Login"}
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.line} />
          <Text style={styles.or}>OR</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity
          style={styles.guestButton}
          onPress={handleGuestLogin}
        >
          <Text style={styles.guestText}>Continue as Guest</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Don't have an account?
        </Text>

        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.register}> Register</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default LogIn;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },

  header: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 40,
  },

  logoContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",

    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F8FAFC",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,

    marginBottom: 20,
  },

  logoBlue: {
    fontSize: 45,
    fontWeight: "900",
    color: "#2563EB",
  },

  logoGreen: {
    fontSize: 45,
    fontWeight: "900",
    color: "#22C55E",
  },

  welcome: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },

  form: {
    flex: 1,
  },

  input: {
    height: 58,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    paddingHorizontal: 18,
    marginBottom: 16,
    fontSize: 16,
    color: "#1E293B",
  },

  forgot: {
    alignSelf: "flex-end",
    color: "#2563EB",
    fontWeight: "600",
    marginBottom: 25,
  },

  loginButton: {
    backgroundColor: "#2563EB",
    height: 58,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.7,
  },

  loginText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 28,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#CBD5E1",
  },

  or: {
    marginHorizontal: 12,
    color: "#64748B",
    fontWeight: "600",
  },

  guestButton: {
    borderWidth: 1.5,
    borderColor: "#22C55E",
    height: 58,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  guestText: {
    color: "#22C55E",
    fontWeight: "700",
    fontSize: 16,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingBottom: 30,
  },

  footerText: {
    color: "#64748B",
  },

  register: {
    color: "#22C55E",
    fontWeight: "700",
  },
});