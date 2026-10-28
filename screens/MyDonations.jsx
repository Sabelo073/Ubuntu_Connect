
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

const FILTERS = [
  "All",
  "Pending",
  "Approved",
  "In Progress",
  "Completed",
  "Rejected",
];

const STATUS_COLORS = {
  pending: "#D97706",
  approved: "#2563EB",
  "in progress": "#7C3AED",
  completed: "#16A34A",
  rejected: "#DC2626",
  cancelled: "#64748B",
  collected: "#0891B2",
};

function normalizeStatus(status) {
  return String(status || "Pending")
    .trim()
    .toLowerCase();
}

function displayStatus(status) {
  const value = normalizeStatus(status);

  return value.replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

function getStatusColor(status) {
  return STATUS_COLORS[normalizeStatus(status)] || "#64748B";
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  try {
    const date = value?.toDate
      ? value.toDate()
      : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Date unavailable";
  }
}

// Treat common status variations consistently.
function getTimelineStage(status) {
  const value = normalizeStatus(status);

  if (value === "rejected" || value === "cancelled") {
    return -1;
  }

  if (value === "completed" || value === "received") {
    return 3;
  }

  if (
    value === "in progress" ||
    value === "collected" ||
    value === "out for delivery"
  ) {
    return 2;
  }

  if (
    value === "approved" ||
    value === "accepted"
  ) {
    return 1;
  }

  return 0;
}

const TIMELINE_STEPS = [
  {
    title: "Submitted",
    description: "Your donation has been submitted.",
  },
  {
    title: "Approved",
    description: "The donation has been reviewed.",
  },
  {
    title: "In Progress",
    description: "Collection or delivery is underway.",
  },
  {
    title: "Completed",
    description: "The donation has been received.",
  },
];

function StatusBadge({ status }) {
  const color = getStatusColor(status);

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: color + "18",
          borderColor: color + "45",
        },
      ]}
    >
      <View
        style={[styles.statusDot, { backgroundColor: color }]}
      />
      <Text style={[styles.statusText, { color }]}>
        {displayStatus(status)}
      </Text>
    </View>
  );
}


function DonationTimeline({ status }) {
  const stage = getTimelineStage(status);
  const isClosed = ["rejected", "cancelled", "canceled"].includes(
    normalizeStatus(status)
  );

  return (
    <View style={styles.timeline}>
      {TIMELINE_STEPS.map((step, index) => {
        const completed = !isClosed && index <= stage;
        const current = !isClosed && index === stage;

        return (
          <View key={step.title} style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View
                style={[
                  styles.timelineCircle,
                  completed && styles.timelineCircleDone,
                  current && styles.timelineCircleCurrent,
                ]}
              >
                {completed ? (
                  <MaterialIcons
                    name="check"
                    size={14}
                    color="#FFFFFF"
                  />
                ) : (
                  <View
                    style={[
                      styles.timelineInnerDot,
                      current && styles.timelineInnerDotCurrent,
                    ]}
                  />
                )}
              </View>

              {index < TIMELINE_STEPS.length - 1 ? (
                <View
                  style={[
                    styles.timelineLine,
                    completed &&
                      index < stage &&
                      styles.timelineLineDone,
                  ]}
                />
              ) : null}
            </View>

            <View style={styles.timelineContent}>
              <Text
                style={[
                  styles.timelineTitle,
                  completed && styles.timelineTitleDone,
                ]}
              >
                {step.title}
                {current ? "  •  Current stage" : ""}
              </Text>

              <Text style={styles.timelineDescription}>
                {step.description}
              </Text>
            </View>
          </View>
        );
      })}

      {isClosed ? (
        <View style={styles.closedStatusBox}>
          <MaterialIcons
            name="info-outline"
            size={19}
            color={getStatusColor(status)}
          />

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.timelineTitle,
                { color: getStatusColor(status) },
              ]}
            >
              {displayStatus(status)}
            </Text>

            <Text style={styles.timelineDescription}>
              {normalizeStatus(status) === "rejected"
                ? "This donation was not accepted. Contact the admin for more information."
                : "This donation is no longer active."}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}


function StatCard({ title, count, icon, color }) {
  return (
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIcon,
          { backgroundColor: color + "18" },
        ]}
      >
        <MaterialIcons name={icon} size={23} color={color} />
      </View>

      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  );
}

export default function MyDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDonation, setSelectedDonation] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setDonations([]);
      setLoading(false);
      setError("Please sign in to view your donations.");
      return;
    }

    setLoading(true);
    setError("");

    const donationsQuery = query(
      collection(db, "donations"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      donationsQuery,
      (snapshot) => {
        const results = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        results.sort((a, b) => {
          const dateA = a.createdAt?.toMillis
            ? a.createdAt.toMillis()
            : new Date(a.createdAt || 0).getTime();

          const dateB = b.createdAt?.toMillis
            ? b.createdAt.toMillis()
            : new Date(b.createdAt || 0).getTime();

          return dateB - dateA;
        });

        setDonations(results);
        setLoading(false);
      },
      (err) => {
        console.error("My donations listener error:", err);
        setError("Unable to load donations. Please try again.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const categories = useMemo(() => {
    const unique = [
      ...new Set(
        donations
          .map((item) => String(item.category || "").trim())
          .filter(Boolean)
      ),
    ];

    return ["All", ...unique.sort()];
  }, [donations]);

  const stats = useMemo(() => {
    return {
      total: donations.length,

      pending: donations.filter(
        (item) => normalizeStatus(item.status) === "pending"
      ).length,

      inProgress: donations.filter((item) =>
        ["approved", "accepted", "in progress", "collected",
          "out for delivery"].includes(normalizeStatus(item.status))
      ).length,

      completed: donations.filter((item) =>
        ["completed", "received"].includes(normalizeStatus(item.status))
      ).length,
    };
  }, [donations]);

  const filteredDonations = useMemo(() => {
    const term = search.trim().toLowerCase();

    return donations.filter((item) => {
      const matchesSearch =
        !term ||
        String(item.itemName || "").toLowerCase().includes(term) ||
        String(item.category || "").toLowerCase().includes(term);

      const matchesStatus =
        selectedStatus === "All" ||
        normalizeStatus(item.status) ===
          normalizeStatus(selectedStatus);

      const matchesCategory =
        selectedCategory === "All" ||
        String(item.category || "") === selectedCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [donations, search, selectedStatus, selectedCategory]);

  const closeDetails = () => setSelectedDonation(null);

  const imageUri = selectedDonation?.imageBase64
    ? selectedDonation.imageBase64.startsWith("data:")
      ? selectedDonation.imageBase64
      : `data:image/jpeg;base64,${selectedDonation.imageBase64}`
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heading}>My Donations</Text>
            <Text style={styles.subtitle}>
              Track your contributions to the community.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <MaterialIcons
              name="volunteer-activism"
              size={28}
              color="#2563EB"
            />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Total"
            count={stats.total}
            icon="inventory-2"
            color="#2563EB"
          />
          <StatCard
            title="Pending"
            count={stats.pending}
            icon="schedule"
            color="#D97706"
          />
          <StatCard
            title="In Progress"
            count={stats.inProgress}
            icon="local-shipping"
            color="#7C3AED"
          />
          <StatCard
            title="Completed"
            count={stats.completed}
            icon="check-circle"
            color="#16A34A"
          />
        </View>

        <View style={styles.searchBox}>
          <MaterialIcons
            name="search"
            size={23}
            color="#64748B"
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search item name or category..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            returnKeyType="search"
          />

          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <MaterialIcons
                name="close"
                size={21}
                color="#64748B"
              />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.filterHeading}>Filter by status</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((filter) => {
            const active = selectedStatus === filter;

            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  active && styles.filterChipActive,
                ]}
                onPress={() => setSelectedStatus(filter)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.filterHeading}>Filter by category</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {categories.map((category) => {
            const active = selectedCategory === category;

            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterChip,
                  active && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.listHeadingRow}>
          <Text style={styles.sectionTitle}>Your donations</Text>
          <Text style={styles.resultCount}>
            {filteredDonations.length} found
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.stateText}>
              Loading your donations...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="error-outline"
              size={42}
              color="#DC2626"
            />
            <Text style={styles.emptyTitle}>Something went wrong</Text>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : filteredDonations.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="inventory-2"
              size={46}
              color="#94A3B8"
            />
            <Text style={styles.emptyTitle}>
              {donations.length === 0
                ? "No donations yet"
                : "No matching donations"}
            </Text>
            <Text style={styles.stateText}>
              {donations.length === 0
                ? "Items you donate will appear here."
                : "Try a different search or filter."}
            </Text>

            {donations.length > 0 && (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSearch("");
                  setSelectedStatus("All");
                  setSelectedCategory("All");
                }}
              >
                <Text style={styles.resetButtonText}>
                  Clear filters
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredDonations.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              style={styles.donationCard}
              onPress={() => setSelectedDonation(item)}
            >
              <View style={styles.cardTop}>
                <View style={styles.itemIcon}>
                  <MaterialIcons
                    name="volunteer-activism"
                    size={25}
                    color="#2563EB"
                  />
                </View>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.itemName || "Unnamed donation"}
                  </Text>
                  <Text style={styles.itemCategory}>
                    {item.category || "Uncategorised"}
                  </Text>
                </View>

                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color="#94A3B8"
                />
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardMetaRow}>
                <MaterialIcons
                  name="calendar-today"
                  size={16}
                  color="#64748B"
                />
                <Text style={styles.cardMetaText}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>

              <View style={styles.cardBottom}>
                <StatusBadge status={item.status} />
                <Text style={styles.detailsHint}>View details</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={!!selectedDonation}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeDetails}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeading}>Donation Details</Text>
            <TouchableOpacity
              onPress={closeDetails}
              style={styles.closeButton}
              accessibilityLabel="Close donation details"
            >
              <MaterialIcons
                name="close"
                size={24}
                color="#0F172A"
              />
            </TouchableOpacity>
          </View>

          {selectedDonation && (
            <ScrollView
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.detailImage}
                  resizeMode="cover"
                  onError={() =>
                    console.warn("Could not load donation image")
                  }
                />
              ) : (
                <View style={styles.detailImagePlaceholder}>
                  <MaterialIcons
                    name="volunteer-activism"
                    size={50}
                    color="#2563EB"
                  />
                </View>
              )}

              <Text style={styles.detailItemName}>
                {selectedDonation.itemName || "Unnamed donation"}
              </Text>

              <StatusBadge status={selectedDonation.status} />

              <Text style={styles.detailSectionHeading}>
                Donation progress
              </Text>
              <DonationTimeline status={selectedDonation.status} />

              <Text style={styles.detailSectionHeading}>
                Item information
              </Text>

              <DetailRow
                label="Category"
                value={selectedDonation.category}
              />
              <DetailRow
                label="Condition"
                value={selectedDonation.condition}
              />
              <DetailRow
                label="Date submitted"
                value={formatDate(selectedDonation.createdAt)}
              />
              <DetailRow
                label="Delivery method"
                value={selectedDonation.deliveryMethod}
              />
              <DetailRow
                label="Address"
                value={selectedDonation.address}
              />

              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>
                {selectedDonation.description ||
                  "No description provided."}
              </Text>

              <Text style={styles.recordId}>
                Donation reference: {selectedDonation.id}
              </Text>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={closeDetails}
              >
                <Text style={styles.doneButtonText}>Close details</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>
        {value ? String(value) : "Not provided"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  screen: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 35,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  heading: {
    fontSize: 27,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 5,
    lineHeight: 19,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  statCard: {
    width: "48.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 10,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statCount: {
    fontSize: 25,
    fontWeight: "800",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 13,
    minHeight: 51,
  },
  searchInput: {
    flex: 1,
    color: "#0F172A",
    fontSize: 14,
    paddingVertical: 12,
    paddingHorizontal: 9,
  },
  filterHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginTop: 19,
    marginBottom: 10,
  },
  filterRow: {
    gap: 8,
    paddingRight: 5,
  },
  filterChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterChipText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  listHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 25,
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  resultCount: {
    fontSize: 12,
    color: "#64748B",
  },
  donationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 15,
    marginBottom: 13,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  itemCategory: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 13,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  cardMetaText: {
    fontSize: 12,
    color: "#64748B",
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 13,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  detailsHint: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "700",
  },
  centerState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 17,
    padding: 25,
    alignItems: "center",
    marginTop: 5,
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },
  stateText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 7,
  },
  resetButton: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 15,
  },
  resetButtonText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "700",
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  modalHeading: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 35,
  },
  detailImage: {
    width: "100%",
    height: 190,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
    marginBottom: 17,
  },
  detailImagePlaceholder: {
    width: "100%",
    height: 130,
    borderRadius: 16,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },
  detailItemName: {
    fontSize: 23,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  detailSectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 24,
    marginBottom: 13,
  },
  timeline: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },
  timelineRow: {
    flexDirection: "row",
    minHeight: 68,
  },
  timelineRail: {
    width: 28,
    alignItems: "center",
  },
  timelineCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  timelineCircleDone: {
    borderColor: "#16A34A",
    backgroundColor: "#16A34A",
  },
  timelineCircleCurrent: {
    borderColor: "#2563EB",
  },
  timelineInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
  },
  timelineInnerDotCurrent: {
    backgroundColor: "#2563EB",
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#E2E8F0",
    marginVertical: 3,
  },
  timelineLineDone: {
    backgroundColor: "#16A34A",
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 17,
  },
  timelineTitle: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  timelineTitleDone: {
    color: "#0F172A",
  },
  timelineDescription: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  closedStatusBox: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  detailLabel: {
    flex: 0.9,
    color: "#64748B",
    fontSize: 13,
  },
  detailValue: {
    flex: 1.1,
    textAlign: "right",
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "600",
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 19,
    marginBottom: 7,
  },
  descriptionText: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 21,
  },
  recordId: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 20,
  },
  doneButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 15,
    borderRadius: 13,
    alignItems: "center",
    marginTop: 23,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
});
