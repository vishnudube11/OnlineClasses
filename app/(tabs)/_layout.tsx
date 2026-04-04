import { Ionicons } from "@expo/vector-icons";
import { Link, Tabs } from "expo-router";
import React from "react";
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";

import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useAuth } from "@/src/context/AuthContext";

function CustomHeader() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  // Pre-flatten the style so expo-router's <Slot> never receives an array
  const searchBtnStyle = StyleSheet.flatten([
    styles.iconButton,
    styles.searchIconBtn,
    { backgroundColor: theme.tint + "15" },
  ]);

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: theme.background,
          borderBottomColor: colorScheme === "dark" ? "#222" : "#e5e5e5",
        },
      ]}
    >
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoIconBg}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        {isWide && (
          <Text style={[styles.logoText, { color: theme.text }]}>
            OnlineClasses
          </Text>
        )}
      </View>

      {/* Right icons */}
      <View style={styles.rightIcons}>
        <Pressable style={styles.iconButton}>
          <Ionicons name="notifications-outline" size={22} color={theme.text} />
        </Pressable>
        <Link href="/two" asChild>
          <Pressable style={searchBtnStyle}>
            <Ionicons name="search" size={18} color={theme.text} />
          </Pressable>
        </Link>
        {user && (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(user.name || "S").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#ff0000",
        tabBarInactiveTintColor: Colors[colorScheme ?? "light"].tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].background,
          borderTopColor: isDark ? "#222" : "#e5e5e5",
          borderTopWidth: 1,
          height: 58,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
        header: () => <CustomHeader />,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shorts"
        options={{
          title: "Shorts",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "flash" : "flash-outline"}
              color={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarIcon: ({ color }) => (
            <View style={styles.addButton}>
              <Ionicons name="add" color="#fff" size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: "Subscriptions",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "albums" : "albums-outline"}
              color={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "time" : "time-outline"}
              color={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: "You",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              color={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen name="two" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  logoContainer: {
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
  logoImage: {
    width: 20,
    height: 20,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
  searchIconBtn: {
    paddingHorizontal: 12,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ff0000",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ff0000",
    alignItems: "center",
    justifyContent: "center",
  },
});
