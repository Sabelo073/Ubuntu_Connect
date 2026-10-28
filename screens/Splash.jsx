import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from "react-native";

const { height } = Dimensions.get("window");

const BLUE = "#2563EB";
const GREEN = "#22C55E";
const NAVY = "#0F172A";
const SLATE = "#64748B";
const BORDER = "#E2E8F0";

const Splash = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const riseAnim = useRef(new Animated.Value(16)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(riseAnim, {
        toValue: 0,
        duration: 700,
        delay: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace("Login");
    }, 3400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* HERO */}
      <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
        <ImageBackground
          source={require("../assets/splash-icon.jpg")}
          style={styles.heroImage}
          resizeMode="cover"
        >
          <View style={styles.overlay} />
          <View style={styles.bottomShade} />

          <View style={styles.heroText}>
            <View style={styles.accent} />
            <Text style={styles.heroTitle}>Together,</Text>
            <Text style={styles.heroTitleAccent}>we make a difference.</Text>
          </View>
        </ImageBackground>
      </Animated.View>

      {/* CONTENT */}
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: riseAnim }] },
        ]}
      >
        <Animated.View
          style={[styles.logoCard, { transform: [{ scale: logoScale }] }]}
        >
          <Text style={styles.logoBlue}>U</Text>
          <Text style={styles.logoGreen}>C</Text>
        </Animated.View>

        <Text style={styles.brand}>
          <Text style={styles.brandBlue}>Ubuntu </Text>
          <Text style={styles.brandGreen}>Connect</Text>
        </Text>

        <Text style={styles.tagline}>
          Connecting people. Strengthening communities.
        </Text>

        <View style={styles.quoteRow}>
          <View style={styles.rule} />
          <Text style={styles.quote}>"I am because we are."</Text>
          <View style={styles.rule} />
        </View>

        <View style={styles.bottom}>
          <View style={styles.track}>
            <Animated.View
              style={[
                styles.bar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.footer}>Building stronger communities</Text>
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

  /* HERO */
  hero: {
    height: height * 0.5,
    width: "100%",
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: "hidden",
    backgroundColor: NAVY,
  },
  heroImage: {
    width: "100%",
    height: height * 0.5,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.18)",
  },
  bottomShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  heroText: {
    paddingHorizontal: 28,
    paddingBottom: 64,
  },
  accent: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: GREEN,
    marginBottom: 14,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  heroTitleAccent: {
    color: "#BBF7D0",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginTop: 2,
  },

  /* CONTENT */
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 28,
  },
  logoCard: {
    marginTop: -38,
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  logoBlue: {
    fontSize: 32,
    fontWeight: "800",
    color: BLUE,
    letterSpacing: -2,
  },
  logoGreen: {
    fontSize: 32,
    fontWeight: "800",
    color: GREEN,
    letterSpacing: -2,
  },

  brand: {
    marginTop: 20,
    fontSize: 28,
    letterSpacing: 0.2,
  },
  brandBlue: {
    color: BLUE,
    fontWeight: "800",
  },
  brandGreen: {
    color: GREEN,
    fontWeight: "800",
  },
  tagline: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: SLATE,
    textAlign: "center",
  },

  quoteRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 22,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  quote: {
    marginHorizontal: 12,
    fontSize: 12,
    fontStyle: "italic",
    color: SLATE,
  },

  /* LOADING */
  bottom: {
    position: "absolute",
    bottom: 36,
    left: 28,
    right: 28,
    alignItems: "center",
  },
  track: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    backgroundColor: BORDER,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    backgroundColor: GREEN,
    borderRadius: 2,
  },
  footer: {
    marginTop: 10,
    fontSize: 11,
    letterSpacing: 0.5,
    color: "#94A3B8",
  },
});