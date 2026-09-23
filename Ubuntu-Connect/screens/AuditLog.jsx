import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";

import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import { db } from "../firebaseConfig";

const FILTERS = [
  "All",
  "Session",
  "Donation",
  "Request",
  "Campaign",
  "Charity",
];

const AuditLog = ({ navigation }) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] =
    useState("All");

  const [expandedLogId, setExpandedLogId] =
    useState(null);

  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const auditQuery = query(
      collection(db, "auditLogs"),
      orderBy("timestamp", "desc"),
      limit(200)
    );

    const unsubscribe = onSnapshot(
      auditQuery,
      (snapshot) => {
        const logList = snapshot.docs.map(
          (document) => ({
            id: document.id,
            ...document.data(),
          })
        );

        setAuditLogs(logList);
        setLoading(false);
      },
      (error) => {
        console.log(
          "AUDIT LOG ERROR:",
          error.code,
          error.message
        );

        setLoading(false);

        showMessage(
          "Audit Log Error",
          error.message ||
            "The audit log could not be loaded."
        );
      }
    );

    return () => unsubscribe();
  }, []);

  const getCategory = (log) => {
    const targetType =
      log.targetType?.toLowerCase() || "";

    const action =
      log.action?.toUpperCase() || "";

    if (
      targetType === "session" ||
      action.includes("LOGIN") ||
      action.includes("LOGOUT") ||
      action.includes("SESSION")
    ) {
      return "Session";
    }

    if (
      targetType === "donation" ||
      action.includes("DONATION")
    ) {
      return "Donation";
    }

    if (
      targetType === "request" ||
      action.includes("REQUEST")
    ) {
      return "Request";
    }

    if (
      targetType === "campaign" ||
      action.includes("CAMPAIGN")
    ) {
      return "Campaign";
    }

    if (
      targetType === "charity" ||
      action.includes("CHARITY")
    ) {
      return "Charity";
    }

    return "Other";
  };

  const filteredLogs = useMemo(() => {
    const cleanSearch =
      searchText.trim().toLowerCase();

    return auditLogs.filter((log) => {
      const category = getCategory(log);

      const matchesFilter =
        activeFilter === "All" ||
        category === activeFilter;

      if (!matchesFilter) {
        return false;
      }

      if (!cleanSearch) {
        return true;
      }

      const searchableText = [
        log.action,
        log.description,
        log.actorEmail,
        log.actorRole,
        log.targetType,
        log.targetId,
        log.platform,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(cleanSearch);
    });
  }, [auditLogs, activeFilter, searchText]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) {
      return "Timestamp pending";
    }

    const date =
      typeof timestamp.toDate === "function"
        ? timestamp.toDate()
        : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "Timestamp unavailable";
    }

    return date.toLocaleString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Session":
        return "🔐";

      case "Donation":
        return "🎁";

      case "Request":
        return "🙏";

      case "Campaign":
        return "📢";

      case "Charity":
        return "🤝";

      default:
        return "📋";
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "Session":
        return "#7C3AED";

      case "Donation":
        return "#16A34A";

      case "Request":
        return "#2563EB";

      case "Campaign":
        return "#D97706";

      case "Charity":
        return "#059669";

      default:
        return "#64748B";
    }
  };

  const formatMetadata = (metadata) => {
    if (
      !metadata ||
      typeof metadata !== "object"
    ) {
      return "No additional metadata";
    }

    const entries = Object.entries(metadata);

    if (entries.length === 0) {
      return "No additional metadata";
    }

    return entries
      .map(([key, value]) => {
        const formattedValue =
          typeof value === "object"
            ? JSON.stringify(value)
            : String(value);

        return `${key}: ${formattedValue}`;
      })
      .join("\n");
  };

  const renderAuditLog = ({ item }) => {
    const category = getCategory(item);
    const categoryColor =
      getCategoryColor(category);

    const isExpanded =
      expandedLogId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.logCard,
          {
            borderLeftColor: categoryColor,
          },
        ]}
        onPress={() =>
          setExpandedLogId(
            isExpanded ? null : item.id
          )
        }
      >
        <View style={styles.logHeader}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor:
                  `${categoryColor}18`,
              },
            ]}
          >
            <Text style={styles.icon}>
              {getCategoryIcon(category)}
            </Text>
          </View>

          <View style={styles.logTitleContainer}>
            <Text
              style={styles.actionText}
              numberOfLines={2}
            >
              {item.action ||
                "UNKNOWN_ACTION"}
            </Text>

            <Text style={styles.timestamp}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>

          <View
            style={[
              styles.categoryBadge,
              {
                backgroundColor:
                  `${categoryColor}18`,
              },
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                {
                  color: categoryColor,
                },
              ]}
            >
              {category}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>
          {item.description ||
            "No description provided."}
        </Text>

        <View style={styles.actorContainer}>
          <Text style={styles.actorLabel}>
            Performed by
          </Text>

          <Text
            style={styles.actorValue}
            numberOfLines={1}
          >
            {item.actorEmail ||
              item.actorId ||
              "Unknown user"}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            Role: {item.actorRole || "User"}
          </Text>

          <Text style={styles.summaryText}>
            Platform:{" "}
            {item.platform || "Unknown"}
          </Text>

          <Text style={styles.expandText}>
            {isExpanded
              ? "Hide details ▲"
              : "View details ▼"}
          </Text>
        </View>

        {isExpanded && (
          <View style={styles.expandedContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Log ID
              </Text>

              <Text style={styles.detailValue}>
                {item.id}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Actor ID
              </Text>

              <Text style={styles.detailValue}>
                {item.actorId ||
                  "Not available"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Target type
              </Text>

              <Text style={styles.detailValue}>
                {item.targetType ||
                  "Not specified"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Target ID
              </Text>

              <Text style={styles.detailValue}>
                {item.targetId ||
                  "Not specified"}
              </Text>
            </View>

            <Text style={styles.metadataTitle}>
              Metadata
            </Text>

            <Text style={styles.metadataText}>
              {formatMetadata(item.metadata)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>
            ‹
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.heading}>
            Audit Log
          </Text>

          <Text style={styles.subtitle}>
            Monitor important system activity.
          </Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryNumber}>
          {auditLogs.length}
        </Text>

        <View>
          <Text style={styles.summaryTitle}>
            Recorded events
          </Text>

          <Text style={styles.summaryDescription}>
            Showing up to 200 recent events
          </Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>
          🔍
        </Text>

        <TextInput
          placeholder="Search audit logs..."
          placeholderTextColor="#94A3B8"
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
        />

        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchText("")}
          >
            <Text style={styles.clearText}>
              ✕
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterContainer}>
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              activeFilter === filter &&
                styles.activeFilterButton,
            ]}
            onPress={() =>
              setActiveFilter(filter)
            }
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filter &&
                  styles.activeFilterText,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.resultsText}>
        {filteredLogs.length}{" "}
        {filteredLogs.length === 1
          ? "event"
          : "events"}
      </Text>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator
            size="large"
            color="#2563EB"
          />

          <Text style={styles.loadingText}>
            Loading audit logs...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.id}
          renderItem={renderAuditLog}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            filteredLogs.length === 0
              ? styles.emptyListContainer
              : styles.listContainer
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>
                📋
              </Text>

              <Text style={styles.emptyTitle}>
                No Audit Events Found
              </Text>

              <Text style={styles.emptyText}>
                No events match the selected filter
                or search.
              </Text>

              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchText("");
                  setActiveFilter("All");
                }}
              >
                <Text
                  style={
                    styles.clearFiltersText
                  }
                >
                  Clear Filters
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default AuditLog;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 18,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  backButtonText: {
    color: "#1E293B",
    fontSize: 32,
    lineHeight: 34,
  },

  headerTextContainer: {
    flex: 1,
  },

  heading: {
    color: "#1E293B",
    fontSize: 28,
    fontWeight: "800",
  },

  subtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 3,
  },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 17,
    padding: 15,
    marginBottom: 14,
  },

  summaryNumber: {
    color: "#2563EB",
    fontSize: 27,
    fontWeight: "900",
    marginRight: 14,
  },

  summaryTitle: {
    color: "#1E3A8A",
    fontSize: 14,
    fontWeight: "800",
  },

  summaryDescription: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 3,
  },

  searchContainer: {
    height: 52,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  searchIcon: {
    fontSize: 16,
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    color: "#1E293B",
    fontSize: 14,
  },

  clearText: {
    color: "#64748B",
    fontWeight: "700",
    padding: 5,
  },

  filterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },

  filterButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginRight: 6,
    marginBottom: 7,
  },

  activeFilterButton: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  filterText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },

  activeFilterText: {
    color: "#FFFFFF",
  },

  resultsText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 12,
  },

  listContainer: {
    paddingBottom: 80,
  },

  logCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderLeftWidth: 4,
    padding: 15,
    marginBottom: 11,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },

  logHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainer: {
    width: 43,
    height: 43,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  icon: {
    fontSize: 19,
  },

  logTitleContainer: {
    flex: 1,
  },

  actionText: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "800",
  },

  timestamp: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 4,
  },

  categoryBadge: {
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 7,
  },

  categoryText: {
    fontSize: 9,
    fontWeight: "800",
  },

  description: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },

  actorContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginTop: 11,
  },

  actorLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "700",
  },

  actorValue: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  summaryText: {
    color: "#64748B",
    fontSize: 10,
    marginRight: 12,
  },

  expandText: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: "auto",
  },

  expandedContainer: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    marginTop: 13,
    paddingTop: 12,
  },

  detailRow: {
    marginBottom: 9,
  },

  detailLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "700",
  },

  detailValue: {
    color: "#334155",
    fontSize: 11,
    marginTop: 3,
  },

  metadataTitle: {
    color: "#1E293B",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 5,
  },

  metadataText: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 18,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#64748B",
    fontWeight: "600",
    marginTop: 12,
  },

  emptyListContainer: {
    flexGrow: 1,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingBottom: 60,
  },

  emptyIcon: {
    fontSize: 52,
  },

  emptyTitle: {
    color: "#1E293B",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 14,
  },

  emptyText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    marginTop: 7,
  },

  clearFiltersButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingHorizontal: 17,
    paddingVertical: 11,
    marginTop: 17,
  },

  clearFiltersText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});