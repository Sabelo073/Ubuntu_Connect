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
  Linking,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebaseConfig";

const Charities = ({ navigation }) => {
  const [charities, setCharities] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  const [
    expandedCharityId,
    setExpandedCharityId,
  ] = useState(null);

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
    const charitiesQuery = query(
      collection(db, "charities"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      charitiesQuery,
      (snapshot) => {
        const charityList = snapshot.docs.map(
          (document) => ({
            id: document.id,
            ...document.data(),
          })
        );

        setCharities(charityList);
        setLoading(false);
      },
      (error) => {
        console.log(
          "CHARITIES ERROR:",
          error.code,
          error.message
        );

        setLoading(false);

        showMessage(
          "Charities Error",
          error.message ||
            "Charities could not be loaded."
        );
      }
    );

    return () => unsubscribe();
  }, []);

  const formatListValue = (value) => {
    if (Array.isArray(value)) {
      return value.length > 0
        ? value.join(", ")
        : "Not specified";
    }

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }

    return "Not specified";
  };

  const filteredCharities = useMemo(() => {
    const searchValue =
      searchText.trim().toLowerCase();

    if (!searchValue) {
      return charities;
    }

    return charities.filter((charity) => {
      const charityName =
        charity.name?.toLowerCase() || "";

      const charityType =
        charity.type?.toLowerCase() || "";

      const charityLocation = (
        charity.location ||
        charity.address ||
        ""
      ).toLowerCase();

      const charityNeeds =
        formatListValue(
          charity.needs
        ).toLowerCase();

      const charityServices =
        formatListValue(
          charity.services
        ).toLowerCase();

      return (
        charityName.includes(searchValue) ||
        charityType.includes(searchValue) ||
        charityLocation.includes(searchValue) ||
        charityNeeds.includes(searchValue) ||
        charityServices.includes(searchValue)
      );
    });
  }, [charities, searchText]);

  const toggleCharityDetails = (charityId) => {
    setExpandedCharityId((currentId) =>
      currentId === charityId
        ? null
        : charityId
    );
  };

  const openEmail = async (charity) => {
    const email = charity.email?.trim();

    if (!email) {
      showMessage(
        "Email Unavailable",
        "This charity has not provided an email address."
      );

      return;
    }

    const subject = encodeURIComponent(
      `Ubuntu Connect enquiry for ${
        charity.name || "Community Charity"
      }`
    );

    const emailUrl =
      `mailto:${email}?subject=${subject}`;

    try {
      const supported =
        await Linking.canOpenURL(emailUrl);

      if (!supported) {
        showMessage(
          "Email Unavailable",
          `Email address: ${email}`
        );

        return;
      }

      await Linking.openURL(emailUrl);
    } catch (error) {
      console.log(
        "OPEN EMAIL ERROR:",
        error.message
      );

      showMessage(
        "Contact Error",
        "The email application could not be opened."
      );
    }
  };

  const callCharity = async (charity) => {
    const phone = charity.phone?.trim();

    if (!phone) {
      showMessage(
        "Phone Unavailable",
        "This charity has not provided a telephone number."
      );

      return;
    }

    const phoneUrl = `tel:${phone}`;

    try {
      const supported =
        await Linking.canOpenURL(phoneUrl);

      if (!supported) {
        showMessage(
          "Charity Contact",
          `Phone: ${phone}`
        );

        return;
      }

      await Linking.openURL(phoneUrl);
    } catch (error) {
      console.log(
        "PHONE ERROR:",
        error.message
      );

      showMessage(
        "Charity Contact",
        `Phone: ${phone}`
      );
    }
  };

  const contactCharity = (charity) => {
    const hasPhone = Boolean(
      charity.phone?.trim()
    );

    const hasEmail = Boolean(
      charity.email?.trim()
    );

    if (!hasPhone && !hasEmail) {
      showMessage(
        "Contact Unavailable",
        "This charity has not provided contact information."
      );

      return;
    }

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined"
    ) {
      if (hasEmail) {
        openEmail(charity);
      } else {
        showMessage(
          "Charity Contact",
          `Phone: ${charity.phone}`
        );
      }

      return;
    }

    const contactButtons = [
      {
        text: "Cancel",
        style: "cancel",
      },
    ];

    if (hasPhone) {
      contactButtons.push({
        text: "Call",
        onPress: () => callCharity(charity),
      });
    }

    if (hasEmail) {
      contactButtons.push({
        text: "Email",
        onPress: () => openEmail(charity),
      });
    }

    Alert.alert(
      charity.name || "Contact Charity",
      "Choose a contact method.",
      contactButtons
    );
  };

  const supportCharity = (charity) => {
    navigation.navigate("Donate", {
      charityId: charity.id,

      charityName:
        charity.name ||
        "Community Charity",

      charityNeeds:
        formatListValue(charity.needs),

      organization:
        charity.name ||
        "Community Charity",
    });
  };

  const renderCharity = ({ item }) => {
    const isExpanded =
      expandedCharityId === item.id;

    const charityName =
      item.name ||
      "Community Charity";

    const charityType =
      item.type ||
      "Community Organisation";

    const charityLocation =
      item.location ||
      item.address ||
      "Location not provided";

    const charityNeeds =
      formatListValue(item.needs);

    const charityServices =
      formatListValue(item.services);

    const avatarLetter =
      charityName.charAt(0).toUpperCase() ||
      "C";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {avatarLetter}
              </Text>
            </View>

            <View
              style={styles.nameTextContainer}
            >
              <Text
                style={styles.charityName}
                numberOfLines={2}
              >
                {charityName}
              </Text>

              <Text style={styles.charityType}>
                {charityType}
              </Text>
            </View>
          </View>

          {item.verified === true ? (
            <View style={styles.verifiedBadge}>
              <Text
                style={styles.verifiedBadgeText}
              >
                ✓ Verified
              </Text>
            </View>
          ) : (
            <View
              style={styles.unverifiedBadge}
            >
              <Text
                style={
                  styles.unverifiedBadgeText
                }
              >
                Unverified
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.location}>
          📍 {charityLocation}
        </Text>

        {item.distance ? (
          <Text style={styles.distance}>
            {item.distance} away
          </Text>
        ) : null}

        <View style={styles.needsContainer}>
          <Text style={styles.needsLabel}>
            Current needs
          </Text>

          <Text style={styles.needsText}>
            {charityNeeds}
          </Text>
        </View>

        {isExpanded && (
          <View style={styles.detailsContainer}>
            {item.description ? (
              <View
                style={styles.detailSection}
              >
                <Text style={styles.detailTitle}>
                  About
                </Text>

                <Text style={styles.detailText}>
                  {item.description}
                </Text>
              </View>
            ) : null}

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>
                Services offered
              </Text>

              <Text style={styles.detailText}>
                {charityServices}
              </Text>
            </View>

            {item.phone ? (
              <TouchableOpacity
                style={styles.contactDetailRow}
                onPress={() =>
                  callCharity(item)
                }
              >
                <Text
                  style={styles.contactIcon}
                >
                  📞
                </Text>

                <Text
                  style={styles.contactDetail}
                >
                  {item.phone}
                </Text>
              </TouchableOpacity>
            ) : null}

            {item.email ? (
              <TouchableOpacity
                style={styles.contactDetailRow}
                onPress={() =>
                  openEmail(item)
                }
              >
                <Text
                  style={styles.contactIcon}
                >
                  ✉️
                </Text>

                <Text
                  style={styles.contactDetail}
                >
                  {item.email}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() =>
            toggleCharityDetails(item.id)
          }
        >
          <Text
            style={styles.detailsButtonText}
          >
            {isExpanded
              ? "Hide Details ▲"
              : "View Details ▼"}
          </Text>
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() =>
              supportCharity(item)
            }
          >
            <Text style={styles.supportText}>
              🎁 Donate
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={() =>
              contactCharity(item)
            }
          >
            <Text style={styles.contactText}>
              Contact
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Loading charities...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <Text style={styles.heading}>
        Community Charities
      </Text>

      <Text style={styles.subtitle}>
        Discover and support organisations
        making a difference.
      </Text>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>
          🔍
        </Text>

        <TextInput
          placeholder="Search charities..."
          placeholderTextColor="#94A3B8"
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />

        {searchText.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() =>
              setSearchText("")
            }
          >
            <Text style={styles.clearText}>
              ✕
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.resultsText}>
        {filteredCharities.length}{" "}
        {filteredCharities.length === 1
          ? "organisation"
          : "organisations"}
      </Text>

      <FlatList
        data={filteredCharities}
        keyExtractor={(item) => item.id}
        renderItem={renderCharity}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          filteredCharities.length === 0
            ? styles.emptyListContent
            : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View
              style={
                styles.emptyIconContainer
              }
            >
              <Text style={styles.emptyIcon}>
                🤝
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              {searchText.trim()
                ? "No Charities Found"
                : "No Charities Yet"}
            </Text>

            <Text style={styles.emptyText}>
              {searchText.trim()
                ? `No charity matched "${searchText.trim()}".`
                : "Charities created by administrators will appear here."}
            </Text>

            {searchText.trim() ? (
              <TouchableOpacity
                style={
                  styles.clearSearchButton
                }
                onPress={() =>
                  setSearchText("")
                }
              >
                <Text
                  style={
                    styles.clearSearchText
                  }
                >
                  Clear Search
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />
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

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 14,
  },

  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 20,
  },

  subtitle: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 21,
    marginTop: 6,
    marginBottom: 20,
  },

  searchContainer: {
    height: 55,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
  },

  searchIcon: {
    fontSize: 17,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    color: "#1E293B",
    fontSize: 15,
  },

  clearButton: {
    padding: 6,
  },

  clearText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "700",
  },

  resultsText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 14,
  },

  listContent: {
    paddingBottom: 100,
  },

   card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  nameContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },

  nameTextContainer: {
    flex: 1,
  },

  charityName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E293B",
  },

  charityType: {
    marginTop: 4,
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600",
  },

  verifiedBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  verifiedBadgeText: {
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "700",
  },

  unverifiedBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  unverifiedBadgeText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "700",
  },

  location: {
    marginTop: 15,
    color: "#475569",
    fontSize: 13,
  },

  distance: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 5,
  },

  needsContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 13,
    padding: 13,
    marginTop: 14,
  },

  needsLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },

  needsText: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 4,
  },

  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    marginTop: 16,
    paddingTop: 15,
  },

  detailSection: {
    marginBottom: 13,
  },

  detailTitle: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "700",
  },

  detailText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },

  contactDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    paddingVertical: 3,
  },

  contactIcon: {
    fontSize: 15,
    marginRight: 9,
  },

  contactDetail: {
    flex: 1,
    color: "#475569",
    fontSize: 13,
  },

  detailsButton: {
    minHeight: 42,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  detailsButtonText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "700",
  },

  buttonRow: {
    flexDirection: "row",
    marginTop: 8,
  },

  supportButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 8,
  },

  supportText: {
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

  emptyListContent: {
    flexGrow: 1,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 100,
  },

  emptyIconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  emptyIcon: {
    fontSize: 52,
  },

  emptyTitle: {
    color: "#1E293B",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },

  emptyText: {
    color: "#64748B",
    textAlign: "center",
    lineHeight: 23,
    marginTop: 10,
  },

  clearSearchButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 18,
  },

  clearSearchText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});