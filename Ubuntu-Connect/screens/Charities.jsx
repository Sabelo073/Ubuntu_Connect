import React from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";

const charities = [
  {
    id: 1,
    name: "Ubuntu Community Shelter",
    type: "Shelter",
    distance: "2.5 km",
    needs: "Blankets, Clothes",
  },
  {
    id: 2,
    name: "Hope Food Bank",
    type: "Food Bank",
    distance: "3.8 km",
    needs: "Food Parcels",
  },
  {
    id: 3,
    name: "Smile Children's Home",
    type: "Children's Home",
    distance: "5.1 km",
    needs: "School Supplies",
  },
];

const Charities = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Nearby Charities</Text>

        <TextInput
          placeholder="Search charities..."
          style={styles.searchInput}
        />

        {charities.map((charity) => (
          <View key={charity.id} style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.charityName}>
                {charity.name}
              </Text>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>✓ Verified</Text>
              </View>
            </View>

            <Text style={styles.type}>
              {charity.type}
            </Text>

            <Text style={styles.distance}>
              📍 {charity.distance} away
            </Text>

            <Text style={styles.needs}>
              Needs: {charity.needs}
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.viewButton}>
                <Text style={styles.viewText}>
                  View Needs
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactButton}>
                <Text style={styles.contactText}>
                  Contact
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Charities;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
  },

  heading: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 20,
    marginBottom: 20,
  },

  searchInput: {
    backgroundColor: "#FFFFFF",
    height: 55,
    borderRadius: 15,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 15,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  charityName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },

  badge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  badgeText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "700",
  },

  type: {
    marginTop: 8,
    color: "#2563EB",
    fontWeight: "600",
  },

  distance: {
    marginTop: 10,
    color: "#64748B",
  },

  needs: {
    marginTop: 8,
    color: "#475569",
    fontWeight: "500",
  },

  buttonRow: {
    flexDirection: "row",
    marginTop: 18,
  },

  viewButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 8,
  },

  viewText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  contactButton: {
    flex: 1,
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginLeft: 8,
  },

  contactText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
