import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Video } from "../api/youtube";

interface VideoCardProps {
  video: Video;
  progress?: number;
  cardWidth?: number;
  category?: string;
}

export default function VideoCard({
  video,
  progress,
  cardWidth,
  category,
}: VideoCardProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isPlaylist = video.type === "playlist";
  const [pressed, setPressed] = useState(false);

  // Pre-flatten into ONE object - no arrays ever reach the Slot
  const containerStyle = StyleSheet.flatten([
    cardWidth
      ? { width: cardWidth, paddingHorizontal: 6, marginBottom: 20 }
      : styles.containerFlex,
    pressed ? { opacity: 0.75 } : {},
  ]);

  return (
    <Link
      href={{
        pathname: "/video/[id]",
        params: {
          id: video.id,
          type: video.type || "video",
          ...(category ? { category } : {}),
        },
      }}
      asChild
    >
      <Pressable
        style={containerStyle}
        // @ts-ignore - web only
        onPointerEnter={() => setPressed(true)}
        onPointerLeave={() => setPressed(false)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: video.thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />

          {isPlaylist && (
            <View style={styles.playlistOverlay}>
              <Ionicons name="list" size={14} color="#fff" />
              <Text style={styles.playlistLabel}>Playlist</Text>
            </View>
          )}

          {progress !== undefined && (
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progress * 100}%` as any },
                ]}
              />
            </View>
          )}

          {!isPlaylist && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{video.duration}</Text>
            </View>
          )}
        </View>

        {/* Info Row */}
        <View style={styles.infoRow}>
          <Image source={{ uri: video.channelAvatar }} style={styles.avatar} />
          <View style={styles.textContainer}>
            <Text
              style={[styles.title, { color: theme.text }]}
              numberOfLines={2}
            >
              {video.title}
            </Text>
            <Text
              style={[styles.channelName, { color: theme.tabIconDefault }]}
              numberOfLines={1}
            >
              {video.channelTitle}
            </Text>
            <Text
              style={[styles.meta, { color: theme.tabIconDefault }]}
              numberOfLines={1}
            >
              {isPlaylist ? "Playlist" : `${video.views} views`}
            </Text>
          </View>
          <Ionicons
            name="ellipsis-vertical"
            size={14}
            color={theme.tabIconDefault}
            style={styles.menuIcon}
          />
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  containerFlex: {
    width: "33.333%",
    paddingHorizontal: 6,
    marginBottom: 20,
  },
  thumbnailContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  playlistOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    top: 0,
    width: "35%",
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  playlistLabel: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  progressBarBg: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#ff0000",
  },
  durationBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  durationText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    paddingTop: 8,
    alignItems: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 7,
    marginTop: 1,
    backgroundColor: "#333",
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    marginBottom: 2,
  },
  channelName: {
    fontSize: 11,
    marginBottom: 1,
  },
  meta: {
    fontSize: 10,
  },
  menuIcon: {
    padding: 2,
    marginLeft: 2,
    flexShrink: 0,
  },
});
