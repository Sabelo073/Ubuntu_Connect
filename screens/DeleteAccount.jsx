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

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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
        <View style={styles.errorIconContainer}>
          <MaterialIcons
            name="lock"
            size={42}
            color="#DC2626"
          />
        </View>

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
          activeOpacity={0.85}
        >
          <MaterialIcons
            name="login"
            size={19}
            color="#FFFFFF"
          />

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
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={deleting}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="arrow-back"
              size={23}
              color="#991B1B"
            />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.heading}>
              Delete Account
            </Text>

            <Text style={styles.subtitle}>
              Permanently remove your Ubuntu Connect account.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <MaterialIcons
              name="delete-outline"
              size={24}
              color="#DC2626"
            />
          </View>
        </View>

        {/* WARNING */}
        <View style={styles.warningCard}>
          <View style={styles.warningIconContainer}>
            <MaterialIcons
              name="warning"
              size={32}
              color="#DC2626"
            />
          </View>

          <View style={styles.warningBadge}>
            <MaterialIcons
              name="error-outline"
              size={14}
              color="#DC2626"
            />

            <Text style={styles.warningBadgeText}>
              PERMANENT ACTION
            </Text>
          </View>

          <Text style={styles.warningTitle}>
            This action is permanent
          </Text>

          <Text style={styles.warningText}>
            Deleting your account will permanently
            remove your Ubuntu Connect profile and
            sign you out.
          </Text>
        </View>

        {/* ACCOUNT CARD */}
        <View style={styles.accountCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <MaterialIcons
                name="manage-accounts"
                size={19}
                color="#2563EB"
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Account being deleted
              </Text>

              <Text style={styles.sectionSubtitle}>
                Confirm this is the correct account.
              </Text>
            </View>
          </View>

          <View style={styles.accountInfoRow}>
            <View style={styles.accountIcon}>
              <MaterialIcons
                name="email"
                size={18}
                color="#64748B"
              />
            </View>

            <View style={styles.accountInfoContent}>
              <Text style={styles.accountLabel}>
                Email address
              </Text>

              <Text
                style={styles.accountValue}
                numberOfLines={1}
              >
                {currentUser.email ||
                  "Email unavailable"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.accountInfoRow}>
            <View style={styles.accountIcon}>
              <MaterialIcons
                name="fingerprint"
                size={18}
                color="#64748B"
              />
            </View>

            <View style={styles.accountInfoContent}>
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
          </View>
        </View>

        {/* IDENTITY FORM */}
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.formHeaderIcon}>
              <MaterialIcons
                name="verified-user"
                size={20}
                color="#DC2626"
              />
            </View>

            <View style={styles.formHeaderContent}>
              <Text style={styles.sectionTitle}>
                Confirm your identity
              </Text>

              <Text style={styles.sectionSubtitle}>
                Security verification is required.
              </Text>
            </View>
          </View>

          <View style={styles.instructionBox}>
            <MaterialIcons
              name="security"
              size={18}
              color="#64748B"
            />

            <Text style={styles.instructions}>
              Enter your current password and type
              DELETE below to confirm this permanent
              action.
            </Text>
          </View>

          {/* PASSWORD */}
          <Text style={styles.label}>
            Current password
          </Text>

          <View style={styles.passwordContainer}>
            <MaterialIcons
              name="lock-outline"
              size={20}
              color="#64748B"
              style={styles.passwordIcon}
            />

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

          {/* DELETE CONFIRMATION */}
          <Text style={styles.confirmationLabel}>
            Type{" "}
            <Text style={styles.deleteWord}>
              DELETE
            </Text>{" "}
            to confirm
          </Text>

          <View style={styles.confirmationContainer}>
            <MaterialIcons
              name="keyboard"
              size={19}
              color="#DC2626"
              style={styles.confirmationIcon}
            />

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
          </View>

          {/* DELETE BUTTON */}
          <TouchableOpacity
            style={[
              styles.deleteButton,
              deleting &&
                styles.disabledButton,
            ]}
            onPress={requestAccountDeletion}
            disabled={deleting}
            activeOpacity={0.85}
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
              <View style={styles.buttonContent}>
                <MaterialIcons
                  name="delete"
                  size={20}
                  color="#FFFFFF"
                />

                <Text
                  style={styles.deleteButtonText}
                >
                  Permanently Delete Account
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* CANCEL */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={deleting}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="arrow-back"
              size={19}
              color="#16A34A"
            />

            <Text style={styles.cancelButtonText}>
              Keep My Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* HELP CARD */}
        <View style={styles.helpCard}>
          <View style={styles.helpIconContainer}>
            <MaterialIcons
              name="volunteer-activism"
              size={23}
              color="#16A34A"
            />
          </View>

          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>
              Changed your mind?
            </Text>

            <Text style={styles.helpText}>
              You can return to your profile without
              making any changes by selecting Keep My
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

  /* LOGIN REQUIRED */

  centerContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  errorIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    justifyContent: "center",
    alignItems: "center",
  },

  errorTitle: {
    color: "#1E293B",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 17,
  },

  errorText: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },

  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingHorizontal: 22,
    minHeight: 50,
    marginTop: 20,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 7,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 20,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
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
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  /* WARNING */

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
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: 10,
  },

  warningBadgeText: {
    color: "#DC2626",
    fontSize: 9,
    fontWeight: "900",
    marginLeft: 4,
    letterSpacing: 0.5,
  },

  warningTitle: {
    color: "#991B1B",
    fontSize: 19,
    fontWeight: "800",
  },

  warningText: {
    color: "#B91C1C",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 7,
  },

  /* ACCOUNT CARD */

  accountCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  cardHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  sectionTitle: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 3,
  },

  accountInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  accountIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  accountInfoContent: {
    flex: 1,
  },

  accountLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },

  accountValue: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 3,
  },

  userId: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 14,
  },

  /* FORM */

  formCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
  },

  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
  },

  formHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  formHeaderContent: {
    flex: 1,
  },

  instructionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 13,
    padding: 12,
    marginBottom: 18,
  },

  instructions: {
    flex: 1,
    color: "#64748B",
    fontSize: 11,
    lineHeight: 17,
    marginLeft: 8,
  },

  label: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  /* PASSWORD */

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

  passwordIcon: {
    marginLeft: 15,
  },

  passwordInput: {
    flex: 1,
    minHeight: 56,
    color: "#1E293B",
    fontSize: 14,
    paddingHorizontal: 11,
  },

  showPasswordButton: {
    width: 48,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },

  /* CONFIRMATION */

  confirmationLabel: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  deleteWord: {
    color: "#DC2626",
    fontWeight: "900",
  },

  confirmationContainer: {
    minHeight: 56,
    backgroundColor: "#FFF7F7",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  confirmationIcon: {
    marginLeft: 15,
  },

  confirmationInput: {
    flex: 1,
    minHeight: 56,
    color: "#991B1B",
    fontSize: 15,
    fontWeight: "800",
    paddingHorizontal: 11,
  },

  /* BUTTONS */

  deleteButton: {
    minHeight: 56,
    backgroundColor: "#DC2626",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#DC2626",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 3,
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
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },

  cancelButtonText: {
    color: "#16A34A",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 6,
  },

  /* HELP */

  helpCard: {
    flexDirection: "row",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 18,
    padding: 16,
  },

  helpIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  
});