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

import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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

  const getCharityIcon = (type) => {
    const value = type?.toLowerCase() || "";

    if (
      value.includes("school") ||
      value.includes("education")
    ) {
      return "school";
    }

    if (
      value.includes("medical") ||
      value.includes("health")
    ) {
      return "medical-services";
    }

    if (
      value.includes("food") ||
      value.includes("shelter")
    ) {
      return "volunteer-activism";
    }

    if (
      value.includes("children") ||
      value.includes("child")
    ) {
      return "child-care";
    }

    return "handshake";
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

        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>

            <View style={styles.avatar}>
              <MaterialIcons
                name={getCharityIcon(item.type)}
                size={24}
                color="#FFFFFF"
              />
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
              <MaterialIcons
                name="verified"
                size={14}
                color="#16A34A"
              />

              <Text
                style={styles.verifiedBadgeText}
              >
                Verified
              </Text>
            </View>
          ) : (
            <View
              style={styles.unverifiedBadge}
            >
              <MaterialIcons
                name="info-outline"
                size={14}
                color="#D97706"
              />

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

        {/* Location */}
        <View style={styles.locationRow}>
          <View style={styles.locationIcon}>
            <MaterialIcons
              name="location-on"
              size={16}
              color="#2563EB"
            />
          </View>

          <Text style={styles.location}>
            {charityLocation}
          </Text>
        </View>

        {item.distance ? (
          <View style={styles.distanceRow}>
            <MaterialIcons
              name="near-me"
              size={14}
              color="#94A3B8"
            />

            <Text style={styles.distance}>
              {item.distance} away
            </Text>
          </View>
        ) : null}

        {/* Needs */}
        <View style={styles.needsContainer}>
          <View style={styles.needsHeader}>
            <MaterialIcons
              name="volunteer-activism"
              size={17}
              color="#7C3AED"
            />

            <Text style={styles.needsLabel}>
              Current needs
            </Text>
          </View>

          <Text style={styles.needsText}>
            {charityNeeds}
          </Text>
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.detailsContainer}>

            {item.description ? (
              <View
                style={styles.detailSection}
              >
                <View style={styles.detailTitleRow}>
                  <MaterialIcons
                    name="info-outline"
                    size={17}
                    color="#2563EB"
                  />

                  <Text
                    style={styles.detailTitle}
                  >
                    About
                  </Text>
                </View>

                <Text style={styles.detailText}>
                  {item.description}
                </Text>
              </View>
            ) : null}

            <View style={styles.detailSection}>
              <View style={styles.detailTitleRow}>
                <MaterialIcons
                  name="support"
                  size={17}
                  color="#22C55E"
                />

                <Text
                  style={styles.detailTitle}
                >
                  Services offered
                </Text>
              </View>

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
                <View
                  style={styles.contactIconContainer}
                >
                  <MaterialIcons
                    name="phone"
                    size={17}
                    color="#22C55E"
                  />
                </View>

                <Text
                  style={styles.contactDetail}
                >
                  {item.phone}
                </Text>

                <MaterialIcons
                  name="chevron-right"
                  size={19}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            ) : null}

            {item.email ? (
              <TouchableOpacity
                style={styles.contactDetailRow}
                onPress={() =>
                  openEmail(item)
                }
              >
                <View
                  style={styles.contactIconContainer}
                >
                  <MaterialIcons
                    name="email"
                    size={17}
                    color="#2563EB"
                  />
                </View>

                <Text
                  style={styles.contactDetail}
                  numberOfLines={1}
                >
                  {item.email}
                </Text>

                <MaterialIcons
                  name="chevron-right"
                  size={19}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Details Toggle */}
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() =>
            toggleCharityDetails(item.id)
          }
          activeOpacity={0.7}
        >
          <Text
            style={styles.detailsButtonText}
          >
            {isExpanded
              ? "Hide Details"
              : "View Details"}
          </Text>

          <MaterialIcons
            name={
              isExpanded
                ? "keyboard-arrow-up"
                : "keyboard-arrow-down"
            }
            size={20}
            color="#2563EB"
          />
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() =>
              supportCharity(item)
            }
            activeOpacity={0.85}
          >
            <MaterialIcons
              name="card-giftcard"
              size={19}
              color="#FFFFFF"
            />

            <Text style={styles.supportText}>
              Donate
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={() =>
              contactCharity(item)
            }
            activeOpacity={0.85}
          >
            <MaterialIcons
              name="contact-phone"
              size={19}
              color="#FFFFFF"
            />

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
        <View style={styles.loadingIcon}>
          <MaterialIcons
            name="handshake"
            size={30}
            color="#7C3AED"
          />
        </View>

        <ActivityIndicator
          size="small"
          color="#2563EB"
          style={styles.loadingSpinner}
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="arrow-back"
            size={23}
            color="#1E293B"
          />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.heading}>
            Community Charities
          </Text>

          <Text style={styles.subtitle}>
            Discover organisations making a
            difference.
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <MaterialIcons
            name="handshake"
            size={25}
            color="#7C3AED"
          />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons
          name="search"
          size={21}
          color="#64748B"
          style={styles.searchIcon}
        />

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
            <MaterialIcons
              name="close"
              size={19}
              color="#64748B"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      <View style={styles.resultsRow}>
        <View style={styles.resultsLeft}>
          <MaterialIcons
            name="groups"
            size={17}
            color="#64748B"
          />

          <Text style={styles.resultsText}>
            {filteredCharities.length}{" "}
            {filteredCharities.length === 1
              ? "organisation"
              : "organisations"}
          </Text>
        </View>
      </View>

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
              <MaterialIcons
                name={
                  searchText.trim()
                    ? "search-off"
                    : "handshake"
                }
                size={52}
                color="#7C3AED"
              />
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
                <MaterialIcons
                  name="refresh"
                  size={18}
                  color="#FFFFFF"
                />

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

  /* Loading */
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingSpinner: {
    marginTop: 18,
  },

  loadingText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 12,
  },

  headerTextContainer: {
    flex: 1,
  },

  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E293B",
  },

  subtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
    marginTop: 4,
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Search */
  searchContainer: {
    height: 55,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
  },

  searchIcon: {
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    color: "#1E293B",
    fontSize: 14,
  },

  clearButton: {
    padding: 6,
  },

  /* Results */
  resultsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 13,
  },

  resultsLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  resultsText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },

  listContent: {
    paddingBottom: 100,
  },

  /* Charity Card */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",

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
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#7C3AED",
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
    fontWeight: "800",
    color: "#1E293B",
  },

  charityType: {
    marginTop: 4,
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "600",
  },

  /* Verification */
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },

  verifiedBadgeText: {
    color: "#16A34A",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 4,
  },

  unverifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },

  unverifiedBadgeText: {
    color: "#D97706",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 4,
  },

  /* Location */
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
  },

  locationIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 7,
  },

  location: {
    flex: 1,
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
  },

  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    marginLeft: 35,
  },

  distance: {
    color: "#94A3B8",
    fontSize: 11,
    marginLeft: 5,
  },

  /* Needs */
  needsContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 13,
    marginTop: 14,
  },

  needsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  needsLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },

  needsText: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },

  /* Details */
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    marginTop: 16,
    paddingTop: 15,
  },

  detailSection: {
    marginBottom: 14,
  },

  detailTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  detailTitle: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 6,
  },

  detailText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 19,
  },

  contactDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
  },

  contactIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  contactDetail: {
    flex: 1,
    color: "#475569",
    fontSize: 12,
  },

  /* Details Button */
  detailsButton: {
    minHeight: 42,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 7,
  },

  detailsButtonText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "800",
  },

  /* Action Buttons */
  buttonRow: {
    flexDirection: "row",
    marginTop: 7,
  },

  supportButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    marginRight: 5,
  },

  supportText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    marginLeft: 7,
  },

  contactButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 12,
    marginLeft: 5,
  },

  contactText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    marginLeft: 7,
  },

  /* Empty */
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
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  emptyTitle: {
    color: "#1E293B",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyText: {
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 10,
    fontSize: 13,
  },

  clearSearchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 18,
  },

  clearSearchText: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginLeft: 6,
    fontSize: 12,
  },
});