import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebaseConfig";

const Home = ({ navigation }) => {
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const donationsQuery = query(
      collection(db, "donations"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsubscribeDonations = onSnapshot(
      donationsQuery,
      (snapshot) => {
        const donationList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setDonations(donationList);
      },
      (error) => {
        console.log("DONATIONS ERROR:", error.message);
      }
    );

    const requestsQuery = query(
      collection(db, "requests"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsubscribeRequests = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const requestList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRequests(requestList);
      },
      (error) => {
        console.log("REQUESTS ERROR:", error.message);
      }
    );

    return () => {
      unsubscribeDonations();
      unsubscribeRequests();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good Evening 👋</Text>
          <Text style={styles.name}>Sabelo</Text>
        </View>

        {/* Impact Card */}
        <View style={styles.impactCard}>
          <Text style={styles.cardTitle}>Community Activity</Text>

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{donations.length}</Text>
              <Text style={styles.statText}>Donations</Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statNumber}>{requests.length}</Text>
              <Text style={styles.statText}>Requests</Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statText}>Volunteer Hours</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Donate")}
          >
            <Text style={styles.actionEmoji}>🎁</Text>
            <Text style={styles.actionText}>Donate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("RequestHelp")}
          >
            <Text style={styles.actionEmoji}>🙏</Text>
            <Text style={styles.actionText}>Request</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Campaigns")}
          >
            <Text style={styles.actionEmoji}>📢</Text>
            <Text style={styles.actionText}>Campaigns</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Charities")}
          >
            <Text style={styles.actionEmoji}>🤝</Text>
            <Text style={styles.actionText}>Charities</Text>
          </TouchableOpacity>
        </View>

        {/* Urgent Need */}
        <Text style={styles.sectionTitle}>Urgent Needs</Text>

        <View style={styles.needCard}>
          <Text style={styles.needTitle}>
            🧥 Winter Blankets Needed
          </Text>

          <Text style={styles.needLocation}>
            Johannesburg Community Shelter
          </Text>

          <TouchableOpacity
            style={styles.donateBtn}
            onPress={() => navigation.navigate("Donate")}
          >
            <Text style={styles.donateBtnText}>Donate Now</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Donations */}
        <Text style={styles.sectionTitle}>Recent Donations</Text>

        {donations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No donations submitted yet.
            </Text>
          </View>
        ) : (
          donations.map((donation) => (
            <View key={donation.id} style={styles.donationCard}>
              {donation.imageBase64 ? (
                <Image
                  source={{
                    uri: `data:image/jpeg;base64,${donation.imageBase64}`,
                  }}
                  style={styles.donationImage}
                />
              ) : (
                <View style={styles.noImageBox}>
                  <Text style={styles.noImageText}>🎁 No image added</Text>
                </View>
              )}

              <View style={styles.donationTopRow}>
                <Text style={styles.donationTitle}>
                  🎁 {donation.itemName}
                </Text>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {donation.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.donationCategory}>
                {donation.category} • {donation.condition}
              </Text>

              <Text
                style={styles.donationDescription}
                numberOfLines={2}
              >
                {donation.description}
              </Text>

              <Text style={styles.donationLocation}>
                📍 {donation.address}
              </Text>

              <Text style={styles.donationMethod}>
                Method: {donation.deliveryMethod}
              </Text>
            </View>
          ))
        )}

        {/* Recent Help Requests */}
        <Text style={styles.sectionTitle}>Recent Help Requests</Text>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No help requests submitted yet.
            </Text>
          </View>
        ) : (
          requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestTopRow}>
                <Text style={styles.requestTitle}>
                  🙏 {request.itemNeeded}
                </Text>

                <View
                  style={[
                    styles.requestBadge,
                    request.urgency === "Urgent" && styles.urgentBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.requestBadgeText,
                      request.urgency === "Urgent" && styles.urgentBadgeText,
                    ]}
                  >
                    {request.urgency}
                  </Text>
                </View>
              </View>

              <Text style={styles.requestCategory}>
                {request.category} • Quantity: {request.quantity}
              </Text>

              <Text
                style={styles.requestDescription}
                numberOfLines={2}
              >
                {request.description}
              </Text>

              <Text style={styles.requestLocation}>
                📍 {request.location}
              </Text>

              <Text style={styles.requestStatus}>
                Status: {request.status}
              </Text>
            </View>
          ))
        )}

        {/* Nearby Charities */}
        <Text style={styles.sectionTitle}>Nearby Charities</Text>

        <View style={styles.charityCard}>
          <Text style={styles.charityName}>
            Ubuntu Community Center
          </Text>
          <Text style={styles.charityAddress}>
            2.5 km away
          </Text>
        </View>

        <View style={styles.charityCard}>
          <Text style={styles.charityName}>Hope Foundation</Text>
          <Text style={styles.charityAddress}>
            4.1 km away
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 20,
  },

  greeting: {
    color: "#64748B",
    fontSize: 16,
  },

  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 3,
  },

  impactCard: {
    backgroundColor: "#2563EB",
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    marginBottom: 25,
  },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  stat: {
    alignItems: "center",
    flex: 1,
  },

  statNumber: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },

  statText: {
    color: "#E2E8F0",
    marginTop: 5,
    fontSize: 12,
    textAlign: "center",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginHorizontal: 20,
    marginBottom: 15,
  },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 25,
  },

  actionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 25,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 12,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },

  actionEmoji: {
    fontSize: 30,
  },

  actionText: {
    marginTop: 10,
    fontWeight: "600",
    color: "#1E293B",
  },

  needCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
  },

  needTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },

  needLocation: {
    color: "#64748B",
    marginTop: 10,
    marginBottom: 15,
  },

  donateBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },

  donateBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  donationCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  donationImage: {
    width: "100%",
    height: 170,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: "#E2E8F0",
  },

  noImageBox: {
    width: "100%",
    height: 120,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },

  noImageText: {
    color: "#64748B",
    fontWeight: "600",
  },

  donationTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  donationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
    marginRight: 8,
  },

  donationCategory: {
    color: "#2563EB",
    fontWeight: "600",
    marginBottom: 6,
  },

  donationDescription: {
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 8,
  },

  donationLocation: {
    color: "#475569",
    marginBottom: 4,
  },

  donationMethod: {
    color: "#64748B",
    fontSize: 13,
  },

  statusBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  statusText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "700",
  },

  requestCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },

  requestTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  requestTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
    marginRight: 8,
  },

  requestCategory: {
    color: "#2563EB",
    fontWeight: "600",
    marginBottom: 6,
  },

  requestDescription: {
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 8,
  },

  requestLocation: {
    color: "#475569",
    marginBottom: 4,
  },

  requestStatus: {
    color: "#64748B",
    fontSize: 13,
  },

  requestBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  requestBadgeText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },

  urgentBadge: {
    backgroundColor: "#FEE2E2",
  },

  urgentBadgeText: {
    color: "#DC2626",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },

  emptyText: {
    color: "#64748B",
    fontWeight: "500",
  },

  charityCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 18,
    borderRadius: 18,
  },

  charityName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },

  charityAddress: {
    marginTop: 4,
    color: "#64748B",
  },
});