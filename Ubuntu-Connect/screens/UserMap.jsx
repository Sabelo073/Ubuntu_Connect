import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
  Platform,
  TextInput,
  FlatList,
  Keyboard,
} from "react-native";

import { WebView } from "react-native-webview";
import * as Location from "expo-location";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebaseConfig";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const UserMap = ({ navigation }) => {
  const [userLocation, setUserLocation] = useState(null);

  const [charities, setCharities] = useState([]);

  const [selectedCharity, setSelectedCharity] =
    useState(null);

  const [loading, setLoading] = useState(true);

  // SEARCH
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] =
    useState([]);

  const [searching, setSearching] =
    useState(false);

  // ============================================================
  // GET USER LOCATION
  // ============================================================

  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          Alert.alert(
            "Location Permission",
            "Please allow location access so Ubuntu Connect can show nearby locations."
          );

          // Johannesburg fallback
          setUserLocation({
            latitude: -26.2041,
            longitude: 28.0473,
          });

          return;
        }

        const location =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.log("Location error:", error);

        // Johannesburg fallback
        setUserLocation({
          latitude: -26.2041,
          longitude: 28.0473,
        });
      }
    };

    getUserLocation();
  }, []);

  // ============================================================
  // LOAD CHARITIES FROM FIRESTORE
  // ============================================================

  useEffect(() => {
    const charitiesRef = collection(db, "charities");

    const unsubscribe = onSnapshot(
      charitiesRef,
      async (snapshot) => {
        const charityData = [];

        for (const charityDoc of snapshot.docs) {
          const data = charityDoc.data();

          const address =
            data.address ||
            data.location ||
            "";

          if (!address) {
            continue;
          }

          try {
            const geocoded =
              await Location.geocodeAsync(address);

            if (geocoded.length > 0) {
              charityData.push({
                id: charityDoc.id,
                ...data,
                address,
                latitude:
                  geocoded[0].latitude,
                longitude:
                  geocoded[0].longitude,
              });
            }
          } catch (error) {
            console.log(
              "Could not locate charity:",
              data.name,
              error
            );
          }
        }

        setCharities(charityData);
        setLoading(false);
      },

      (error) => {
        console.log(
          "Charity loading error:",
          error
        );

        setLoading(false);

        Alert.alert(
          "Error",
          "Could not load charity locations."
        );
      }
    );

    return () => unsubscribe();
  }, []);

  // ============================================================
  // SEARCH LOCATIONS USING OPENSTREETMAP NOMINATIM
  // ============================================================

  const searchLocations = async () => {
    const query = searchText.trim();

    if (!query) {
      Alert.alert(
        "Search",
        "Please enter a charity or location to search for."
      );

      return;
    }

    Keyboard.dismiss();

    setSearching(true);
    setSearchResults([]);

    try {
      const url =
        "https://nominatim.openstreetmap.org/search" +
        `?format=jsonv2` +
        `&q=${encodeURIComponent(query)}` +
        `&limit=8` +
        `&addressdetails=1`;

     const response = await fetch(url, {
  headers: {
    Accept: "application/json",
    "User-Agent": "UbuntuConnect/1.0 (University Student Project)",
  },
});

      if (!response.ok) {
        throw new Error(
          `Search failed: ${response.status}`
        );
      }

      const data = await response.json();

      const formattedResults = data.map(
        (item, index) => ({
          id:
            item.place_id?.toString() ||
            `search-${index}`,

          name:
            item.name ||
            "Location",

          address:
            item.display_name ||
            "Address unavailable",

          latitude: parseFloat(item.lat),

          longitude: parseFloat(item.lon),

          type:
            item.type ||
            "location",

          source: "search",
        })
      );

      setSearchResults(formattedResults);

      if (formattedResults.length === 0) {
        Alert.alert(
          "No Results",
          "No matching locations were found. Try a different charity name, address or area."
        );
      }
    } catch (error) {
      console.log(
        "Location search error:",
        error
      );

      Alert.alert(
        "Search Error",
        "Could not search for this location. Please check your internet connection and try again."
      );
    } finally {
      setSearching(false);
    }
  };

  // ============================================================
  // SELECT SEARCH RESULT
  // ============================================================

  const selectSearchResult = (result) => {
    setSelectedCharity(result);

    // Keep result visible on map
    setSearchResults([result]);

    Keyboard.dismiss();
  };

  // ============================================================
  // CLEAR SEARCH
  // ============================================================

  const clearSearch = () => {
    setSearchText("");
    setSearchResults([]);
    setSelectedCharity(null);
    Keyboard.dismiss();
  };

  // ============================================================
  // OPEN DIRECTIONS
  // ============================================================

  const getDirections = async () => {
    if (!selectedCharity || !userLocation) {
      return;
    }

    const destination =
      `${selectedCharity.latitude},${selectedCharity.longitude}`;

    const origin =
      `${userLocation.latitude},${userLocation.longitude}`;

    let url;

    if (Platform.OS === "android") {
      url =
        `https://www.google.com/maps/dir/?api=1` +
        `&origin=${origin}` +
        `&destination=${destination}` +
        `&travelmode=driving`;
    } else {
      url =
        `http://maps.apple.com/?saddr=${origin}` +
        `&daddr=${destination}`;
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(
        "Directions Error",
        "Could not open the maps application."
      );
    }
  };

  // ============================================================
  // CREATE LEAFLET MAP
  // ============================================================

  const createMapHTML = () => {
    if (!userLocation) {
      return "";
    }

    // ----------------------------------------------------------
    // FIRESTORE CHARITY MARKERS
    // ----------------------------------------------------------

    const charityMarkers = charities
      .map((charity) => {
        const name = String(
          charity.name ||
            "Charity Organisation"
        )
          .replace(/\\/g, "\\\\")
          .replace(/'/g, "\\'");

        const address = String(
          charity.address ||
            "Location available"
        )
          .replace(/\\/g, "\\\\")
          .replace(/'/g, "\\'");

        return `
          L.marker(
            [${charity.latitude}, ${charity.longitude}]
          )
          .addTo(map)
          .bindPopup(
            '<div style="min-width:180px;">' +
            '<strong>${name}</strong><br/>' +
            '<span style="font-size:12px;color:#64748B;">${address}</span>' +
            '<br/><br/>' +
            '<button onclick="selectCharity(\\'${charity.id}\\')" ' +
            'style="background:#2563EB;color:white;border:none;' +
            'padding:8px 12px;border-radius:8px;font-weight:bold;">' +
            'View Charity</button>' +
            '</div>'
          );
        `;
      })
      .join("\n");

    // ----------------------------------------------------------
    // SEARCH RESULT MARKERS
    // ----------------------------------------------------------

    const searchMarkers = searchResults
      .map((result, index) => {
        const name = String(
          result.name || "Search Result"
        )
          .replace(/\\/g, "\\\\")
          .replace(/'/g, "\\'");

        const address = String(
          result.address ||
            "Location available"
        )
          .replace(/\\/g, "\\\\")
          .replace(/'/g, "\\'");

        return `
          L.marker(
            [${result.latitude}, ${result.longitude}]
          )
          .addTo(map)
          .bindPopup(
            '<div style="min-width:190px;">' +
            '<strong>${name}</strong><br/>' +
            '<span style="font-size:12px;color:#64748B;">${address}</span>' +
            '<br/><br/>' +
            '<button onclick="selectSearchResult(${index})" ' +
            'style="background:#059669;color:white;border:none;' +
            'padding:8px 12px;border-radius:8px;font-weight:bold;">' +
            'Select Location</button>' +
            '</div>'
          );
        `;
      })
      .join("\n");

    // ----------------------------------------------------------
    // SEARCH RESULT DATA FOR LEAFLET
    // ----------------------------------------------------------

    const searchResultJSON =
      JSON.stringify(searchResults);

    return `
      <!DOCTYPE html>

      <html>

      <head>

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
        />

        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />

        <script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js">
        </script>

        <style>

          html,
          body,
          #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
          }

          body {
            overflow: hidden;
          }

          .leaflet-control-attribution {
            font-size: 9px;
          }

        </style>

      </head>

      <body>

        <div id="map"></div>

        <script>

          const userLatitude =
            ${userLocation.latitude};

          const userLongitude =
            ${userLocation.longitude};

          const map =
            L.map("map").setView(
              [
                userLatitude,
                userLongitude
              ],
              13
            );

          // ----------------------------------------------------
          // OPENSTREETMAP TILES
          // ----------------------------------------------------

          L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              maxZoom: 19,

              attribution:
                '&copy; OpenStreetMap contributors'
            }
          ).addTo(map);

          // ----------------------------------------------------
          // USER LOCATION MARKER
          // ----------------------------------------------------

          const userIcon =
            L.divIcon({
              className: "",

              html:
                '<div style="' +
                'width:18px;' +
                'height:18px;' +
                'background:#2563EB;' +
                'border:4px solid white;' +
                'border-radius:50%;' +
                'box-shadow:0 2px 8px rgba(0,0,0,0.35);' +
                '"></div>',

              iconSize: [26, 26],

              iconAnchor: [13, 13]
            });

          L.marker(
            [
              userLatitude,
              userLongitude
            ],
            {
              icon: userIcon
            }
          )
          .addTo(map)
          .bindPopup(
            "<strong>You are here</strong>"
          );

          // ----------------------------------------------------
          // FIRESTORE CHARITY MARKERS
          // ----------------------------------------------------

          ${charityMarkers}

          // ----------------------------------------------------
          // SEARCH RESULT MARKERS
          // ----------------------------------------------------

          ${searchMarkers}

          const searchResults =
            ${searchResultJSON};

          // ----------------------------------------------------
          // SELECT FIRESTORE CHARITY
          // ----------------------------------------------------

          function selectCharity(charityId) {

            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: "CHARITY_SELECTED",
                id: charityId
              })
            );

          }

          // ----------------------------------------------------
          // SELECT SEARCH RESULT
          // ----------------------------------------------------

          function selectSearchResult(index) {

            const result =
              searchResults[index];

            if (!result) {
              return;
            }

            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: "SEARCH_RESULT_SELECTED",
                result: result
              })
            );

          }

          // ----------------------------------------------------
          // FIT MAP TO SEARCH RESULT
          // ----------------------------------------------------

          ${
            searchResults.length > 0
              ? `
                map.setView(
                  [
                    ${searchResults[0].latitude},
                    ${searchResults[0].longitude}
                  ],
                  15
                );
              `
              : ""
          }

        </script>

      </body>

      </html>
    `;
  };

  // ============================================================
  // HANDLE WEBVIEW MESSAGES
  // ============================================================

  const handleWebViewMessage = (
    event
  ) => {
    try {
      const data = JSON.parse(
        event.nativeEvent.data
      );

      // Firestore charity selected
      if (
        data.type ===
        "CHARITY_SELECTED"
      ) {
        const charity =
          charities.find(
            (item) =>
              item.id === data.id
          );

        if (charity) {
          setSelectedCharity(charity);
        }
      }

      // Search result selected
      if (
        data.type ===
        "SEARCH_RESULT_SELECTED"
      ) {
        if (data.result) {
          setSelectedCharity(
            data.result
          );
        }
      }
    } catch (error) {
      console.log(
        "Map message error:",
        error
      );
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (!userLocation || loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text
          style={styles.loadingText}
        >
          Loading map...
        </Text>
      </View>
    );
  }

  // ============================================================
  // SCREEN
  // ============================================================

  return (
    <View style={styles.container}>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color="#0F172A"
          />
        </TouchableOpacity>

        <View>
          <Text
            style={styles.headerTitle}
          >
            Nearby Charities
          </Text>

          <Text
            style={styles.headerSubtitle}
          >
            Find help and locations
          </Text>
        </View>

      </View>

      {/* ======================================================
          SEARCH BAR
      ====================================================== */}

      <View
        style={styles.searchContainer}
      >

        <View
          style={styles.searchBox}
        >

          <MaterialIcons
            name="search"
            size={23}
            color="#64748B"
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Search charity or location..."
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={
              searchLocations
            }
            returnKeyType="search"
          />

          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={clearSearch}
            >
              <MaterialIcons
                name="close"
                size={21}
                color="#64748B"
              />
            </TouchableOpacity>
          )}

        </View>

        <TouchableOpacity
          style={styles.searchButton}
          onPress={searchLocations}
          disabled={searching}
        >

          {searching ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <MaterialIcons
              name="search"
              size={21}
              color="#FFFFFF"
            />
          )}

        </TouchableOpacity>

      </View>

      {/* ======================================================
          SEARCH RESULTS
      ====================================================== */}

      {searchResults.length > 0 && (
        <View
          style={styles.resultsContainer}
        >

          <View
            style={styles.resultsHeader}
          >

            <Text
              style={styles.resultsTitle}
            >
              Search Results
            </Text>

            <TouchableOpacity
              onPress={() =>
                setSearchResults([])
              }
            >
              <Text
                style={styles.clearResults}
              >
                Clear
              </Text>
            </TouchableOpacity>

          </View>

          <FlatList
            data={searchResults}
            keyExtractor={(item) =>
              item.id.toString()
            }
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() =>
                  selectSearchResult(
                    item
                  )
                }
              >

                <View
                  style={styles.resultIcon}
                >
                  <MaterialIcons
                    name="location-on"
                    size={22}
                    color="#059669"
                  />
                </View>

                <View
                  style={styles.resultInfo}
                >

                  <Text
                    style={styles.resultName}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>

                  <Text
                    style={styles.resultAddress}
                    numberOfLines={2}
                  >
                    {item.address}
                  </Text>

                </View>

                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color="#94A3B8"
                />

              </TouchableOpacity>
            )}
          />

        </View>
      )}

      {/* ======================================================
          MAP
      ====================================================== */}

      <WebView
        style={styles.map}
        originWhitelist={["*"]}
        source={{
          html: createMapHTML(),
        }}
        onMessage={
          handleWebViewMessage
        }
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View
            style={styles.mapLoading}
          >
            <ActivityIndicator
              size="large"
              color="#2563EB"
            />
          </View>
        )}
      />

      {/* ======================================================
          SELECTED LOCATION CARD
      ====================================================== */}

      {selectedCharity && (
        <View
          style={styles.charityCard}
        >

          <View
            style={styles.charityIcon}
          >

            <MaterialIcons
              name="location-on"
              size={28}
              color="#22C55E"
            />

          </View>

          <View
            style={styles.charityInfo}
          >

            <Text
              style={styles.charityName}
              numberOfLines={1}
            >
              {selectedCharity.name ||
                "Location"}
            </Text>

            <Text
              style={styles.charityAddress}
              numberOfLines={2}
            >
              {selectedCharity.address ||
                "Location available"}
            </Text>

          </View>

          <TouchableOpacity
            style={
              styles.directionButton
            }
            onPress={getDirections}
          >

            <MaterialIcons
              name="directions"
              size={20}
              color="#FFFFFF"
            />

            <Text
              style={styles.directionText}
            >
              Directions
            </Text>

          </TouchableOpacity>

        </View>
      )}

      {/* ======================================================
          NO ADMIN CHARITIES
      ====================================================== */}

      {!loading &&
        charities.length === 0 &&
        searchResults.length === 0 && (
          <View
            style={styles.emptyCard}
          >

            <MaterialIcons
              name="search"
              size={30}
              color="#64748B"
            />

            <Text
              style={styles.emptyTitle}
            >
              Search for a charity
            </Text>

            <Text
              style={styles.emptyText}
            >
              You can search for charities,
              organisations, shelters or
              other locations using the
              search bar above.
            </Text>

          </View>
        )}

    </View>
  );
};

export default UserMap;

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#64748B",
  },

  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    height: 85,
    paddingHorizontal: 18,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    marginRight: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#64748B",
  },

  // ==========================================================
  // SEARCH
  // ==========================================================

  searchContainer: {
    position: "absolute",
    top: 94,
    left: 15,
    right: 15,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  searchBox: {
    flex: 1,
    height: 50,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    marginRight: 7,
    fontSize: 14,
    color: "#0F172A",
  },

  searchButton: {
    width: 50,
    height: 50,
    marginLeft: 8,
    borderRadius: 13,
    backgroundColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  // ==========================================================
  // SEARCH RESULTS
  // ==========================================================

  resultsContainer: {
    position: "absolute",
    top: 150,
    left: 15,
    right: 15,
    maxHeight: 300,
    zIndex: 19,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    elevation: 7,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    overflow: "hidden",
  },

  resultsHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  resultsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  clearResults: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  resultIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  resultInfo: {
    flex: 1,
    marginRight: 5,
  },

  resultName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  resultAddress: {
    marginTop: 3,
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
  },

  // ==========================================================
  // MAP
  // ==========================================================

  map: {
    flex: 1,
  },

  // ==========================================================
  // SELECTED CHARITY / LOCATION
  // ==========================================================

  charityCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  charityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  charityInfo: {
    flex: 1,
    marginRight: 8,
  },

  charityName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  charityAddress: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
  },

  directionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },

  directionText: {
    marginLeft: 5,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  // ==========================================================
  // EMPTY STATE
  // ==========================================================

  emptyCard: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 30,
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    elevation: 5,
  },

  emptyTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  emptyText: {
    marginTop: 5,
    textAlign: "center",
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
  },

});