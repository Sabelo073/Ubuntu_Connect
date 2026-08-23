import React from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";

const campaigns = [
  {
    id: 1,
    title: "Winter Warmth Drive",
    organization: "Ubuntu Shelter",
    urgent: true,
    goal: "500 Blankets",
    progress: "320 Collected",
  },
  {
    id: 2,
    title: "School Supply Campaign",
    organization: "Smile Children's Home",
    urgent: false,
    goal: "100 School Kits",
    progress: "68 Collected",
  },
  {
    id: 3,
    title: "Flood Relief Support",
    organization: "Hope Foundation",
    urgent: true,
    goal: "300 Food Parcels",
    progress: "140 Collected",
  },
];

const Campaigns = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <Text style={styles.heading}>
          Community Campaigns
        </Text>

        <Text style={styles.subtitle}>
          Support causes making a difference
        </Text>

        {campaigns.map((campaign) => (
          <View key={campaign.id} style={styles.card}>
            
            {campaign.urgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>
                  🚨 Urgent
                </Text>
              </View>
            )}

            <Text style={styles.title}>
              {campaign.title}
            </Text>

            <Text style={styles.organization}>
              {campaign.organization}
            </Text>

            <View style={styles.statsContainer}>
              <View>
                <Text style={styles.label}>Goal</Text>
                <Text style={styles.value}>
                  {campaign.goal}
                </Text>
              </View>

              <View>
                <Text style={styles.label}>Progress</Text>
                <Text style={styles.value}>
                  {campaign.progress}
                </Text>
              </View>
            </View>

            <View style={styles.progressBar}>
              <View style={styles.progressFill} />
            </View>

            <TouchableOpacity style={styles.supportButton}>
              <Text style={styles.supportText}>
                Support Campaign
              </Text>
            </TouchableOpacity>

          </View>
        ))}

        <View style={{ height: 40 }} />

      </ScrollView>
    </SafeAreaView>
  );
};

export default Campaigns;
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
  },

  subtitle: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 25,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },

  urgentBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },

  urgentText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 12,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },

  organization: {
    color: "#2563EB",
    fontWeight: "600",
    marginBottom: 20,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  label: {
    color: "#64748B",
    fontSize: 13,
  },

  value: {
    color: "#1E293B",
    fontWeight: "700",
    fontSize: 15,
    marginTop: 4,
  },

  progressBar: {
    height: 10,
    width: "100%",
    backgroundColor: "#E2E8F0",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
  },

  progressFill: {
    width: "65%",
    height: "100%",
    backgroundColor: "#22C55E",
    borderRadius: 20,
  },

  supportButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },

  supportText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
