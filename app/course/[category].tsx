import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { searchVideos, Video } from "@/src/api/youtube";
import VideoCard from "@/src/components/VideoCard";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
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
};

const NUM_COLS = 2;
const H_PADDING = 12;

export default function CourseSuggestionsScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { width } = useWindowDimensions();

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const meta = CATEGORY_META[(category || "").toLowerCase()] || {
    icon: "school",
    gradient: ["#ff0000", "#cc0000"] as [string, string],
  };

  // Each card gets an identical pixel width
  const cardWidth = Math.floor((width - H_PADDING * 2) / NUM_COLS);

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
  }, [category]);

  const loadVideos = async () => {
    setLoading(true);
    fadeAnim.setValue(0);
    const data = await searchVideos(`${category} course tutorial`);
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
    const data = await searchVideos(
      `${category} course tutorial`,
      nextPageToken,
    );
    setVideos((prev) => uniqueVideos([...prev, ...data.videos]));
    setNextPageToken(data.nextPageToken);
    setLoadingMore(false);
  };

  const Hero = () => (
    <LinearGradient colors={meta.gradient} style={styles.hero}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.heroRow}>
        <View style={styles.heroIcon}>
          <Ionicons name={meta.icon as any} size={26} color="#fff" />
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
              Array.from({ length: Math.ceil(videos.length / NUM_COLS) }).map(
                (_, rowIdx) => {
                  const rowItems = videos.slice(
                    rowIdx * NUM_COLS,
                    rowIdx * NUM_COLS + NUM_COLS,
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
                      {rowItems.length < NUM_COLS &&
                        Array.from({ length: NUM_COLS - rowItems.length }).map(
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
