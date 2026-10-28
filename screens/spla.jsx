import React, { useEffect, useRef } from "react";

import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const { height } = Dimensions.get("window");

const Splash = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const contentAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),

      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 45,
        useNativeDriver: true,
      }),

      Animated.timing(contentAnim, {
        toValue: 0,
        duration: 800,
        delay: 250,
        useNativeDriver: true,
      }),

      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2700,
        useNativeDriver: false,
      }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace("Login");
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0F172A"
      />

      {/* HERO IMAGE */}
      <Animated.View
        style={[
          styles.imageSection,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <ImageBackground
  source={require("../assets/splash-icon.jpg")}
  style={{
    width: "100%",
    height: 250,
  }}
  resizeMode="cover"
>
          {/* Dark overlay */}
          <View style={styles.imageOverlay} />

          {/* Top branding */}
          <SafeAreaView style={styles.topArea}>
            <View style={styles.topBadge}>
              <MaterialIcons
                name="volunteer-activism"
                size={17}
                color="#FFFFFF"
              />

              <Text style={styles.topBadgeText}>
                COMMUNITY • GIVING • IMPACT
              </Text>
            </View>
          </SafeAreaView>

          {/* Image message */}
          <View style={styles.heroMessage}>
            <Animated.View
              style={{
                transform: [
                  {
                    scale: logoScale,
                  },
                ],
              }}
            >
              <View style={styles.heroIcon}>
                <MaterialIcons
                  name="groups"
                  size={34}
                  color="#FFFFFF"
                />
              </View>
            </Animated.View>

            <Text style={styles.heroTitle}>
              Together,
            </Text>

            <Text style={styles.heroTitleGreen}>
              we make a difference.
            </Text>
          </View>
        </ImageBackground>
      </Animated.View>

      {/* BOTTOM CONTENT */}
      <Animated.View
        style={[
          styles.bottomSection,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: contentAnim,
              },
            ],
          },
        ]}
      >
        {/* Floating Logo */}
        <Animated.View
          style={[
            styles.logoOuter,
            {
              transform: [
                {
                  scale: logoScale,
                },
              ],
            },
          ]}
        >
          <View style={styles.logoInner}>
            <Text style={styles.logoBlue}>
              U
            </Text>

            <Text style={styles.logoGreen}>
              C
            </Text>
          </View>

          <View style={styles.logoHeart}>
            <MaterialIcons
              name="favorite"
              size={13}
              color="#FFFFFF"
            />
          </View>
        </Animated.View>

        {/* Brand */}
        <Text style={styles.brandName}>
          UBUNTU
        </Text>

        <Text style={styles.brandNameGreen}>
          CONNECT
        </Text>

        {/* Tagline */}
        <Text style={styles.tagline}>
          Connecting people.
        </Text>

        <Text style={styles.taglineSecond}>
          Strengthening communities.
        </Text>

        {/* Ubuntu quote */}
        <View style={styles.quoteContainer}>
          <View style={styles.quoteLine} />

          <View style={styles.quoteContent}>
            <MaterialIcons
              name="groups"
              size={18}
              color="#2563EB"
            />

            <Text style={styles.quote}>
              "I am because we are."
            </Text>
          </View>

          <View style={styles.quoteLine} />
        </View>

        {/* Loading */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingHeader}>
            <Text style={styles.loadingText}>
              Building stronger communities
            </Text>

            <MaterialIcons
              name="favorite"
              size={14}
              color="#22C55E"
            />
          </View>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDot} />

          <Text style={styles.footerText}>
            POWERED BY UBUNTU
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

export default Splash;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  /* =========================
     HERO IMAGE
  ========================= */

  imageSection: {
    height: height * 0.55,
    width: "100%",
  },

  heroImage: {
    flex: 1,
    width: "100%",
    justifyContent: "space-between",
  },

  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
  },

  topArea: {
    paddingHorizontal: 22,
  },

  topBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },

  topBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginLeft: 6,
  },

  heroMessage: {
    paddingHorizontal: 24,
    paddingBottom: 42,
  },

  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  heroTitleGreen: {
    color: "#86EFAC",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 1,
  },

  /* =========================
     BOTTOM CONTENT
  ========================= */

  bottomSection: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingHorizontal: 24,
    position: "relative",
  },

  /* =========================
     LOGO
  ========================= */

  logoOuter: {
    width: 82,
    height: 82,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",

    marginTop: -41,

    shadowColor: "#1E293B",
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
  },

  logoInner: {
    width: 68,
    height: 68,
    borderRadius: 21,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  logoBlue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#2563EB",
    letterSpacing: -3,
  },

  logoGreen: {
    fontSize: 32,
    fontWeight: "900",
    color: "#22C55E",
    letterSpacing: -3,
  },

  logoHeart: {
    position: "absolute",
    right: -3,
    top: -4,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  /* =========================
     BRAND
  ========================= */

  brandName: {
    fontSize: 27,
    fontWeight: "900",
    color: "#2563EB",
    letterSpacing: 4,
    marginTop: 13,
  },

  brandNameGreen: {
    fontSize: 27,
    fontWeight: "900",
    color: "#22C55E",
    letterSpacing: 4,
    marginTop: -3,
  },

  tagline: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 9,
  },

  taglineSecond: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 3,
  },

  /* =========================
     UBUNTU QUOTE
  ========================= */

  quoteContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 13,
  },

  quoteLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },

  quoteContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },

  quote: {
    color: "#64748B",
    fontSize: 12,
    fontStyle: "italic",
    marginLeft: 5,
  },

  /* =========================
     LOADING
  ========================= */

  loadingContainer: {
    width: "100%",
    marginTop: 14,
  },

  loadingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },

  loadingText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginRight: 5,
  },

  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    backgroundColor: "#22C55E",
    borderRadius: 10,
  },

  /* =========================
     FOOTER
  ========================= */

  footer: {
    position: "absolute",
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
    marginRight: 7,
  },

  footerText: {
    color: "#CBD5E1",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
  },

});