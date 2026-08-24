import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import AppTopBar from "@/src/components/AppTopBar";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useSegments } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const segments = useSegments();
  const isHome = !segments[1] || segments[1] === "index";

  return (
    <View style={{ flex: 1 }}>
      {!isHome && <AppTopBar />}
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
          headerShown: false,
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
            tabBarIcon: () => (
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
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ff0000",
    alignItems: "center",
    justifyContent: "center",
  },
});
