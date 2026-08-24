import React, { useState } from 'react';
import { StyleSheet, FlatList, View, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { searchVideos, Video } from '@/src/api/youtube';
import VideoCard from '@/src/components/VideoCard';
import { withContentLanguage } from '@/src/i18n/contentLanguage';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function TabTwoScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const data = await searchVideos(
      withContentLanguage(query, i18n.language),
      undefined,
      i18n.language,
    );
    setVideos(data.videos);
    setNextPageToken(data.nextPageToken);
    setLoading(false);
  };

  const loadMore = async () => {
    if (loadingMore || !nextPageToken || !query.trim()) return;
    setLoadingMore(true);
    const data = await searchVideos(
      withContentLanguage(query, i18n.language),
      nextPageToken,
      i18n.language,
    );
    setVideos(prev => [...prev, ...data.videos]);
    setNextPageToken(data.nextPageToken);
    setLoadingMore(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: theme.tint + '1A' }]}>
        <Ionicons name="search" color={theme.text} size={20} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search videos..."
          placeholderTextColor={theme.tabIconDefault}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="red" />
        </View>
      ) : (
        <FlatList
          key="three-column-grid"
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <VideoCard video={item} />}
          contentContainerStyle={styles.listContainer}
          numColumns={3}
          columnWrapperStyle={{ paddingHorizontal: 8, justifyContent: 'space-between' }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="red" style={{ margin: 16 }} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
