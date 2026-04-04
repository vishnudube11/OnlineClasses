import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
    fetchPlaylistById,
    fetchVideoById,
    searchVideos,
    Video,
} from "@/src/api/youtube";
import VideoCard from "@/src/components/VideoCard";
import {
    getLastPositionSec,
    setLastPositionSec,
    upsertVisitedVideo,
} from "@/src/watchHistory";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";

const NUM_COLS = 3;
const H_PADDING = 12;

export default function VideoScreen() {
  const { id, type, category } = useLocalSearchParams<{
    id: string;
    type?: string;
    category?: string;
  }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { width, height } = useWindowDimensions();

  const [playing, setPlaying] = useState(false);
  const [video, setVideo] = useState<Video | null>(null);
  const [suggestedVideos, setSuggestedVideos] = useState<Video[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resumeSec, setResumeSec] = useState<number | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [showPlayer, setShowPlayer] = useState(true);
  const [playerKey, setPlayerKey] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const playerRef = useRef<any>(null);
  const playerWrapperRef = useRef<any>(null);

  // Fit player without scrolling
  const maxSafeHeight = height * 0.85;
  const naturalHeight = width * (9 / 16);
  const playerHeight = Math.min(naturalHeight, maxSafeHeight);
  const playerWidth = playerHeight * (16 / 9);

  // Exact card width for uniform grid
  const cardWidth = Math.floor((width - H_PADDING * 2) / NUM_COLS);

  useEffect(() => {
    // When navigating to a different video on web, the same screen can stay mounted.
    // Ensure the previous iframe/player is stopped so it doesn't keep playing.
    setPlaying(false);
    try {
      playerRef.current?.stopVideo?.();
      playerRef.current?.pauseVideo?.();
    } catch {
      // ignore
    }

    if (Platform.OS === "web") {
      setShowPlayer(false);
      try {
        const node = playerWrapperRef.current;
        const el = node && (node as any).querySelector ? (node as any) : null;
        if (el) {
          const iframes = el.querySelectorAll(
            'iframe[src*="youtube"],iframe[src*="youtube-nocookie"],iframe[src*="youtu.be"]',
          );
          iframes.forEach((i: any) => {
            try {
              i.src = "about:blank";
            } catch {
              // ignore
            }
            try {
              i.remove();
            } catch {
              // ignore
            }
          });
        }
      } catch {
        // ignore
      }

      // Some web implementations mount the YouTube iframe outside of the wrapper.
      // Do a global cleanup as a last resort to avoid background audio.
      try {
        if (typeof document !== "undefined") {
          const globalIframes = document.querySelectorAll(
            'iframe[src*="youtube"],iframe[src*="youtube-nocookie"],iframe[src*="youtu.be"]',
          );
          globalIframes.forEach((i: any) => {
            try {
              i.src = "about:blank";
            } catch {
              // ignore
            }
            try {
              i.remove();
            } catch {
              // ignore
            }
          });
        }
      } catch {
        // ignore
      }

      const t = setTimeout(() => {
        setPlayerKey((k) => k + 1);
        setShowPlayer(true);
      }, 50);
      return () => {
        clearTimeout(t);
        try {
          playerRef.current?.stopVideo?.();
          playerRef.current?.pauseVideo?.();
        } catch {
          // ignore
        }
      };
    }

    return () => {
      try {
        playerRef.current?.stopVideo?.();
        playerRef.current?.pauseVideo?.();
      } catch {
        // ignore
      }
    };
  }, [id, type]);

  useEffect(() => {
    if (id) loadVideo(id);
  }, [id]);

  const loadVideo = async (videoId: string) => {
    setPlaying(false);
    setLoading(true);
    fadeAnim.setValue(0);
    const data =
      type === "playlist"
        ? await fetchPlaylistById(videoId)
        : await fetchVideoById(videoId);
    setVideo(data);

    if (data && type !== "playlist") {
      try {
        await upsertVisitedVideo({ video: data, category });
        const last = await getLastPositionSec(data.id);
        setResumeSec(typeof last === "number" ? last : null);
      } catch {
        setResumeSec(null);
      }
    } else {
      setResumeSec(null);
    }

    setPlayerReady(false);
    const suggestionQuery = category ? `${category} course tutorial` : "";
    const suggestions = await searchVideos(suggestionQuery);
    setSuggestedVideos(suggestions.videos.filter((v) => v.id !== videoId));
    setNextPageToken(suggestions.nextPageToken);
    setLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  };

  const loadMoreSuggestions = async () => {
    if (loadingMore || !nextPageToken) return;
    setLoadingMore(true);
    const suggestionQuery = category ? `${category} course tutorial` : "";
    const suggestions = await searchVideos(suggestionQuery, nextPageToken);
    setSuggestedVideos((prev) => [
      ...prev,
      ...suggestions.videos.filter((v) => v.id !== id),
    ]);
    setNextPageToken(suggestions.nextPageToken);
    setLoadingMore(false);
  };

  const onStateChange = useCallback((state: string) => {
    if (state === "ended") setPlaying(false);
  }, []);

  useEffect(() => {
    if (!video || type === "playlist") return;

    let cancelled = false;
    const id = setInterval(async () => {
      try {
        if (!playerRef.current || !playerReady) return;
        const secs = await playerRef.current.getCurrentTime?.();
        if (cancelled) return;
        if (typeof secs === "number" && Number.isFinite(secs)) {
          await setLastPositionSec({ videoId: video.id, positionSec: secs });
        }
      } catch {
        // ignore
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [playerReady, type, video]);

  const onSavePress = useCallback(async () => {
    try {
      if (!video) return;
      if (type === "playlist") {
        Alert.alert("Not supported", "Downloading playlists is not supported.");
        return;
      }

      let baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
      if (!baseUrl) {
        Alert.alert("Missing config", "EXPO_PUBLIC_API_BASE_URL is not set.");
        return;
      }

      // On a real device, `localhost` points to the device itself, not your dev machine.
      // If baseUrl uses localhost, replace it with the Expo host IP (your dev machine LAN IP).
      if (
        Platform.OS !== "web" &&
        (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1"))
      ) {
        const hostUri =
          (Constants.expoConfig as any)?.hostUri ||
          (Constants as any)?.debuggerHost ||
          (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;
        const host = typeof hostUri === "string" ? hostUri.split(":")[0] : null;
        if (host) {
          baseUrl = baseUrl
            .replace("localhost", host)
            .replace("127.0.0.1", host);
        }
      }

      if (saving) return;
      setSaving(true);

      const safeTitle = String(video.title || `youtube_${video.id}`)
        .replace(/[\\/:*?\"<>|]/g, "_")
        .slice(0, 120);
      const fileUri = `${FileSystem.documentDirectory}${safeTitle}.mp4`;

      const url = `${baseUrl}/api/youtube/download?videoId=${encodeURIComponent(
        video.id,
      )}`;

      const result = await FileSystem.downloadAsync(url, fileUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri);
      } else {
        Alert.alert("Saved", `Saved to: ${result.uri}`);
      }
    } catch (e: any) {
      Alert.alert(
        "Download failed",
        e?.message || "Could not download the video.",
      );
    } finally {
      setSaving(false);
    }
  }, [saving, type, video]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: "#0a0a0a" }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ff0000" />
          <Text style={styles.loadingText}>Loading video…</Text>
        </View>
      </View>
    );
  }

  if (!video) {
    return (
      <View style={[styles.container, { backgroundColor: "#0a0a0a" }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#666" />
          <Text style={{ color: "#aaa", marginTop: 12 }}>Video not found.</Text>
        </View>
      </View>
    );
  }

  // Chunk suggestions into rows
  const rows: Video[][] = [];
  for (let i = 0; i < suggestedVideos.length; i += NUM_COLS) {
    rows.push(suggestedVideos.slice(i, i + NUM_COLS));
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

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
              loadMoreSuggestions();
            }
          }}
        >
          {/* ── Player ── */}
          <View
            ref={playerWrapperRef}
            style={[
              styles.playerWrapper,
              {
                backgroundColor: "#000",
                overflow: "hidden",
                height: playerHeight,
              },
            ]}
          >
            {showPlayer && (
              <YoutubePlayer
                key={`${playerKey}:${type === "playlist" ? "playlist" : "video"}:${video.id}`}
                ref={playerRef}
                height={playerHeight}
                width={playerWidth}
                play={playing}
                videoId={type === "playlist" ? undefined : video.id}
                playList={type === "playlist" ? video.id : undefined}
                onChangeState={onStateChange}
                onReady={async () => {
                  setPlayerReady(true);
                  try {
                    if (
                      type !== "playlist" &&
                      typeof resumeSec === "number" &&
                      resumeSec > 2
                    ) {
                      await playerRef.current?.seekTo?.(resumeSec, true);
                    }
                  } catch {
                    // ignore
                  }
                }}
                webViewStyle={{ backgroundColor: "black", overflow: "hidden" }}
                webViewProps={{
                  scrollEnabled: false,
                  allowsInlineMediaPlayback: true,
                  mediaPlaybackRequiresUserAction: false,
                }}
                initialPlayerParams={{
                  modestbranding: true,
                  rel: false,
                  iv_load_policy: 3,
                }}
              />
            )}
          </View>

          {/* ── Video Info Card ── */}
          <LinearGradient
            colors={
              colorScheme === "dark"
                ? ["#111", "#0f0f0f"]
                : ["#ffffff", "#f8f8f8"]
            }
            style={styles.infoCard}
          >
            {/* Back button */}
            <Pressable onPress={() => router.back()} style={styles.backRow}>
              <Ionicons name="chevron-back" size={20} color="#ff0000" />
              <Text style={styles.backText}>Back</Text>
            </Pressable>

            <Text
              style={[styles.videoTitle, { color: theme.text }]}
              numberOfLines={3}
            >
              {video.title}
            </Text>
            <Text style={styles.videoMeta}>
              {type === "playlist"
                ? "Playlist"
                : `${video.views} views • ${video.publishedAt}`}
            </Text>

            {/* Channel row */}
            <View style={styles.channelRow}>
              <Image
                source={{ uri: video.channelAvatar }}
                style={styles.avatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.channelName, { color: theme.text }]}>
                  {video.channelTitle}
                </Text>
              </View>
              <Pressable style={styles.subscribeBtn}>
                <Text style={styles.subscribeTxt}>Subscribe</Text>
              </Pressable>
            </View>

            {/* Action pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.actionsScroll}
            >
              {[
                { icon: "thumbs-up-outline", label: "Like" },
                { icon: "share-social-outline", label: "Share" },
                { icon: "download-outline", label: "Save" },
                { icon: "bookmark-outline", label: "Playlist" },
              ].map(({ icon, label }) => (
                <Pressable
                  key={label}
                  onPress={label === "Save" ? onSavePress : undefined}
                  disabled={label === "Save" ? saving : false}
                  style={[
                    styles.actionPill,
                    {
                      backgroundColor: theme.tint + "18",
                      borderColor: theme.tint + "22",
                      opacity: label === "Save" && saving ? 0.6 : 1,
                    },
                  ]}
                >
                  <Ionicons name={icon as any} size={18} color={theme.text} />
                  <Text style={[styles.actionLabel, { color: theme.text }]}>
                    {label === "Save" && saving ? "Saving…" : label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </LinearGradient>

          {/* ── Suggestions Section ── */}
          <View
            style={[
              styles.suggestSection,
              { borderTopColor: theme.tabIconDefault + "22" },
            ]}
          >
            <View style={styles.suggestHeader}>
              <Text style={[styles.suggestTitle, { color: theme.text }]}>
                Up Next
              </Text>
              <Text
                style={[styles.suggestCount, { color: theme.tabIconDefault }]}
              >
                {suggestedVideos.length} videos
              </Text>
            </View>

            {/* Uniform grid */}
            <View style={{ paddingHorizontal: H_PADDING }}>
              {rows.map((row, rowIdx) => (
                <View key={rowIdx} style={styles.row}>
                  {row.map((v) => (
                    <VideoCard
                      key={v.id}
                      video={v}
                      cardWidth={cardWidth}
                      category={category}
                    />
                  ))}
                  {row.length < NUM_COLS &&
                    Array.from({ length: NUM_COLS - row.length }).map(
                      (_, k) => (
                        <View key={`sp-${k}`} style={{ width: cardWidth }} />
                      ),
                    )}
                </View>
              ))}
            </View>

            {loadingMore && (
              <ActivityIndicator
                size="small"
                color="#ff0000"
                style={{ margin: 20 }}
              />
            )}
            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { color: "#aaa", fontSize: 14 },
  playerWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  infoCard: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  backText: {
    color: "#ff0000",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 2,
  },
  videoTitle: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: 6,
  },
  videoMeta: {
    fontSize: 13,
    color: "#888",
    marginBottom: 14,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#333",
  },
  channelName: {
    fontSize: 15,
    fontWeight: "600",
  },
  subscribeBtn: {
    backgroundColor: "#ff0000",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  subscribeTxt: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  actionsScroll: {
    marginBottom: 4,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    gap: 6,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  suggestSection: {
    borderTopWidth: 1,
    paddingTop: 4,
  },
  suggestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  suggestTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  suggestCount: {
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
  },
});
