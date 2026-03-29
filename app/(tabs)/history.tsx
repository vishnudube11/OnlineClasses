import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import VideoCard from "@/src/components/VideoCard";
import { getWatchHistory, type WatchHistoryItem } from "@/src/watchHistory";
import { Stack, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WatchHistoryItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getWatchHistory();
    setItems(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ff0000" />
          <Text style={[styles.help, { color: theme.tabIconDefault }]}>
            Loading history…
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { color: theme.tabIconDefault }]}>
            No history yet.
          </Text>
          <Text style={[styles.help, { color: theme.tabIconDefault }]}>
            Open a video to see it here.
          </Text>
        </View>
      ) : (
        <FlatList
          key="three-column-grid"
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={{
            paddingHorizontal: 8,
            justifyContent: "space-between",
          }}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <VideoCard
              video={{
                id: item.id,
                type: item.type,
                title: item.title,
                thumbnail: item.thumbnail,
                channelTitle: item.channelTitle,
                channelAvatar: item.channelAvatar,
                views: "",
                publishedAt: "",
                duration: item.duration,
              }}
              category={item.category}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 8,
  },
  empty: { fontSize: 16, fontWeight: "700" },
  help: { fontSize: 13 },
  listContainer: {
    paddingTop: 12,
    paddingBottom: 20,
  },
});
