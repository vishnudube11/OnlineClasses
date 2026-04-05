import axios from "axios";

export interface Video {
  id: string;
  type?: "video" | "playlist";
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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

const apiGet = async <T>(
  path: string,
  params?: Record<string, any>,
): Promise<T> => {
  if (!API_BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }
  const url = `${API_BASE_URL}${path}`;
  const res = await axios.get(url, { params, timeout: 15000 });
  return res.data as T;
};

export const fetchTrendingVideos = async (
  pageToken?: string,
): Promise<FetchResponse> => {
  try {
    return await apiGet<FetchResponse>("/api/youtube/trending", { pageToken });
  } catch (error) {
    console.error("Error fetching trending videos:", error);
    return { videos: [] };
  }
};

export const searchVideos = async (
  query: string,
  pageToken?: string,
): Promise<FetchResponse> => {
  try {
    if (!query) return fetchTrendingVideos(pageToken);

    return await apiGet<FetchResponse>("/api/youtube/search", {
      q: query,
      pageToken,
    });
  } catch (error) {
    console.error("Error searching videos:", error);
    return { videos: [] };
  }
};

export const fetchVideoById = async (id: string): Promise<Video | null> => {
  try {
    return await apiGet<Video | null>("/api/youtube/video", { id });
  } catch (error) {
    console.error("Error fetching video by ID:", error);
    return null;
  }
};

export const fetchPlaylistById = async (id: string): Promise<Video | null> => {
  try {
    return await apiGet<Video | null>("/api/youtube/playlist", { id });
  } catch (error) {
    console.error("Error fetching playlist by ID:", error);
    return null;
  }
};

// Helper function to map the messy YouTube API response to our clean Video interface
const mapYouTubeResponseToVideos = (items: any[]): Video[] => {
  if (!items) return [];
  return items.map((item: any) => ({
    id: item.id,
    title: item.snippet?.title || "Unknown Title",
    thumbnail:
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      "https://via.placeholder.com/640x360.png?text=No+Thumbnail",
    channelTitle: item.snippet?.channelTitle || "Unknown Channel",
    // YouTube API requires a separate call to `channels` endpoint to get the channel avatar.
    // To save API quota, we use a placeholder or generic avatar here.
    channelAvatar:
      "https://ui-avatars.com/api/?name=" +
      encodeURIComponent(item.snippet?.channelTitle || "U") +
      "&background=random",
    views: formatViewCount(item.statistics?.viewCount),
    publishedAt: item.snippet?.publishedAt
      ? new Date(item.snippet.publishedAt).toLocaleDateString()
      : "Unknown Data",
    duration: parseDuration(item.contentDetails?.duration),
  }));
};

const formatViewCount = (views: string | undefined): string => {
  if (!views) return "0";
  const num = parseInt(views, 10);
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const parseDuration = (duration: string | undefined): string => {
  if (!duration) return "0:00";
  // YouTube duration is in ISO 8601 format (e.g., PT1H2M10S)
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return "0:00";
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  if (hours > 0)
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
