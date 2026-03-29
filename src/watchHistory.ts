import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Video } from "@/src/api/youtube";

const STORAGE_KEY = "watch_history_v1";
const MAX_ITEMS = 50;

export type WatchHistoryItem = {
  id: string;
  type?: "video" | "playlist";
  title: string;
  thumbnail: string;
  channelTitle: string;
  channelAvatar: string;
  duration: string;
  lastPositionSec?: number;
  updatedAt: number;
  category?: string;
};

const safeJsonParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const getWatchHistory = async (): Promise<WatchHistoryItem[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const data = safeJsonParse<WatchHistoryItem[]>(raw);
  if (!Array.isArray(data)) return [];
  return data;
};

const setWatchHistory = async (items: WatchHistoryItem[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const upsertVisitedVideo = async (params: {
  video: Video;
  category?: string;
}) => {
  const { video, category } = params;
  const items = await getWatchHistory();

  const next: WatchHistoryItem = {
    id: video.id,
    type: video.type,
    title: video.title,
    thumbnail: video.thumbnail,
    channelTitle: video.channelTitle,
    channelAvatar: video.channelAvatar,
    duration: video.duration,
    lastPositionSec: items.find((x) => x.id === video.id)?.lastPositionSec,
    updatedAt: Date.now(),
    ...(category ? { category } : {}),
  };

  const filtered = items.filter((x) => x.id !== video.id);
  const merged = [next, ...filtered].slice(0, MAX_ITEMS);
  await setWatchHistory(merged);
};

export const setLastPositionSec = async (params: {
  videoId: string;
  positionSec: number;
}) => {
  const { videoId, positionSec } = params;
  const items = await getWatchHistory();

  const idx = items.findIndex((x) => x.id === videoId);
  if (idx === -1) return;

  const updated: WatchHistoryItem = {
    ...items[idx],
    lastPositionSec: Math.max(0, Math.floor(positionSec)),
    updatedAt: Date.now(),
  };

  const next = [updated, ...items.filter((x) => x.id !== videoId)].slice(
    0,
    MAX_ITEMS,
  );
  await setWatchHistory(next);
};

export const getLastPositionSec = async (videoId: string) => {
  const items = await getWatchHistory();
  return items.find((x) => x.id === videoId)?.lastPositionSec;
};
