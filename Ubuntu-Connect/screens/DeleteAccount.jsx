import React, { useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";

import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

import {
  deleteDoc,
  doc,
} from "firebase/firestore";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import { auth, db } from "../firebaseConfig";

function DeleteAccount({ navigation }) {
  const [password, setPassword] = useState("");
  const [confirmationText, setConfirmationText] =
    useState("");

  const [hidePassword, setHidePassword] =
    useState(true);

  const [deleting, setDeleting] =
    useState(false);

  const currentUser = auth.currentUser;

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

  const performAccountDeletion = async () => {
    const user = auth.currentUser;

    if (!user) {
      showMessage(
        "Login Required",
        "Please log in before deleting your account."
      );

      navigation.replace("Login");
      return;
    }

    if (!user.email) {
      showMessage(
        "Account Error",
        "Your account does not have a valid email address."
      );

      return;
    }

    const cleanPassword = password.trim();

    if (!cleanPassword) {
      showMessage(
        "Password Required",
        "Enter your current password to continue."
      );

      return;
    }

    if (
      confirmationText
        .trim()
        .toUpperCase() !== "DELETE"
    ) {
      showMessage(
        "Confirmation Required",
        'Type "DELETE" in the confirmation field.'
      );

      return;
    }

    try {
      setDeleting(true);

      const credential =
        EmailAuthProvider.credential(
          user.email,
          cleanPassword
        );

      await reauthenticateWithCredential(
        user,
        credential
      );

      /*
        Delete the Firestore profile before deleting
        Firebase Authentication.

        After the Auth account is deleted, the user
        will no longer have permission to delete the
        Firestore profile.
      */
      await deleteDoc(
        doc(db, "users", user.uid)
      );

      await deleteUser(user);

      setPassword("");
      setConfirmationText("");

      showMessage(
        "Account Deleted",
        "Your Ubuntu Connect account has been deleted."
      );

      navigation.reset({
        index: 0,
        routes: [
          {
            name: "Login",
          },
        ],
      });
    } catch (error) {
      console.log(
        "DELETE ACCOUNT ERROR:",
        error.code,
        error.message
      );

      let errorMessage =
        "Your account could not be deleted. Please try again.";

      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        errorMessage =
          "The password you entered is incorrect.";
      } else if (
        error.code === "auth/requires-recent-login"
      ) {
        errorMessage =
          "For security reasons, log out, log in again, and then retry account deletion.";
      } else if (
        error.code === "auth/too-many-requests"
      ) {
        errorMessage =
          "Too many attempts were made. Please wait before trying again.";
      } else if (
        error.code ===
        "auth/network-request-failed"
      ) {
        errorMessage =
          "A network problem occurred. Check your internet connection and try again.";
      } else if (
        error.code === "permission-denied"
      ) {
        errorMessage =
          "Firestore blocked profile deletion. Check and deploy your user deletion security rule.";
      }

      showMessage(
        "Delete Account Error",
        errorMessage
      );
    } finally {
      setDeleting(false);
    }
  };

  const requestAccountDeletion = () => {
    if (!currentUser) {
      showMessage(
        "Login Required",
        "Please log in before deleting your account."
      );

      navigation.replace("Login");
      return;
    }

    if (!password.trim()) {
      showMessage(
        "Password Required",
        "Enter your current password."
      );

      return;
    }

    if (
      confirmationText
        .trim()
        .toUpperCase() !== "DELETE"
    ) {
      showMessage(
        "Confirmation Required",
        'Type "DELETE" exactly before continuing.'
      );

      return;
    }

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined"
    ) {
      const confirmed = window.confirm(
        "This action is permanent. Are you absolutely sure you want to delete your Ubuntu Connect account?"
      );

      if (confirmed) {
        performAccountDeletion();
      }

      return;
    }

    Alert.alert(
      "Permanently Delete Account?",
      "This action cannot be undone. Your Ubuntu Connect profile will be permanently removed.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: performAccountDeletion,
        },
      ]
    );
  };

  if (!currentUser) {
    return (
      <SafeAreaView
        style={styles.centerContainer}
      >
        <Text style={styles.errorIcon}>
          🔐
        </Text>

        <Text style={styles.errorTitle}>
          Login Required
        </Text>

        <Text style={styles.errorText}>
          Please log in before managing your
          account.
        </Text>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() =>
            navigation.replace("Login")
          }
        >
          <Text style={styles.loginButtonText}>
            Go to Login
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={deleting}
          >
            <Text style={styles.backButtonText}>
              ‹
            </Text>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.heading}>
              Delete Account
            </Text>

            <Text style={styles.subtitle}>
              Permanently remove your Ubuntu
              Connect account.
            </Text>
          </View>
        </View>

        <View style={styles.warningCard}>
          <View style={styles.warningIconContainer}>
            <Text style={styles.warningIcon}>
              ⚠️
            </Text>
          </View>

          <Text style={styles.warningTitle}>
            This action is permanent
          </Text>

          <Text style={styles.warningText}>
            After account deletion, you will no
            longer be able to log in using this
            Ubuntu Connect account.
          </Text>
        </View>

        <View style={styles.accountCard}>
          <Text style={styles.sectionTitle}>
            Account being deleted
          </Text>

          <Text style={styles.accountLabel}>
            Email address
          </Text>

          <Text style={styles.accountValue}>
            {currentUser.email ||
              "Email unavailable"}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.accountLabel}>
            User ID
          </Text>

          <Text
            style={styles.userId}
            numberOfLines={1}
          >
            {currentUser.uid}
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>
            Confirm your identity
          </Text>

          <Text style={styles.instructions}>
            Enter your current account password.
          </Text>

          <Text style={styles.label}>
            Current password
          </Text>

          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={hidePassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleting}
              style={styles.passwordInput}
            />

            <TouchableOpacity
              style={styles.showPasswordButton}
              onPress={() =>
                setHidePassword(
                  (current) => !current
                )
              }
              disabled={deleting}
            >
              <Text
                style={styles.showPasswordText}
              >
                {hidePassword ? "Show" : "Hide"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.confirmationLabel}>
            Type{" "}
            <Text style={styles.deleteWord}>
              DELETE
            </Text>{" "}
            to confirm
          </Text>

          <TextInput
            placeholder="Type DELETE"
            placeholderTextColor="#94A3B8"
            value={confirmationText}
            onChangeText={setConfirmationText}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!deleting}
            style={styles.confirmationInput}
          />

          <TouchableOpacity
            style={[
              styles.deleteButton,
              deleting &&
                styles.disabledButton,
            ]}
            onPress={requestAccountDeletion}
            disabled={deleting}
          >
            {deleting ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text
                  style={styles.deleteButtonText}
                >
                  Deleting Account...
                </Text>
              </View>
            ) : (
              <Text
                style={styles.deleteButtonText}
              >
                Permanently Delete Account
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={deleting}
          >
            <Text style={styles.cancelButtonText}>
              Keep My Account
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpCard}>
          <Text style={styles.helpIcon}>
            🌱
          </Text>

          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>
              Changed your mind?
            </Text>

            <Text style={styles.helpText}>
              You can return to your profile without
              making any changes by pressing Keep My
              Account.
            </Text>
          </View>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default DeleteAccount;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    paddingHorizontal: 20,
  },

  centerContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 22,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  backButtonText: {
    color: "#991B1B",
    fontSize: 32,
    lineHeight: 34,
  },

  headerTextContainer: {
    flex: 1,
  },

  heading: {
    color: "#991B1B",
    fontSize: 27,
    fontWeight: "800",
  },

  subtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 3,
  },

  warningCard: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 22,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },

  warningIconContainer: {
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 13,
  },

  warningIcon: {
    fontSize: 31,
  },

  warningTitle: {
    color: "#991B1B",
    fontSize: 19,
    fontWeight: "800",
  },

  warningText: {
    color: "#B91C1C",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
  },

  accountCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 19,
    padding: 18,
    marginBottom: 16,
  },

  sectionTitle: {
    color: "#1E293B",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 17,
  },

  accountLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },

  accountValue: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 5,
  },

  userId: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 5,
  },

  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 14,
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
  },

  instructions: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    marginTop: -8,
    marginBottom: 18,
  },

  label: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },

  passwordContainer: {
    minHeight: 56,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  passwordInput: {
    flex: 1,
    minHeight: 56,
    color: "#1E293B",
    fontSize: 15,
    paddingHorizontal: 16,
  },

  showPasswordButton: {
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: 15,
  },

  showPasswordText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },

  confirmationLabel: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },

  deleteWord: {
    color: "#DC2626",
    fontWeight: "900",
  },

  confirmationInput: {
    minHeight: 56,
    backgroundColor: "#FFF7F7",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 15,
    color: "#991B1B",
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  deleteButton: {
    minHeight: 56,
    backgroundColor: "#DC2626",
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

  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 8,
  },

  cancelButton: {
    minHeight: 52,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },

  cancelButtonText: {
    color: "#16A34A",
    fontSize: 15,
    fontWeight: "800",
  },

  helpCard: {
    flexDirection: "row",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 17,
    padding: 16,
  },

  helpIcon: {
    fontSize: 23,
    marginRight: 12,
  },

  helpContent: {
    flex: 1,
  },

  helpTitle: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "800",
  },

  helpText: {
    color: "#15803D",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  errorIcon: {
    fontSize: 55,
  },

  errorTitle: {
    color: "#1E293B",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 15,
  },

  errorText: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },

  loginButton: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 13,
    marginTop: 20,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});