import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";

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

  const roles = [
    "Donor",
    "Recipient",
    "Volunteer",
    "NGO",
  ];

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      Alert.alert("Missing Information", "Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password Error", "Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters long.");
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

      Alert.alert("Success", "Account created successfully.");

      navigation.replace("MainTabs");
    } catch (error) {
      Alert.alert("Registration Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <Text style={styles.heading}>
          Create Account
        </Text>

        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>
            🌍 Ubuntu Connect
          </Text>

          <Text style={styles.welcomeText}>
            Connect with donors, charities, volunteers, and communities to create meaningful impact together.
          </Text>
        </View>

        <Text style={styles.subtitle}>
          Join Ubuntu Connect and start making a difference.
        </Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          placeholder="Enter your full name"
          placeholderTextColor="#94A3B8"
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="Enter your email"
          placeholderTextColor="#94A3B8"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          placeholder="Enter your phone number"
          placeholderTextColor="#94A3B8"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="Create a password"
          placeholderTextColor="#94A3B8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          placeholder="Confirm password"
          placeholderTextColor="#94A3B8"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={styles.input}
        />

        <Text style={styles.label}>I am joining as</Text>

        <View style={styles.roleContainer}>
          {roles.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.roleButton,
                role === item && styles.activeRole,
              ]}
              onPress={() => setRole(item)}
            >
              <Text
                style={[
                  styles.roleText,
                  role === item && styles.activeRoleText,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.registerButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.registerText}>
            {loading ? "Creating Account..." : "Create Account"}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?
          </Text>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginLink}>
              {" "}Login
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />

      </ScrollView>
    </SafeAreaView>
  );
};

export default Register;
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
        paddingHorizontal: 24,
    },

    heading: {
        fontSize: 32,
        fontWeight: "700",
        color: "#1E293B",
        marginTop: 30,
    },

    subtitle: {
        fontSize: 15,
        color: "#64748B",
        marginTop: 8,
        marginBottom: 25,
    },

    label: {
        fontSize: 15,
        fontWeight: "600",
        color: "#334155",
        marginBottom: 8,
        marginTop: 12,
    },

    input: {
        height: 58,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 16,
        paddingHorizontal: 16,
        fontSize: 15,
        color: "#1E293B",
    },

    roleContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginTop: 5,
        marginBottom: 25,
    },

    roleButton: {
        width: "48%",
        paddingVertical: 15,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 14,
        alignItems: "center",
        marginBottom: 12,
    },

    activeRole: {
        backgroundColor: "#2563EB",
        borderColor: "#2563EB",
    },

    roleText: {
        color: "#475569",
        fontWeight: "600",
    },

    activeRoleText: {
        color: "#FFFFFF",
    },

    registerButton: {
        backgroundColor: "#22C55E",
        height: 58,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    disabledButton: {
  opacity: 0.7,
},

    registerText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },

    footer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 25,
    },

    footerText: {
        color: "#64748B",
    },

    loginLink: {
        color: "#2563EB",
        fontWeight: "700",
    },
    welcomeCard: {
        backgroundColor: "#EFF6FF",
        borderRadius: 18,
        padding: 18,
        marginBottom: 20,
    },

    welcomeTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#2563EB",
        marginBottom: 8,
    },

    welcomeText: {
        color: "#475569",
        lineHeight: 22,
    },
});