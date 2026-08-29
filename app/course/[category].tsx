import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { searchVideos, Video } from "@/src/api/youtube";
import VideoCard from "@/src/components/VideoCard";
import { withContentLanguage } from "@/src/i18n/contentLanguage";
import { pageTitle } from "@/src/seo/config";
import SeoHead from "@/src/seo/SeoHead";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

const CATEGORY_META: Record<
  string,
  { icon: string; gradient: [string, string] }
> = {
  java: { icon: "cafe", gradient: ["#e74c3c", "#c0392b"] },
  python: { icon: "logo-python", gradient: ["#3498db", "#2980b9"] },
  "indian dance": { icon: "musical-notes", gradient: ["#9b59b6", "#8e44ad"] },
  "react native": { icon: "logo-react", gradient: ["#61dafb", "#21b6e0"] },
  "web development": { icon: "code-slash", gradient: ["#2ecc71", "#27ae60"] },
  "ui/ux design": { icon: "color-palette", gradient: ["#f39c12", "#d68910"] },
  trending: { icon: "trending-up", gradient: ["#ff512f", "#dd2476"] },
  ai: { icon: "sparkles", gradient: ["#7f00ff", "#e100ff"] },
  genai: { icon: "bulb", gradient: ["#00c6ff", "#0072ff"] },
  ml: { icon: "hardware-chip", gradient: ["#e67e22", "#ca6f1e"] },
  data: { icon: "stats-chart", gradient: ["#2193b0", "#6dd5ed"] },
  hindi: { icon: "globe", gradient: ["#f7971e", "#ffd200"] },
  tamil: { icon: "globe", gradient: ["#fc4a1a", "#f7b733"] },
  telugu: { icon: "globe", gradient: ["#00b09b", "#96c93d"] },
  spanish: { icon: "globe", gradient: ["#00c6ff", "#0072ff"] },
  french: { icon: "globe", gradient: ["#8360c3", "#2ebf91"] },
  german: { icon: "globe", gradient: ["#232526", "#414345"] },
  japanese: { icon: "globe", gradient: ["#c31432", "#240b36"] },
  korean: { icon: "globe", gradient: ["#141e30", "#243b55"] },
  "chinese (mandarin)": { icon: "globe", gradient: ["#ee0979", "#ff6a00"] },
  italian: { icon: "globe", gradient: ["#56ab2f", "#a8e063"] },
  russian: { icon: "globe", gradient: ["#0f2027", "#2c5364"] },
  arabic: { icon: "globe", gradient: ["#41295a", "#2F0743"] },
  portuguese: { icon: "globe", gradient: ["#11998e", "#38ef7d"] },
  turkish: { icon: "globe", gradient: ["#ff5f6d", "#ffc371"] },
};

const H_PADDING = 12;

export default function CourseSuggestionsScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { width } = useWindowDimensions();
  const { i18n } = useTranslation();
  const contentLanguage = i18n.language;

  const numCols = width >= 900 ? 4 : width >= 600 ? 3 : 2;

  const filters = [
    { key: "trending", label: "Trending", query: "trending" },
    { key: "ai", label: "AI", query: "artificial intelligence" },
    { key: "genai", label: "GenAI", query: "generative ai" },
    { key: "ml", label: "ML", query: "machine learning" },
    { key: "ds", label: "Data", query: "data science" },
  ] as const;

  const [activeFilterKey, setActiveFilterKey] =
    useState<(typeof filters)[number]["key"]>("trending");

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const meta = CATEGORY_META[(category || "").toLowerCase()] || {
    icon: "school",
    gradient: ["#ff0000", "#cc0000"] as [string, string],
  };

  const activeFilter =
    filters.find((f) => f.key === activeFilterKey) || filters[0];

  const buildQuery = () => {
    const cat = String(category || "").trim();
    const base = cat ? `${cat} course tutorial` : "course tutorial";
    const topic =
      activeFilter.key === "trending" ? base : `${activeFilter.query} ${base}`;
    return withContentLanguage(topic, contentLanguage);
  };

  // Each card gets an identical pixel width
  const cardWidth = Math.floor((width - H_PADDING * 2) / numCols);

  const uniqueVideos = (items: Video[]) => {
    const seen = new Set<string>();
    return items.filter((v) => {
      const k = `${v.type ?? "video"}:${v.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  useEffect(() => {
    if (category) loadVideos();
  }, [category, activeFilterKey, contentLanguage]);

  const loadVideos = async () => {
    setLoading(true);
    fadeAnim.setValue(0);
    const data = await searchVideos(buildQuery(), undefined, contentLanguage);
    setVideos(uniqueVideos(data.videos));
    setNextPageToken(data.nextPageToken);
    setLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  };

  const loadMore = async () => {
    if (loadingMore || !nextPageToken || !category) return;
    setLoadingMore(true);
    const data = await searchVideos(buildQuery(), nextPageToken, contentLanguage);
    setVideos((prev) => uniqueVideos([...prev, ...data.videos]));
    setNextPageToken(data.nextPageToken);
    setLoadingMore(false);
  };

  const Hero = () => (
    <LinearGradient colors={meta.gradient} style={styles.hero}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.heroRow}>
        <View style={styles.heroIcon}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.heroLogo}
            resizeMode="contain"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>{category}</Text>
          <Text style={styles.heroSub}>
            {loading ? "Loading…" : `${videos.length}+ course videos`}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SeoHead
          title={pageTitle(`${category} tutorials`)}
          description={`Watch ${category} video tutorials and playlists on OnlineClasses, filtered to your selected language.`}
          path={`/course/${encodeURIComponent(String(category || ""))}`}
        />
        <Hero />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ff0000" />
          <Text style={[styles.loadingTxt, { color: theme.tabIconDefault }]}>
            Searching for {category} tutorials…
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SeoHead
        title={pageTitle(`${category} tutorials`)}
        description={`Watch ${category} video tutorials and playlists on OnlineClasses, filtered to your selected language.`}
        path={`/course/${encodeURIComponent(String(category || ""))}`}
      />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={400}
          onScroll={({
            nativeEvent: { layoutMeasurement, contentOffset, contentSize },
          }) => {
            if (
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 400
            ) {
              loadMore();
            }
          }}
        >
          <Hero />

          {/* Section header */}
          <View
            style={[
              styles.sectionRow,
              { borderBottomColor: theme.tabIconDefault + "22" },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: theme.text }]}>
              Videos
            </Text>
            <Text
              style={[styles.sectionCount, { color: theme.tabIconDefault }]}
            >
              {videos.length} results
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={[
              styles.filtersContent,
              { paddingHorizontal: H_PADDING },
            ]}
          >
            {filters.map((f) => {
              const active = f.key === activeFilterKey;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setActiveFilterKey(f.key)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    {
                      backgroundColor: active
                        ? theme.tint + "26"
                        : theme.tabIconDefault + "14",
                      borderColor: active
                        ? theme.tint + "44"
                        : theme.tabIconDefault + "22",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? theme.text : theme.tabIconDefault,
                      fontSize: 12,
                      fontWeight: active ? "700" : "600",
                    }}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Grid */}
          <View style={[styles.grid, { paddingHorizontal: H_PADDING }]}>
            {videos.length === 0 ? (
              <View style={styles.centered}>
                <Ionicons
                  name="videocam-off-outline"
                  size={48}
                  color={theme.tabIconDefault}
                />
                <Text
                  style={[styles.emptyTxt, { color: theme.tabIconDefault }]}
                >
                  No videos found for "{category}". Try a different search.
                </Text>
              </View>
            ) : (
              // Chunk into rows so last-row cards are never stretched
              Array.from({ length: Math.ceil(videos.length / numCols) }).map(
                (_, rowIdx) => {
                  const rowItems = videos.slice(
                    rowIdx * numCols,
                    rowIdx * numCols + numCols,
                  );
                  return (
                    <View key={rowIdx} style={styles.row}>
                      {rowItems.map((video, i) => (
                        <VideoCard
                          key={`${video.type ?? "video"}:${video.id}`}
                          video={video}
                          category={category}
                          cardWidth={cardWidth}
                          progress={rowIdx === 0 && i === 0 ? 0.4 : undefined}
                        />
                      ))}
                      {/* Spacer cells to prevent stretching in last row */}
                      {rowItems.length < numCols &&
                        Array.from({ length: numCols - rowItems.length }).map(
                          (_, k) => (
                            <View
                              key={`sp-${k}`}
                              style={{ width: cardWidth }}
                            />
                          ),
                        )}
                    </View>
                  );
                },
              )
            )}
          </View>

          {loadingMore && (
            <ActivityIndicator
              size="small"
              color="#ff0000"
              style={{ margin: 20 }}
            />
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingTop: 52,
    paddingBottom: 22,
    paddingHorizontal: 18,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroLogo: {
    width: 34,
    height: 34,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 3,
  },
  heroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionCount: {
    fontSize: 12,
  },
  filtersScroll: {
    marginTop: 8,
    marginBottom: 6,
  },
  filtersContent: {
    gap: 10,
    paddingVertical: 6,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  grid: {},
  row: {
    flexDirection: "row",
    // no justifyContent — cards are exact pixel width so they butt up naturally
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 12,
  },
  loadingTxt: { fontSize: 14 },
  emptyTxt: { fontSize: 14, textAlign: "center", lineHeight: 21 },
});
