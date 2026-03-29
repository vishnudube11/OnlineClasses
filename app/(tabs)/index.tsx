import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";

const COURSES = [
  {
    id: "1",
    title: "Java",
    icon: "cafe" as const,
    gradient: ["#e74c3c", "#c0392b"] as const,
  },
  {
    id: "2",
    title: "Python",
    icon: "logo-python" as const,
    gradient: ["#3498db", "#2980b9"] as const,
  },
  {
    id: "3",
    title: "Indian Dance",
    icon: "musical-notes" as const,
    gradient: ["#9b59b6", "#8e44ad"] as const,
  },
  {
    id: "10",
    title: "Hip Hop Dance",
    icon: "flash" as const,
    gradient: ["#ff5f6d", "#ffc371"] as const,
  },
  {
    id: "11",
    title: "Yoga",
    icon: "leaf" as const,
    gradient: ["#56ab2f", "#a8e063"] as const,
  },
  {
    id: "12",
    title: "Fitness Training",
    icon: "barbell" as const,
    gradient: ["#232526", "#414345"] as const,
  },
  {
    id: "4",
    title: "React Native",
    icon: "logo-react" as const,
    gradient: ["#61dafb", "#21b6e0"] as const,
  },
  {
    id: "5",
    title: "Web Development",
    icon: "code-slash" as const,
    gradient: ["#2ecc71", "#27ae60"] as const,
  },
  {
    id: "13",
    title: "Digital Marketing",
    icon: "trending-up" as const,
    gradient: ["#0f2027", "#2c5364"] as const,
  },
  {
    id: "14",
    title: "Graphic Design",
    icon: "brush" as const,
    gradient: ["#8360c3", "#2ebf91"] as const,
  },
  {
    id: "6",
    title: "UI/UX Design",
    icon: "color-palette" as const,
    gradient: ["#f39c12", "#d68910"] as const,
  },
  {
    id: "7",
    title: "Machine Learning",
    icon: "hardware-chip" as const,
    gradient: ["#e67e22", "#ca6f1e"] as const,
  },
  {
    id: "15",
    title: "Data Science",
    icon: "stats-chart" as const,
    gradient: ["#2193b0", "#6dd5ed"] as const,
  },
  {
    id: "16",
    title: "Cybersecurity",
    icon: "shield-checkmark" as const,
    gradient: ["#141e30", "#243b55"] as const,
  },
  {
    id: "17",
    title: "Microsoft Excel",
    icon: "grid" as const,
    gradient: ["#11998e", "#38ef7d"] as const,
  },
  {
    id: "18",
    title: "Spoken English",
    icon: "chatbubbles" as const,
    gradient: ["#f7971e", "#ffd200"] as const,
  },
  {
    id: "19",
    title: "Cooking",
    icon: "restaurant" as const,
    gradient: ["#ff512f", "#dd2476"] as const,
  },
  {
    id: "20",
    title: "Meditation",
    icon: "moon" as const,
    gradient: ["#0f0c29", "#302b63"] as const,
  },
  {
    id: "8",
    title: "Photography",
    icon: "camera" as const,
    gradient: ["#1abc9c", "#17a589"] as const,
  },
  {
    id: "9",
    title: "Music Production",
    icon: "headset" as const,
    gradient: ["#e91e8c", "#c2185b"] as const,
  },
];

export default function CourseSelectionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [visitorCountError, setVisitorCountError] = useState<string | null>(
    null,
  );
  const { width } = useWindowDimensions();

  const paymentsEnabled =
    (process.env.EXPO_PUBLIC_ENABLE_PAYMENTS ?? "true").toLowerCase() ===
    "true";

  // Responsive: 2 cols on mobile, 3 on tablet, 4 on wide desktop
  const numCols = width >= 1200 ? 4 : width >= 768 ? 3 : 2;
  const cardWidth = `${Math.floor(100 / numCols) - 2}%`;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
        if (!baseUrl) {
          setVisitorCountError("Missing EXPO_PUBLIC_API_BASE_URL");
          return;
        }

        setVisitorCountError(null);

        const sessionKey = "vm_visitors_incremented";
        const canUseSessionStorage =
          typeof window !== "undefined" &&
          typeof window.sessionStorage !== "undefined";

        const alreadyIncremented = canUseSessionStorage
          ? window.sessionStorage.getItem(sessionKey) === "1"
          : false;

        const url = alreadyIncremented
          ? `${baseUrl}/api/visitors`
          : `${baseUrl}/api/visitors/increment`;

        const res = await fetch(url);

        if (!res.ok) {
          setVisitorCountError(`Visitor API error: ${res.status}`);
          return;
        }
        const data = await res.json();

        if (!alreadyIncremented && canUseSessionStorage) {
          window.sessionStorage.setItem(sessionKey, "1");
        }

        if (!cancelled && typeof data?.count === "number") {
          setVisitorCount(data.count);
        }
      } catch (_e) {
        setVisitorCountError("Failed to reach visitor API");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const q = encodeURIComponent(searchQuery.trim());
      router.push((paymentsEnabled ? `/pay/${q}` : `/course/${q}`) as any);
    }
  };

  const handleCourseSelect = (courseTitle: string) => {
    const q = encodeURIComponent(courseTitle);
    router.push((paymentsEnabled ? `/pay/${q}` : `/course/${q}`) as any);
  };

  const isDark = colorScheme === "dark";

  return (
    <View style={[{ flex: 1 }, { backgroundColor: theme.background }]}>
      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <LinearGradient
          colors={isDark ? ["#1a0000", "#0f0f0f"] : ["#ff1a1a", "#cc0000"]}
          style={styles.hero}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroGreeting}>Welcome back,</Text>
              <Text style={styles.heroName}>{user?.name || "Student"} 👋</Text>
              <Text style={styles.heroSubtext}>
                What do you want to learn today?
              </Text>
              <Text style={styles.heroSubtext}>
                Visitors: {visitorCount !== null ? visitorCount : "Loading…"}
              </Text>
              {visitorCountError && (
                <Text style={styles.heroSubtext}>{visitorCountError}</Text>
              )}
            </View>
            <Pressable onPress={logout} style={styles.logoutPill}>
              <Ionicons name="log-out-outline" size={16} color="#fff" />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>

          {/* Search Bar inside hero */}
          <View style={styles.searchWrapper}>
            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#888"
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={[styles.searchInput, { color: "#111" }]}
                placeholder="Search for any course or skill..."
                placeholderTextColor="#aaa"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={handleSearch} style={styles.searchButton}>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </Pressable>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Course Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Popular Courses
          </Text>
          <Text
            style={[styles.sectionSubtitle, { color: theme.tabIconDefault }]}
          >
            Tap any course to see curated video lessons
          </Text>
          <View style={styles.grid}>
            {COURSES.map((course) => (
              <Pressable
                key={course.id}
                style={({ pressed }) => [
                  styles.courseCard,
                  {
                    width: cardWidth as any,
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
                onPress={() => handleCourseSelect(course.title)}
              >
                <LinearGradient
                  colors={course.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      name={course.icon}
                      size={28}
                      color="rgba(255,255,255,0.9)"
                    />
                  </View>
                  <Text style={styles.cardTitle}>{course.title}</Text>
                  <View style={styles.cardArrow}>
                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color="rgba(255,255,255,0.7)"
                    />
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  heroContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  heroLeft: {},
  heroGreeting: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  heroName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  heroSubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
  },
  logoutPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  logoutText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  searchWrapper: {
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  searchButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#ff0000",
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    padding: 20,
    paddingTop: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  courseCard: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardGradient: {
    padding: 20,
    minHeight: 130,
    justifyContent: "space-between",
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  cardArrow: {
    alignSelf: "flex-end",
  },
});
