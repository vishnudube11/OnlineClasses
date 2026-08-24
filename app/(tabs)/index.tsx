import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import LanguageSelector from "@/src/components/LanguageSelector";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Animated,
    Platform,
    Pressable,
    ScrollView,
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
    id: "23",
    title: "Trending",
    icon: "trending-up" as const,
    gradient: ["#ff512f", "#dd2476"] as const,
  },
  {
    id: "24",
    title: "AI",
    icon: "sparkles" as const,
    gradient: ["#7f00ff", "#e100ff"] as const,
  },
  {
    id: "25",
    title: "GenAI",
    icon: "bulb" as const,
    gradient: ["#00c6ff", "#0072ff"] as const,
  },
  {
    id: "26",
    title: "ML",
    icon: "hardware-chip" as const,
    gradient: ["#e67e22", "#ca6f1e"] as const,
  },
  {
    id: "27",
    title: "Data",
    icon: "stats-chart" as const,
    gradient: ["#2193b0", "#6dd5ed"] as const,
  },
  {
    id: "28",
    title: "Hindi",
    icon: "globe" as const,
    gradient: ["#f7971e", "#ffd200"] as const,
  },
  {
    id: "29",
    title: "Tamil",
    icon: "globe" as const,
    gradient: ["#fc4a1a", "#f7b733"] as const,
  },
  {
    id: "30",
    title: "Telugu",
    icon: "globe" as const,
    gradient: ["#00b09b", "#96c93d"] as const,
  },
  {
    id: "31",
    title: "Spanish",
    icon: "globe" as const,
    gradient: ["#00c6ff", "#0072ff"] as const,
  },
  {
    id: "32",
    title: "French",
    icon: "globe" as const,
    gradient: ["#8360c3", "#2ebf91"] as const,
  },
  {
    id: "33",
    title: "German",
    icon: "globe" as const,
    gradient: ["#232526", "#414345"] as const,
  },
  {
    id: "34",
    title: "Japanese",
    icon: "globe" as const,
    gradient: ["#c31432", "#240b36"] as const,
  },
  {
    id: "35",
    title: "Korean",
    icon: "globe" as const,
    gradient: ["#141e30", "#243b55"] as const,
  },
  {
    id: "36",
    title: "Chinese (Mandarin)",
    icon: "globe" as const,
    gradient: ["#ee0979", "#ff6a00"] as const,
  },
  {
    id: "37",
    title: "Italian",
    icon: "globe" as const,
    gradient: ["#56ab2f", "#a8e063"] as const,
  },
  {
    id: "38",
    title: "Russian",
    icon: "globe" as const,
    gradient: ["#0f2027", "#2c5364"] as const,
  },
  {
    id: "39",
    title: "Arabic",
    icon: "globe" as const,
    gradient: ["#41295a", "#2F0743"] as const,
  },
  {
    id: "40",
    title: "Portuguese",
    icon: "globe" as const,
    gradient: ["#11998e", "#38ef7d"] as const,
  },
  {
    id: "41",
    title: "Turkish",
    icon: "globe" as const,
    gradient: ["#ff5f6d", "#ffc371"] as const,
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
    id: "21",
    title: "Artificial Intelligence",
    icon: "sparkles" as const,
    gradient: ["#7f00ff", "#e100ff"] as const,
  },
  {
    id: "22",
    title: "Generative AI",
    icon: "bulb" as const,
    gradient: ["#00c6ff", "#0072ff"] as const,
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
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
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
      const trimmedQuery = searchQuery.trim();
      const matchedCourse = COURSES.find(
        (course) => course.title.toLowerCase() === trimmedQuery.toLowerCase(),
      );

      if (matchedCourse) {
        const q = encodeURIComponent(trimmedQuery);
        router.push((paymentsEnabled ? `/pay/${q}` : `/course/${q}`) as any);
        setShowSuggestions(false);
      } else {
        // Show beautiful custom alert
        setShowAlert(true);
      }
    }
  };

  const pickingSuggestion = useRef(false);

  const handleCourseSelect = (courseTitle: string) => {
    pickingSuggestion.current = true;
    setSearchQuery(courseTitle);
    setShowSuggestions(false);
    const q = encodeURIComponent(courseTitle);
    router.push((paymentsEnabled ? `/pay/${q}` : `/course/${q}`) as any);
  };

  const filteredCourses = COURSES.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setShowSuggestions(text.length > 0);
  };

  const isDark = colorScheme === "dark";

  return (
    <View style={[{ flex: 1 }, { backgroundColor: theme.background }]}>
      {/* Custom Alert Modal */}
      {showAlert && (
        <View style={styles.alertOverlay}>
          <Animated.View style={[styles.alertContainer, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={["#ff6b6b", "#ee5a5a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.alertHeader}
            >
              <Ionicons name="alert-circle" size={32} color="#fff" />
            </LinearGradient>
            <View style={styles.alertBody}>
              <Text style={styles.alertTitle}>{t("alert.courseNotFound")}</Text>
              <Text style={styles.alertMessage}>
                {t("alert.courseNotFoundMessage")}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.alertButton,
                  pressed && styles.alertButtonPressed,
                ]}
                onPress={() => {
                  setShowAlert(false);
                  setShowSuggestions(true);
                }}
              >
                <Text style={styles.alertButtonText}>
                  {t("alert.viewSuggestions")}
                </Text>
              </Pressable>
            </View>
            <Pressable
              style={styles.alertCloseButton}
              onPress={() => setShowAlert(false)}
            >
              <Ionicons name="close" size={20} color="#888" />
            </Pressable>
          </Animated.View>
        </View>
      )}

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
              <View style={styles.brandRow}>
                <View style={styles.brandBadge}>
                  <Ionicons name="school" size={18} color="#fff" />
                </View>
                <Text style={styles.brandText}>Online Classes</Text>
              </View>
              <Text style={styles.heroGreeting}>{t("welcome.greeting")}</Text>
              <Text style={styles.heroName}>{user?.name || "Student"} 👋</Text>
              <Text style={styles.heroSubtext}>{t("welcome.subtext")}</Text>
              <Text style={styles.heroSubtext}>
                {t("welcome.visitors")}{" "}
                {visitorCount !== null ? visitorCount : "Loading…"}
              </Text>
              {visitorCountError && (
                <Text style={styles.heroSubtext}>{visitorCountError}</Text>
              )}
            </View>
            <Pressable onPress={logout} style={styles.logoutPill}>
              <Ionicons name="log-out-outline" size={16} color="#fff" />
              <Text style={styles.logoutText}>{t("auth.logout")}</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowLanguageSelector(true)}
              style={styles.languagePill}
            >
              <Ionicons name="globe" size={16} color="#fff" />
              <Text style={styles.logoutText}>{t("common.language")}</Text>
            </Pressable>
          </View>

          {/* Language Selector Modal */}
          <LanguageSelector
            visible={showLanguageSelector}
            onClose={() => setShowLanguageSelector(false)}
            onLanguageChange={() => {
              setShowLanguageSelector(false);
            }}
          />

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
                placeholder={t("search.placeholder")}
                placeholderTextColor="#aaa"
                value={searchQuery}
                onChangeText={handleSearchChange}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                blurOnSubmit
                onFocus={() => setShowSuggestions(searchQuery.length > 0)}
                onBlur={() => {
                  setTimeout(() => {
                    if (!pickingSuggestion.current) {
                      setShowSuggestions(false);
                    }
                    pickingSuggestion.current = false;
                  }, 300);
                }}
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => {
                    setSearchQuery("");
                    setShowSuggestions(false);
                  }}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={18} color="#888" />
                </Pressable>
              )}
            </View>

            {/* Suggestions Dropdown */}
            {showSuggestions && filteredCourses.length > 0 && (
              <View
                style={styles.suggestionsContainer}
                {...(Platform.OS === "web"
                  ? {
                      onMouseDown: (e: any) => {
                        e.preventDefault();
                      },
                    }
                  : {})}
              >
                <ScrollView
                  style={styles.suggestionsScroll}
                  keyboardShouldPersistTaps="always"
                  nestedScrollEnabled
                >
                  {filteredCourses.slice(0, 5).map((course) => (
                    <Pressable
                      key={course.id}
                      style={({ pressed }) => [
                        styles.suggestionItem,
                        pressed && styles.suggestionItemPressed,
                      ]}
                      onPressIn={() => handleCourseSelect(course.title)}
                    >
                      <LinearGradient
                        colors={course.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.suggestionIcon}
                      >
                        <Ionicons
                          name={course.icon}
                          size={16}
                          color="rgba(255,255,255,0.9)"
                        />
                      </LinearGradient>
                      <Text style={styles.suggestionText}>{course.title}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#888" />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Course Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t("courses.title")}
          </Text>
          <Text
            style={[styles.sectionSubtitle, { color: theme.tabIconDefault }]}
          >
            {t("courses.subtitle")}
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
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 14,
    fontWeight: "800",
    color: "rgba(255,255,255,0.92)",
    letterSpacing: 0.4,
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
  languagePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginLeft: 8,
  },
  searchWrapper: {
    marginTop: 4,
    position: "relative",
    zIndex: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 56,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    height: "100%",
    letterSpacing: -0.2,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    maxHeight: 250,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: "hidden",
  },
  suggestionsScroll: {
    maxHeight: 250,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  suggestionItemPressed: {
    backgroundColor: "#f5f5f5",
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  alertOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    paddingHorizontal: 20,
  },
  alertContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    overflow: "hidden",
  },
  alertHeader: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  alertBody: {
    padding: 24,
    paddingTop: 20,
    alignItems: "center",
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  alertButton: {
    backgroundColor: "#ff6b6b",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  alertButtonPressed: {
    backgroundColor: "#ee5a5a",
  },
  alertButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  alertCloseButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.05)",
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
