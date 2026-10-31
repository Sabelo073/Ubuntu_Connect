import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  addDoc,
  arrayUnion,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { useNavigation } from "@react-navigation/native";

function dateTime(value) {
  if (!value) return "Not recorded";
  try {
    const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "Not recorded";
    return date.toLocaleString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Not recorded";
  }
}

export default function RecipientConfirmations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const navigation = useNavigation();

  /* Space taken by the phone's system buttons / gesture bar.
     When this screen sits inside the tab bar, the tab bar already
     handles it, so only add the inset when there is no tab bar. */
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const bottomPadding = tabBarHeight
    ? 28
    : Math.max(insets.bottom, 8) + 28;

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setError("Please sign in with the recipient account assigned to the donation.");
      setLoading(false);
      return;
    }

    console.log("Logged-in recipient UID:", user.uid);

    const recipientQuery = query(
      collection(db, "donations"),
      where("recipientId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      recipientQuery,
      (snapshot) => {
        console.log("Matching donations:", snapshot.size);

        const rows = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        console.log("Recipient donations:", rows);

        rows.sort((a, b) => {
          const dateA = a.collectedAt?.toMillis?.() || 0;
          const dateB = b.collectedAt?.toMillis?.() || 0;
          return dateB - dateA;
        });

        setDonations(rows);
        setLoading(false);
        setError("");
      },
      (listenerError) => {
        console.error("Recipient donation listener error:", listenerError);
        setError(
          "Unable to load assigned donations. Check your Firestore rules and try again."
        );
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const completeReceipt = async (donation) => {
    const user = auth.currentUser;
    if (!user || user.uid !== donation.recipientId) {
      Alert.alert("Not authorised", "Only the assigned recipient can confirm this donation.");
      return;
    }
    if (String(donation.status || "").toLowerCase() !== "collected") {
      Alert.alert("Not ready to confirm", "The donation must be recorded as Collected before you can confirm receipt.");
      return;
    }

    const proceed = async () => {
      setProcessingId(donation.id);

      try {
        // Step 1: Confirm receipt on the donation document.
        await updateDoc(doc(db, "donations", donation.id), {
          status: "Completed",
          receivedAt: serverTimestamp(),
          receivedConfirmedBy: user.uid,
          verificationStatus: "Verified",
          statusUpdatedAt: serverTimestamp(),
          statusHistory: arrayUnion({
            previousStatus: "Collected",
            newStatus: "Completed",
            changedBy: user.uid,
            changedAt: new Date(),
            note: "Receipt confirmed by the assigned recipient in the app.",
          }),
        });

        // Step 2: Create a notification separately.
        if (donation.userId) {
          try {
            await addDoc(collection(db, "notifications"), {
              userId: donation.userId,
              title: "Donation received",
              message: `The recipient confirmed receiving your donation "${donation.itemName || "donation"}".`,
              type: "donation",
              read: false,
              createdAt: serverTimestamp(),
            });
          } catch (notificationError) {
            console.error(
              "Receipt saved, but notification failed:",
              notificationError.code,
              notificationError.message
            );
          }
        }

        // The donation update succeeded.
        Alert.alert(
          "Receipt confirmed",
          "Thank you. The donation is now marked Completed."
        );
      } catch (updateError) {
        console.error(
          "Receipt confirmation failed:",
          updateError.code,
          updateError.message
        );

        Alert.alert(
          "Could not confirm receipt",
          `${updateError.code || "Error"}: ${updateError.message || "Please try again."}`
        );
      } finally {
        setProcessingId(null);
      }
    };

    const message = `Confirm that you have actually received "${donation.itemName || "this donation"}"? Only confirm if the item is in your possession.`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(message)) await proceed();
    } else {
      Alert.alert("Confirm receipt", message, [
        { text: "Not yet", style: "cancel" },
        { text: "Yes, I received it", onPress: proceed },
      ]);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right"]}
    >
      <TouchableOpacity
  onPress={() => navigation.navigate("MyActivity")}
  style={{
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  }}
>
  <Text style={{ fontSize: 16, fontWeight: "bold" }}>
    ← Back to My Activity
  </Text>
</TouchableOpacity>
      {/* Dark icons (time, battery, wifi, sim) on the light status area */}
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Recipient Confirmations</Text>
            <Text style={styles.subtitle}>Confirm only donations that you have physically received.</Text>
          </View>
          <MaterialIcons name="verified-user" size={30} color="#2563EB" />
        </View>

        <View style={styles.notice}>
          <MaterialIcons name="shield" size={21} color="#1D4ED8" />
          <Text style={styles.noticeText}>Your signed-in account must match the recipient UID assigned by the administrator. Collection alone does not mean delivery is complete.</Text>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /><Text style={styles.muted}>Loading assigned donations...</Text></View>
        ) : error ? (
          <View style={styles.empty}><Text style={styles.error}>{error}</Text></View>
        ) : donations.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="inventory-2" size={42} color="#94A3B8" />
            <Text style={styles.cardTitle}>No donations assigned</Text>
            <Text style={styles.muted}>When an administrator assigns a donation to your account, it will appear here.</Text>
          </View>
        ) : donations.map((donation) => {
          const normalizedStatus = String(donation.status || "Pending").toLowerCase();
          const isCollected = normalizedStatus === "collected";
          const isCompleted = normalizedStatus === "completed";
          const isApproved = normalizedStatus === "approved";
          return (
            <View key={donation.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.itemIcon}><MaterialIcons name="volunteer-activism" size={23} color="#2563EB" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{donation.itemName || "Donation item"}</Text>
                  <Text style={styles.muted}>{donation.category || "Uncategorised"}</Text>
                </View>
                <View style={[styles.statusPill, isCompleted ? styles.statusComplete : isCollected ? styles.statusCollected : styles.statusOther]}>
                  <Text style={styles.statusText}>{donation.status || "Pending"}</Text>
                </View>
              </View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Delivery method</Text><Text style={styles.infoValue}>{donation.fulfillmentMethod || donation.deliveryMethod || "Not specified"}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Handover recorded</Text><Text style={styles.infoValue}>{dateTime(donation.collectedAt)}</Text></View>
              {donation.handoverActorName ? <View style={styles.infoRow}><Text style={styles.infoLabel}>Delivered / handed over by</Text><Text style={styles.infoValue}>{donation.handoverActorName}</Text></View> : null}
              {donation.handoverEvidence ? <Text style={styles.evidence}>Handover notes: {donation.handoverEvidence}</Text> : null}
              {isCompleted ? (
                <View style={styles.confirmedBox}><MaterialIcons name="check-circle" size={20} color="#15803D" /><View style={{ flex: 1 }}><Text style={styles.confirmedTitle}>Receipt confirmed</Text><Text style={styles.muted}>Confirmed on {dateTime(donation.receivedAt)}.</Text></View></View>
              ) : isCollected ? (
                <TouchableOpacity style={[styles.confirmButton, processingId === donation.id && styles.disabled]} onPress={() => completeReceipt(donation)} disabled={processingId === donation.id}>
                  {processingId === donation.id ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name="task-alt" size={19} color="#FFFFFF" />}
                  <Text style={styles.confirmButtonText}>{processingId === donation.id ? "Saving..." : "Confirm I received this donation"}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.waitingBox}>
                  <MaterialIcons name="schedule" size={19} color="#92400E" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.waitingTitle}>
                      {isApproved ? "Waiting for handover" : "Receipt confirmation not available yet"}
                    </Text>
                    <Text style={styles.waitingText}>
                      {isApproved
                        ? "The administrator must record the physical handover first. Once the donation status changes to Collected, this screen will show the Confirm Receipt button automatically."
                        : "You can confirm receipt after the administrator records the handover and the donation status changes to Collected."}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 18, paddingBottom: 35 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#64748B", fontSize: 13, lineHeight: 19, marginTop: 5 },
  notice: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: "#DBEAFE", borderRadius: 13, padding: 13, marginBottom: 18 },
  noticeText: { flex: 1, color: "#1E40AF", fontSize: 12, lineHeight: 18 },
  center: { alignItems: "center", padding: 35 },
  muted: { color: "#64748B", fontSize: 12, lineHeight: 18, marginTop: 5 },
  empty: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, padding: 25, alignItems: "center" },
  error: { color: "#B91C1C", fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, padding: 15, marginBottom: 13 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  itemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center" },
  cardTitle: { color: "#0F172A", fontSize: 15, fontWeight: "800", marginTop: 5 },
  statusPill: { borderRadius: 20, paddingVertical: 6, paddingHorizontal: 9 },
  statusComplete: { backgroundColor: "#DCFCE7" },
  statusCollected: { backgroundColor: "#CFFAFE" },
  statusOther: { backgroundColor: "#F1F5F9" },
  statusText: { color: "#334155", fontSize: 11, fontWeight: "800" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingVertical: 9 },
  infoLabel: { color: "#64748B", fontSize: 12, flex: 1 },
  infoValue: { color: "#0F172A", fontSize: 12, fontWeight: "600", flex: 1, textAlign: "right" },
  evidence: { color: "#475569", fontSize: 12, lineHeight: 18, backgroundColor: "#F8FAFC", borderRadius: 9, padding: 10, marginTop: 5 },
  confirmButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, backgroundColor: "#15803D", padding: 13, borderRadius: 11, marginTop: 13 },
  confirmButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  disabled: { opacity: 0.6 },
  confirmedBox: { flexDirection: "row", gap: 9, alignItems: "center", backgroundColor: "#DCFCE7", padding: 12, borderRadius: 10, marginTop: 12 },
  confirmedTitle: { color: "#166534", fontWeight: "800", fontSize: 13 },
  waitingBox: { flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: "#FEF3C7", borderRadius: 9, padding: 12, marginTop: 12 },
  waitingTitle: { color: "#92400E", fontSize: 13, fontWeight: "800", marginBottom: 4 },
  waitingText: { color: "#92400E", fontSize: 12, lineHeight: 18 },
});