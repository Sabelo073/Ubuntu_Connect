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

import { MaterialIcons } from "@expo/vector-icons";

import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { SafeAreaView } from "react-native-safe-area-context";

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

  // ==========================================
  // MESSAGE
  // ==========================================

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

  // ==========================================
  // LOAD AUDIT LOGS
  // ==========================================

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

  // ==========================================
  // CATEGORY
  // ==========================================

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

  // ==========================================
  // FILTER LOGS
  // ==========================================

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

      return searchableText.includes(
        cleanSearch
      );
    });
  }, [
    auditLogs,
    activeFilter,
    searchText,
  ]);

  // ==========================================
  // FORMAT TIMESTAMP
  // ==========================================

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

  // ==========================================
  // CATEGORY ICON
  // ==========================================

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Session":
        return "lock";

      case "Donation":
        return "card-giftcard";

      case "Request":
        return "help-outline";

      case "Campaign":
        return "campaign";

      case "Charity":
        return "handshake";

      default:
        return "description";
    }
  };

  // ==========================================
  // CATEGORY COLOR
  // ==========================================

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

  // ==========================================
  // FORMAT METADATA
  // ==========================================

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

  // ==========================================
  // AUDIT LOG CARD
  // ==========================================

  const renderAuditLog = ({ item }) => {
    const category = getCategory(item);

    const categoryColor =
      getCategoryColor(category);

    const isExpanded =
      expandedLogId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.logCard,
          {
            borderLeftColor:
              categoryColor,
          },
        ]}
        onPress={() =>
          setExpandedLogId(
            isExpanded
              ? null
              : item.id
          )
        }
      >

        {/* LOG HEADER */}
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
            <MaterialIcons
              name={getCategoryIcon(category)}
              size={22}
              color={categoryColor}
            />
          </View>

          <View
            style={
              styles.logTitleContainer
            }
          >
            <Text
              style={styles.actionText}
              numberOfLines={2}
            >
              {item.action ||
                "UNKNOWN_ACTION"}
            </Text>

            <View
              style={
                styles.timestampRow
              }
            >
              <MaterialIcons
                name="schedule"
                size={12}
                color="#94A3B8"
              />

              <Text
                style={styles.timestamp}
              >
                {formatTimestamp(
                  item.timestamp
                )}
              </Text>
            </View>
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
                  color:
                    categoryColor,
                },
              ]}
            >
              {category}
            </Text>
          </View>

        </View>

        {/* DESCRIPTION */}
        <Text style={styles.description}>
          {item.description ||
            "No description provided."}
        </Text>

        {/* ACTOR */}
        <View
          style={styles.actorContainer}
        >
          <View
            style={styles.actorIcon}
          >
            <MaterialIcons
              name="person"
              size={16}
              color="#64748B"
            />
          </View>

          <View
            style={styles.actorTextContainer}
          >
            <Text
              style={styles.actorLabel}
            >
              PERFORMED BY
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
        </View>

        {/* SUMMARY */}
        <View style={styles.summaryRow}>

          <View
            style={styles.summaryItem}
          >
            <MaterialIcons
              name="badge"
              size={13}
              color="#94A3B8"
            />

            <Text
              style={styles.summaryText}
            >
              {item.actorRole ||
                "User"}
            </Text>
          </View>

          <View
            style={styles.summaryItem}
          >
            <MaterialIcons
              name={
                item.platform ===
                "web"
                  ? "language"
                  : "phone-android"
              }
              size={13}
              color="#94A3B8"
            />

            <Text
              style={styles.summaryText}
            >
              {item.platform ||
                "Unknown"}
            </Text>
          </View>

          <View
            style={
              styles.expandContainer
            }
          >
            <Text
              style={styles.expandText}
            >
              {isExpanded
                ? "Hide details"
                : "View details"}
            </Text>

            <MaterialIcons
              name={
                isExpanded
                  ? "keyboard-arrow-up"
                  : "keyboard-arrow-down"
              }
              size={17}
              color="#2563EB"
            />
          </View>

        </View>

        {/* EXPANDED DETAILS */}
        {isExpanded && (
          <View
            style={
              styles.expandedContainer
            }
          >

            <View
              style={styles.detailRow}
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                LOG ID
              </Text>

              <Text
                style={
                  styles.detailValue
                }
              >
                {item.id}
              </Text>
            </View>

            <View
              style={styles.detailRow}
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                ACTOR ID
              </Text>

              <Text
                style={
                  styles.detailValue
                }
              >
                {item.actorId ||
                  "Not available"}
              </Text>
            </View>

            <View
              style={styles.detailRow}
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                TARGET TYPE
              </Text>

              <Text
                style={
                  styles.detailValue
                }
              >
                {item.targetType ||
                  "Not specified"}
              </Text>
            </View>

            <View
              style={styles.detailRow}
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                TARGET ID
              </Text>

              <Text
                style={
                  styles.detailValue
                }
              >
                {item.targetId ||
                  "Not specified"}
              </Text>
            </View>

            <View
              style={
                styles.metadataHeader
              }
            >
              <MaterialIcons
                name="data-object"
                size={16}
                color="#2563EB"
              />

              <Text
                style={
                  styles.metadataTitle
                }
              >
                Metadata
              </Text>
            </View>

            <Text
              style={
                styles.metadataText
              }
            >
              {formatMetadata(
                item.metadata
              )}
            </Text>

          </View>
        )}

      </TouchableOpacity>
    );
  };

  // ==========================================
  // SCREEN
  // ==========================================

  return (
    <SafeAreaView
      style={styles.container}
      edges={[
        "top",
        "left",
        "right",
      ]}
    >

      {/* HEADER */}
      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <MaterialIcons
            name="arrow-back"
            size={22}
            color="#1E293B"
          />
        </TouchableOpacity>

        <View
          style={
            styles.headerIconContainer
          }
        >
          <MaterialIcons
            name="fact-check"
            size={24}
            color="#2563EB"
          />
        </View>

        <View
          style={
            styles.headerTextContainer
          }
        >
          <Text style={styles.heading}>
            Audit Log
          </Text>

          <Text style={styles.subtitle}>
            Monitor important system activity.
          </Text>
        </View>

      </View>

      {/* SUMMARY */}
      <View style={styles.summaryCard}>

        <View
          style={
            styles.summaryIconContainer
          }
        >
          <MaterialIcons
            name="analytics"
            size={25}
            color="#2563EB"
          />
        </View>

        <View>
          <Text
            style={
              styles.summaryNumber
            }
          >
            {auditLogs.length}
          </Text>
        </View>

        <View
          style={
            styles.summaryInfo
          }
        >
          <Text
            style={
              styles.summaryTitle
            }
          >
            Recorded events
          </Text>

          <Text
            style={
              styles.summaryDescription
            }
          >
            Showing up to 200 recent events
          </Text>
        </View>

      </View>

      {/* SEARCH */}
      <View
        style={styles.searchContainer}
      >

        <MaterialIcons
          name="search"
          size={21}
          color="#94A3B8"
        />

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
            onPress={() =>
              setSearchText("")
            }
            style={styles.clearButton}
          >
            <MaterialIcons
              name="close"
              size={18}
              color="#64748B"
            />
          </TouchableOpacity>
        )}

      </View>

      {/* FILTERS */}
      <View
        style={styles.filterContainer}
      >
        {FILTERS.map((filter) => {

          const isActive =
            activeFilter === filter;

          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                isActive &&
                  styles.activeFilterButton,
              ]}
              onPress={() =>
                setActiveFilter(
                  filter
                )
              }
            >
              <Text
                style={[
                  styles.filterText,
                  isActive &&
                    styles.activeFilterText,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* RESULTS */}
      <View
        style={styles.resultsHeader}
      >
        <Text
          style={styles.resultsText}
        >
          {filteredLogs.length}{" "}
          {filteredLogs.length === 1
            ? "event"
            : "events"}{" "}
          found
        </Text>

        {activeFilter !== "All" && (
          <View
            style={
              styles.activeFilterLabel
            }
          >
            <MaterialIcons
              name="filter-list"
              size={13}
              color="#2563EB"
            />

            <Text
              style={
                styles.activeFilterLabelText
              }
            >
              {activeFilter}
            </Text>
          </View>
        )}
      </View>

      {/* LOADING / LIST */}
      {loading ? (

        <View
          style={
            styles.centerContainer
          }
        >
          <View
            style={
              styles.loadingIconContainer
            }
          >
            <MaterialIcons
              name="fact-check"
              size={32}
              color="#2563EB"
            />
          </View>

          <ActivityIndicator
            size="small"
            color="#2563EB"
          />

          <Text
            style={styles.loadingText}
          >
            Loading audit logs...
          </Text>
        </View>

      ) : (

        <FlatList
          data={filteredLogs}
          keyExtractor={(item) =>
            item.id
          }
          renderItem={renderAuditLog}
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            filteredLogs.length === 0
              ? styles.emptyListContainer
              : styles.listContainer
          }
          ListEmptyComponent={

            <View
              style={
                styles.emptyContainer
              }
            >

              <View
                style={
                  styles.emptyIconContainer
                }
              >
                <MaterialIcons
                  name="find-in-page"
                  size={42}
                  color="#94A3B8"
                />
              </View>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                No Audit Events Found
              </Text>

              <Text
                style={styles.emptyText}
              >
                No events match the selected
                filter or search.
              </Text>

              <TouchableOpacity
                style={
                  styles.clearFiltersButton
                }
                onPress={() => {
                  setSearchText("");
                  setActiveFilter(
                    "All"
                  );
                }}
              >
                <MaterialIcons
                  name="filter-alt-off"
                  size={18}
                  color="#FFFFFF"
                />

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


// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
  },

  // ==========================================
  // HEADER
  // ==========================================

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 18,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  headerTextContainer: {
    flex: 1,
  },

  heading: {
    color: "#1E293B",
    fontSize: 27,
    fontWeight: "800",
  },

  subtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 3,
  },

  // ==========================================
  // SUMMARY
  // ==========================================

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 17,
    padding: 14,
    marginBottom: 14,
  },

  summaryIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  summaryNumber: {
    color: "#2563EB",
    fontSize: 26,
    fontWeight: "900",
  },

  summaryInfo: {
    marginLeft: 9,
  },

  summaryTitle: {
    color: "#1E3A8A",
    fontSize: 14,
    fontWeight: "800",
  },

  summaryDescription: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 3,
  },

  // ==========================================
  // SEARCH
  // ==========================================

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

  searchInput: {
    flex: 1,
    height: "100%",
    color: "#1E293B",
    fontSize: 14,
    marginLeft: 9,
  },

  clearButton: {
    padding: 5,
  },

  // ==========================================
  // FILTERS
  // ==========================================

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
    paddingHorizontal: 12,
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

  // ==========================================
  // RESULTS HEADER
  // ==========================================

  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 12,
  },

  resultsText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },

  activeFilterLabel: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  activeFilterLabelText: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 3,
  },

  // ==========================================
  // LOG CARD
  // ==========================================

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

  logTitleContainer: {
    flex: 1,
  },

  actionText: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "800",
  },

  timestampRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  timestamp: {
    color: "#94A3B8",
    fontSize: 10,
    marginLeft: 4,
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

  // ==========================================
  // DESCRIPTION
  // ==========================================

  description: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },

  // ==========================================
  // ACTOR
  // ==========================================

  actorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginTop: 11,
  },

  actorIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  actorTextContainer: {
    flex: 1,
  },

  actorLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  actorValue: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  // ==========================================
  // SUMMARY ROW
  // ==========================================

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },

  summaryText: {
    color: "#64748B",
    fontSize: 10,
    marginLeft: 4,
  },

  expandContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
  },

  expandText: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "700",
  },

  // ==========================================
  // EXPANDED DETAILS
  // ==========================================

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
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  detailValue: {
    color: "#334155",
    fontSize: 11,
    marginTop: 3,
  },

  metadataHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  metadataTitle: {
    color: "#1E293B",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 5,
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

  // ==========================================
  // LOADING
  // ==========================================

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },

  loadingText: {
    color: "#64748B",
    fontWeight: "600",
    marginTop: 10,
  },

  // ==========================================
  // EMPTY STATE
  // ==========================================

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

  emptyIconContainer: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    color: "#1E293B",
    fontSize: 19,
    fontWeight: "800",
  },

  emptyText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 7,
  },

  clearFiltersButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingHorizontal: 17,
    paddingVertical: 11,
    marginTop: 17,
  },

  clearFiltersText: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginLeft: 7,
  },
});