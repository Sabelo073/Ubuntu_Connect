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
  const [selectedCharity, setSelectedCharity] = useState(null);
  const [loading, setLoading] = useState(true);

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
            "Please allow location access so Ubuntu Connect can show nearby charities."
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
                latitude: geocoded[0].latitude,
                longitude: geocoded[0].longitude,
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
        console.log("Charity loading error:", error);

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

    const charityMarkers = charities
      .map((charity) => {
        const name = String(
          charity.name || "Charity Organisation"
        ).replace(/'/g, "\\'");

        const address = String(
          charity.address || "Location available"
        ).replace(/'/g, "\\'");

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

          const userLatitude = ${userLocation.latitude};
          const userLongitude = ${userLocation.longitude};

          const map = L.map("map").setView(
            [userLatitude, userLongitude],
            13
          );

          // OpenStreetMap tiles
          L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              maxZoom: 19,
              attribution:
                '&copy; OpenStreetMap contributors'
            }
          ).addTo(map);

          // User location marker
          const userIcon = L.divIcon({
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
            [userLatitude, userLongitude],
            {
              icon: userIcon
            }
          )
          .addTo(map)
          .bindPopup("<strong>You are here</strong>");

          // Charity markers
          ${charityMarkers}

          // Send selected charity back to React Native
          function selectCharity(charityId) {

            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: "CHARITY_SELECTED",
                id: charityId
              })
            );

          }

        </script>

      </body>
      </html>
    `;
  };

  // ============================================================
  // HANDLE WEBVIEW MESSAGES
  // ============================================================
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(
        event.nativeEvent.data
      );

      if (data.type === "CHARITY_SELECTED") {
        const charity = charities.find(
          (item) => item.id === data.id
        );

        if (charity) {
          setSelectedCharity(charity);
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
      <View style={styles.loadingContainer}>

        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Loading nearby charities...
        </Text>

      </View>
    );
  }

  // ============================================================
  // SCREEN
  // ============================================================
  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color="#0F172A"
          />
        </TouchableOpacity>

        <View>

          <Text style={styles.headerTitle}>
            Nearby Charities
          </Text>

          <Text style={styles.headerSubtitle}>
            Find help and pickup locations
          </Text>

        </View>

      </View>

      {/* FREE OPENSTREETMAP / LEAFLET MAP */}
      <WebView
        style={styles.map}
        originWhitelist={["*"]}
        source={{
          html: createMapHTML(),
        }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.mapLoading}>

            <ActivityIndicator
              size="large"
              color="#2563EB"
            />

          </View>
        )}
      />

      {/* SELECTED CHARITY CARD */}
      {selectedCharity && (
        <View style={styles.charityCard}>

          <View style={styles.charityIcon}>

            <MaterialIcons
              name="volunteer-activism"
              size={28}
              color="#22C55E"
            />

          </View>

          <View style={styles.charityInfo}>

            <Text style={styles.charityName}>
              {selectedCharity.name ||
                "Charity Organisation"}
            </Text>

            <Text style={styles.charityAddress}>
              {selectedCharity.address ||
                "Location available"}
            </Text>

          </View>

          <TouchableOpacity
            style={styles.directionButton}
            onPress={getDirections}
          >

            <MaterialIcons
              name="directions"
              size={20}
              color="#FFFFFF"
            />

            <Text style={styles.directionText}>
              Directions
            </Text>

          </TouchableOpacity>

        </View>
      )}

      {/* NO CHARITIES */}
      {!loading &&
        charities.length === 0 && (
          <View style={styles.emptyCard}>

            <MaterialIcons
              name="location-off"
              size={30}
              color="#64748B"
            />

            <Text style={styles.emptyTitle}>
              No charity locations found
            </Text>

            <Text style={styles.emptyText}>
              Charity locations will appear here
              once they have a valid address.
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

  map: {
    flex: 1,
  },

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