import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
    ActivityIndicator,
    Animated,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";

export default function LoginScreen() {
  const {
    user,
    loginWithGoogle,
    sendOtp,
    verifyOtp,
    verificationId,
    isLoading,
  } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [phone, setPhone] = React.useState("+");
  const [otp, setOtp] = React.useState("");

  // Animated entrance
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={["#0a0a0a", "#111827", "#0f1a2e"]}
      style={styles.gradient}
    >
      {/* Decorative blobs */}
      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />

      <Animated.View
        style={[
          styles.card,
          isTablet && styles.cardTablet,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Logo Area */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandName}>OnlineClasses</Text>
          <Text style={styles.tagline}>
            Your gateway to unlimited knowledge.
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>SIGN IN TO CONTINUE</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Button */}
        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={loginWithGoogle}
          disabled={isLoading}
        >
          {({ pressed }) => (
            <LinearGradient
              colors={pressed ? ["#2a6fe0", "#1a5fd0"] : ["#4285F4", "#357ABD"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <View style={styles.googleIconContainer}>
                    <Ionicons name="logo-google" size={20} color="#4285F4" />
                  </View>
                  <Text style={styles.buttonText}>Continue with Google</Text>
                </>
              )}
            </LinearGradient>
          )}
        </Pressable>

        <View style={styles.phoneBox}>
          <Text style={styles.phoneTitle}>Or login with mobile</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+91XXXXXXXXXX"
            placeholderTextColor="rgba(255,255,255,0.35)"
            keyboardType="phone-pad"
            style={styles.phoneInput}
          />

          {verificationId ? (
            <>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter OTP"
                placeholderTextColor="rgba(255,255,255,0.35)"
                keyboardType="number-pad"
                style={styles.phoneInput}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.otpButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => verifyOtp(otp)}
                disabled={isLoading || otp.trim().length < 4}
              >
                <LinearGradient
                  colors={["#10b981", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Verify OTP</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.otpButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={async () => {
                await sendOtp(phone);
              }}
              disabled={isLoading || phone.trim().length < 8}
            >
              <LinearGradient
                colors={["#10b981", "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </LinearGradient>
            </Pressable>
          )}
        </View>

        <Text style={styles.legalText}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    borderRadius: 9999,
    opacity: 0.15,
  },
  blob1: {
    width: 400,
    height: 400,
    backgroundColor: "#ff0000",
    top: -100,
    left: -100,
  },
  blob2: {
    width: 300,
    height: 300,
    backgroundColor: "#4285F4",
    bottom: -50,
    right: -50,
  },
  card: {
    width: "90%",
    maxWidth: 420,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 28,
    padding: 36,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    // Glass effect via shadow on web
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
  },
  cardTablet: {
    maxWidth: 520,
    padding: 48,
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#ff0000",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  logoImage: {
    width: 56,
    height: 56,
  },
  brandName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  dividerText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    marginHorizontal: 12,
  },
  googleButton: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 20,
  },
  phoneBox: {
    marginTop: 8,
    marginBottom: 16,
    paddingTop: 12,
  },
  phoneTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: "#fff",
    marginBottom: 12,
  },
  otpButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  googleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  legalText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
