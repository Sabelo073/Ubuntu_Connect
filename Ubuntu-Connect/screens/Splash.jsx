import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";

const Splash = ({ navigation }) => {

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("Login");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>

      <View style={styles.logoContainer}>
        <Text style={styles.logoBlue}>U</Text>
        <Text style={styles.logoGreen}>C</Text>
      </View>

      <Text style={styles.title}>
        UBUNTU
      </Text>

      <Text style={styles.title2}>
        CONNECT
      </Text>

      <View style={{ marginTop: 8, alignItems: "center" }}>
        <Text style={styles.tagline}>Connecting hearts.</Text>
        <Text style={styles.tagline}>Changing lives.</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.loadingDot} />
        <Text style={styles.footerText}>
          Powered by Ubuntu
        </Text>
      </View>

    </View>
  );
};



const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },

    logoContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",

        shadowColor: "#2563EB",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,

        marginBottom: 30,
    },

    logoBlue: {
        fontSize: 64,
        fontWeight: "900",
        color: "#2563EB",
    },

    logoGreen: {
        fontSize: 64,
        fontWeight: "900",
        color: "#22C55E",
    },

    title: {
        fontSize: 34,
        fontWeight: "900",
        color: "#2563EB",
        letterSpacing: 3,
    },

    title2: {
        fontSize: 34,
        fontWeight: "900",
        color: "#22C55E",
        letterSpacing: 3,
        marginBottom: 20,
    },

    tagline: {
        fontSize: 17,
        color: "#64748B",
        textAlign: "center",
        fontWeight: "500",
        lineHeight: 26,
    },

    footer: {
        position: "absolute",
        bottom: 60,
        alignItems: "center",
    },

    footerText: {
        color: "#94A3B8",
        fontSize: 13,
        letterSpacing: 1,
    },

    loadingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#22C55E",
        marginBottom: 12,
    },
});


export default Splash;