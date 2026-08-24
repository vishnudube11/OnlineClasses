import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AppTopBarProps = {
  variant?: "default" | "onHero";
};

export default function AppTopBar({ variant = "default" }: AppTopBarProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const isDark = colorScheme === "dark";
  const showLogoutLabel = width >= 420;
  const insets = useSafeAreaInsets();
  const onHero = variant === "onHero";

  const iconColor = onHero ? "#fff" : theme.text;
  const labelColor = onHero ? "#fff" : isDark ? "#eee" : "#333";
  const iconMuted = onHero ? "rgba(255,255,255,0.95)" : isDark ? "#ddd" : "#444";

  return (
    <View
      style={[
        styles.container,
        onHero
          ? [styles.containerOnHero, { paddingTop: insets.top + 8 }]
          : {
              backgroundColor: theme.background,
              borderBottomColor: isDark ? "#222" : "#e5e5e5",
              paddingTop: insets.top,
              height: 56 + insets.top,
            },
      ]}
    >
      <View style={styles.logoRow}>
        <View style={[styles.logoIconBg, onHero && styles.logoIconBgOnHero]}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        {isWide && (
          <Text style={[styles.logoText, { color: onHero ? "#fff" : theme.text }]}>
            OnlineClasses
          </Text>
        )}
      </View>

      <View style={styles.right}>
        <Pressable style={styles.iconButton}>
          <Ionicons name="notifications-outline" size={22} color={iconColor} />
        </Pressable>
        {user && (
          <View
            style={[
              styles.accountCluster,
              onHero
                ? styles.accountClusterOnHero
                : {
                    borderColor: isDark ? "#333" : "#e8e8e8",
                    backgroundColor: isDark ? "#1a1a1a" : "#f7f7f7",
                  },
            ]}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(user.name || "S").charAt(0).toUpperCase()}
              </Text>
            </View>
            <Pressable
              onPress={logout}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.logoutButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("auth.logout")}
            >
              <Ionicons name="log-out-outline" size={18} color={iconMuted} />
              {showLogoutLabel && (
                <Text style={[styles.logoutLabel, { color: labelColor }]}>
                  {t("auth.logout")}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  containerOnHero: {
    minHeight: 48,
    paddingHorizontal: 0,
    marginBottom: 16,
    borderBottomWidth: 0,
    backgroundColor: "transparent",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#ff0000",
    alignItems: "center",
    justifyContent: "center",
  },
  logoIconBgOnHero: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  logoImage: {
    width: 20,
    height: 20,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
  accountCluster: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 22,
    paddingLeft: 2,
    paddingRight: 4,
    paddingVertical: 2,
    gap: 2,
    marginLeft: 4,
  },
  accountClusterOnHero: {
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#c8102e",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
  },
  logoutButtonPressed: {
    opacity: 0.7,
  },
  logoutLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
