import axios from 'axios';

export interface Video {
  id: string;
  type?: 'video' | 'playlist';
  title: string;
  thumbnail: string;
  channelTitle: string;
  channelAvatar: string;
  views: string;
  publishedAt: string;
  duration: string;
}

export interface FetchResponse {
  videos: Video[];
  nextPageToken?: string;
}

// TODO: Replace this with your actual API key, or define it in a .env file as EXPO_PUBLIC_YOUTUBE_API_KEY
const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || 'YOUR_API_KEY_HERE';
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const fetchTrendingVideos = async (pageToken?: string): Promise<FetchResponse> => {
  try {
    const response = await axios.get(`${BASE_URL}/videos`, {
      params: {
        part: 'snippet,statistics,contentDetails,status',
        chart: 'mostPopular',
        regionCode: 'US',
        maxResults: 30,
        pageToken: pageToken,
        key: YOUTUBE_API_KEY,
      },
    });

    const usableItems = response.data.items.filter((item: any) => {
      // Music (categoryId '10') frequently blocks localhost embedding despite returning embeddable:true
      const isNotMusic = item.snippet?.categoryId !== '10';
      const isPublic = item.status?.privacyStatus === 'public';
      const isEmbeddable = item.status?.embeddable === true;
      return isNotMusic && isPublic && isEmbeddable;
    });
    
    return {
      videos: mapYouTubeResponseToVideos(usableItems.slice(0, 15)),
      nextPageToken: response.data.nextPageToken,
    };
  } catch (error) {
    console.error('Error fetching trending videos:', error);
    return { videos: [] };
  }
};

export const searchVideos = async (query: string, pageToken?: string): Promise<FetchResponse> => {
  try {
    if (!query) return fetchTrendingVideos(pageToken);
    
    // 1. Search for video IDs and playlists
    const searchResponse = await axios.get(`${BASE_URL}/search`, {
      params: {
        part: 'snippet',
        q: query,
        type: 'video,playlist',
        maxResults: 15,
        pageToken: pageToken,
        key: YOUTUBE_API_KEY,
      },
    });

    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      return { videos: [] };
    }
    
    const mappedItems: Video[] = [];
    const videoItems = searchResponse.data.items.filter((item: any) => item.id.kind === 'youtube#video');
    const videoIds = videoItems.map((item: any) => item.id.videoId).join(',');

    const videoDetailsMap: Record<string, any> = {};
    if (videoIds) {
      // 2. Fetch full details for those video IDs (to get views, duration, etc.)
      const videosResponse = await axios.get(`${BASE_URL}/videos`, {
        params: {
          part: 'snippet,statistics,contentDetails,status',
          id: videoIds,
          key: YOUTUBE_API_KEY,
        },
      });
      videosResponse.data.items.forEach((item: any) => {
        videoDetailsMap[item.id] = item;
      });
    }

    searchResponse.data.items.forEach((item: any) => {
      if (item.id.kind === 'youtube#video') {
        const details = videoDetailsMap[item.id.videoId];
        if (details && details.status?.embeddable === true && details.status?.privacyStatus === 'public' && details.snippet?.categoryId !== '10') {
          mappedItems.push({
            id: details.id,
            type: 'video',
            title: details.snippet?.title || 'Unknown Title',
            thumbnail: details.snippet?.thumbnails?.high?.url || details.snippet?.thumbnails?.medium?.url || 'https://via.placeholder.com/640x360.png?text=No+Thumbnail',
            channelTitle: details.snippet?.channelTitle || 'Unknown Channel',
            channelAvatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(details.snippet?.channelTitle || 'U') + '&background=random',
            views: formatViewCount(details.statistics?.viewCount),
            publishedAt: details.snippet?.publishedAt ? new Date(details.snippet.publishedAt).toLocaleDateString() : 'Unknown Data',
            duration: parseDuration(details.contentDetails?.duration),
          });
        }
      } else if (item.id.kind === 'youtube#playlist') {
        mappedItems.push({
          id: item.id.playlistId,
          type: 'playlist',
          title: item.snippet?.title || 'Unknown Playlist',
          thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || 'https://via.placeholder.com/640x360.png?text=Playlist',
          channelTitle: item.snippet?.channelTitle || 'Unknown Channel',
          channelAvatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.snippet?.channelTitle || 'U') + '&background=random',
          views: 'Playlist',
          publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt).toLocaleDateString() : 'Unknown Data',
          duration: 'Playlist',
        });
      }
    });

    return {
      videos: mappedItems,
      nextPageToken: searchResponse.data.nextPageToken,
    };
  } catch (error) {
    console.error('Error searching videos:', error);
    return { videos: [] };
  }
};

export const fetchVideoById = async (id: string): Promise<Video | null> => {
  try {
    const response = await axios.get(`${BASE_URL}/videos`, {
      params: {
        part: 'snippet,statistics,contentDetails',
        id: id,
        key: YOUTUBE_API_KEY,
      },
    });
    
    if (response.data.items && response.data.items.length > 0) {
      return mapYouTubeResponseToVideos(response.data.items)[0];
    }
    return null;
  } catch (error) {
    console.error('Error fetching video by ID:', error);
    return null;
  }
};

export const fetchPlaylistById = async (id: string): Promise<Video | null> => {
  try {
    const response = await axios.get(`${BASE_URL}/playlists`, {
      params: {
        part: 'snippet,contentDetails',
        id: id,
        key: YOUTUBE_API_KEY,
      },
    });
    
    if (response.data.items && response.data.items.length > 0) {
      const item = response.data.items[0];
      return {
        id: item.id,
        type: 'playlist',
        title: item.snippet?.title || 'Unknown Title',
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || 'https://via.placeholder.com/640x360.png?text=Playlist',
        channelTitle: item.snippet?.channelTitle || 'Unknown Channel',
        channelAvatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.snippet?.channelTitle || 'U') + '&background=random',
        views: 'Playlist',
        publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt).toLocaleDateString() : 'Unknown Data',
        duration: item.contentDetails?.itemCount ? `${item.contentDetails.itemCount} videos` : 'Playlist',
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching playlist by ID:', error);
    return null;
  }
};

// Helper function to map the messy YouTube API response to our clean Video interface
const mapYouTubeResponseToVideos = (items: any[]): Video[] => {
  if (!items) return [];
  return items.map((item: any) => ({
    id: item.id,
    title: item.snippet?.title || 'Unknown Title',
    thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || 'https://via.placeholder.com/640x360.png?text=No+Thumbnail',
    channelTitle: item.snippet?.channelTitle || 'Unknown Channel',
    // YouTube API requires a separate call to `channels` endpoint to get the channel avatar.
    // To save API quota, we use a placeholder or generic avatar here.
    channelAvatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.snippet?.channelTitle || 'U') + '&background=random',
    views: formatViewCount(item.statistics?.viewCount),
    publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt).toLocaleDateString() : 'Unknown Data',
    duration: parseDuration(item.contentDetails?.duration),
  }));
};

const formatViewCount = (views: string | undefined): string => {
  if (!views) return '0';
  const num = parseInt(views, 10);
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const parseDuration = (duration: string | undefined): string => {
  if (!duration) return '0:00';
  // YouTube duration is in ISO 8601 format (e.g., PT1H2M10S)
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '0:00';
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
