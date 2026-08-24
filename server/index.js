const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const crypto = require("crypto");
const fs = require("fs");
const axios = require("axios");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const ytdl = require("ytdl-core");

// Simple logger for server
const logger = {
  formatTimestamp: () => {
    const now = new Date();
    const date = now.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    const time = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    return `${date} ${time}`;
  },
  info: (message, context = {}) => {
    const timestamp = logger.formatTimestamp();
    console.log(`[${timestamp}] [INFO] ${message}`, context);
  },
  error: (message, error, context = {}) => {
    const timestamp = logger.formatTimestamp();
    console.error(`[${timestamp}] [ERROR] ${message}`, {
      ...context,
      error: error?.message,
      stack: error?.stack,
    });
  },
  warn: (message, context = {}) => {
    const timestamp = logger.formatTimestamp();
    console.warn(`[${timestamp}] [WARN] ${message}`, context);
  },
  api: (message, context = {}) => {
    const timestamp = logger.formatTimestamp();
    console.log(`[${timestamp}] [API] ${message}`, context);
  },
};

const app = express();

app.set("trust proxy", 1);

const parseAllowedOrigins = (raw) => {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0) return cb(null, true);
      const ok = allowedOrigins.includes(origin);
      return ok
        ? cb(null, true)
        : cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: false,
    methods: ["GET", "POST", "OPTIONS"],
  }),
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(express.json({ limit: "100kb" }));

const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
app.use(defaultLimiter);

const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const visitorsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const youtubeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_SECRET,
  PORT,
  YOUTUBE_API_KEY,
  FIREBASE_SERVICE_ACCOUNT_JSON,
  FIREBASE_SERVICE_ACCOUNT_PATH,
} = process.env;

const razorpaySecret = RAZORPAY_KEY_SECRET || RAZORPAY_SECRET;

let firestore = null;

try {
  const rawSvcJson =
    FIREBASE_SERVICE_ACCOUNT_JSON ||
    (FIREBASE_SERVICE_ACCOUNT_PATH
      ? fs.readFileSync(FIREBASE_SERVICE_ACCOUNT_PATH, "utf8")
      : null);

  if (rawSvcJson) {
    const svc = JSON.parse(rawSvcJson);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(svc),
      });
    }
    firestore = admin.firestore();
    logger.info("Firebase Admin initialized successfully");
  } else {
    logger.warn("Missing Firebase service account configuration", {
      hasJson: !!FIREBASE_SERVICE_ACCOUNT_JSON,
      hasPath: !!FIREBASE_SERVICE_ACCOUNT_PATH,
    });
  }
} catch (err) {
  logger.error("Failed to initialize Firebase Admin", err);
}

const getBearerToken = (req) => {
  const raw = req.headers.authorization;
  if (!raw) return null;
  const m = String(raw).match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
};

const requireFirebaseUser = async (req, res) => {
  if (!firestore) {
    logger.warn("Firestore not configured for request");
    res.status(503).json({ error: "Firestore not configured" });
    return null;
  }
  const idToken = getBearerToken(req);
  if (!idToken) {
    logger.warn("Missing Authorization Bearer token");
    res.status(401).json({ error: "Missing Authorization Bearer token" });
    return null;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    logger.info("Firebase token verified", { uid: decoded.uid });
    return decoded;
  } catch (_e) {
    logger.warn("Invalid Firebase token", { error: _e?.message });
    res.status(401).json({ error: "Invalid Firebase token" });
    return null;
  }
};

if (!RAZORPAY_KEY_ID || !razorpaySecret) {
  logger.warn("Missing Razorpay keys", {
    hasKeyId: !!RAZORPAY_KEY_ID,
    hasSecret: !!razorpaySecret,
  });
}

if (!YOUTUBE_API_KEY) {
  logger.warn("Missing YOUTUBE_API_KEY");
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: razorpaySecret,
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const YT_BASE_URL = "https://www.googleapis.com/youtube/v3";

const YT_CACHE_TTL_MS =
  Number(process.env.YOUTUBE_CACHE_TTL_MS) > 0
    ? Number(process.env.YOUTUBE_CACHE_TTL_MS)
    : 15 * 60 * 1000;

// In-memory cache as secondary layer for performance
const ytMemoryCache = new Map();

const getCacheKey = (kind, params) => {
  const sorted = Object.keys(params || {})
    .sort()
    .map((k) => `${k}=${String(params[k])}`)
    .join("&");
  return `${kind}?${sorted}`;
};

// Firestore cache functions
const firestoreCacheGet = async (key) => {
  if (!firestore) return null;

  try {
    // Check memory cache first
    const memoryHit = ytMemoryCache.get(key);
    if (memoryHit) {
      logger.api("Memory cache hit", { key });
      return memoryHit.value;
    }

    // Check Firestore cache
    const doc = await firestore.collection("youtubeCache").doc(key).get();
    if (!doc.exists) {
      logger.api("Firestore cache miss", { key });
      return null;
    }

    const data = doc.data();
    logger.api("Firestore cache hit", { key });
    const cachedData = data.data;

    // Update memory cache (no expiration for Firestore cache)
    ytMemoryCache.set(key, { value: cachedData, expiresAt: Infinity });
    return cachedData;
  } catch (error) {
    logger.error("Firestore cache get error", error, { key });
    return null;
  }
};

const firestoreCacheSet = async (key, value, kind, params) => {
  if (!firestore) return;

  try {
    // Remove undefined values from params
    const cleanParams = {};
    if (params) {
      Object.keys(params).forEach((k) => {
        if (params[k] !== undefined) {
          cleanParams[k] = params[k];
        }
      });
    }

    await firestore.collection("youtubeCache").doc(key).set({
      data: value,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      kind,
      params: cleanParams,
    });

    // Update memory cache (no expiration for Firestore cache)
    ytMemoryCache.set(key, { value, expiresAt: Infinity });
    logger.api("Firestore cache set", { key, kind });
  } catch (error) {
    logger.error("Firestore cache set error", error, { key });
    // Don't throw - memory cache is sufficient
  }
};

// Legacy in-memory cache functions (kept as fallback)
const cacheGet = (key) => {
  const hit = ytMemoryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    ytMemoryCache.delete(key);
    return null;
  }
  return hit.value;
};

const cacheSet = (key, value) => {
  ytMemoryCache.set(key, { value, expiresAt: Date.now() + YT_CACHE_TTL_MS });
};

const pruneCache = () => {
  const now = Date.now();
  for (const [k, v] of ytMemoryCache.entries()) {
    if (!v || now > v.expiresAt) ytMemoryCache.delete(k);
  }
};

setInterval(pruneCache, 5 * 60 * 1000).unref();

const ytGet = async (path, params) => {
  logger.api(`YouTube API request: ${path}`, { params });
  if (!YOUTUBE_API_KEY) {
    logger.error("Missing YOUTUBE_API_KEY", null, { path });
    const err = new Error("Missing YOUTUBE_API_KEY");
    err.statusCode = 500;
    throw err;
  }
  try {
    const res = await axios.get(`${YT_BASE_URL}${path}`, {
      params: { ...params, key: YOUTUBE_API_KEY },
      timeout: 15000,
    });
    logger.api(`YouTube API success: ${path}`, {
      itemCount: res.data?.items?.length,
    });
    return res.data;
  } catch (error) {
    logger.error(`YouTube API failed: ${path}`, error, { params });
    throw error;
  }
};

const mapYouTubeResponseToVideos = (items) => {
  if (!items) return [];
  return items.map((item) => ({
    id: item.id,
    title: item.snippet?.title || "Unknown Title",
    thumbnail:
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      "https://via.placeholder.com/640x360.png?text=No+Thumbnail",
    channelTitle: item.snippet?.channelTitle || "Unknown Channel",
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

const formatViewCount = (views) => {
  if (!views) return "0";
  const num = parseInt(views, 10);
  if (!Number.isFinite(num)) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return String(num);
};

const parseDuration = (duration) => {
  if (!duration) return "0:00";
  const match = String(duration).match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return "0:00";
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  if (hours > 0)
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const loadSupportedLanguages = () => {
  const candidates = [
    path.join(__dirname, "supportedLanguages.json"),
    path.join(__dirname, "../src/i18n/supportedLanguages.json"),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      return require(filePath);
    }
  }
  throw new Error(
    "supportedLanguages.json not found next to the server or in src/i18n",
  );
};

const SUPPORTED_LANGUAGES = loadSupportedLanguages();

const CONTENT_LANGUAGE_CONFIG = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((language) => [
    language.code,
    {
      relevanceLanguage: language.relevanceLanguage,
      regionCode: language.regionCode,
      keywords: language.keywords || [],
      scriptStart: language.scriptStart || "",
      scriptEnd: language.scriptEnd || "",
    },
  ]),
);

const parseLangCode = (raw) => {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase().split("-")[0].slice(0, 2);
};

const textMatchesLanguage = (text, language) => {
  const config = CONTENT_LANGUAGE_CONFIG[language];
  if (!config) return false;

  const lower = String(text || "").toLowerCase();
  if (
    (config.keywords || []).some((keyword) =>
      lower.includes(String(keyword).toLowerCase()),
    )
  ) {
    return true;
  }

  if (config.scriptStart && config.scriptEnd) {
    const scriptRe = new RegExp(
      `[\\u${config.scriptStart}-\\u${config.scriptEnd}]`,
    );
    if (!scriptRe.test(text)) return false;
    if (language === "zh" && /[\u3040-\u30FF]/.test(text)) return false;
    if (language === "ja") return /[\u3040-\u30FF]/.test(text);
    if (language === "ur") return /urdu|اردو/i.test(text);
    if (language === "ar") return /arabic|العربية|عربي/i.test(text) || scriptRe.test(text);
    if (language === "mr") return /marathi|मराठी/i.test(text);
    if (language === "hi") return /hindi|हिंदी|हिन्दी/i.test(text) || scriptRe.test(text);
    return true;
  }

  return false;
};

const matchesSelectedLanguage = (snippet, lang) => {
  if (!lang) return true;

  const title = String(snippet?.title || "");
  const description = String(snippet?.description || "");
  const text = `${title} ${description}`;
  const audio = parseLangCode(snippet?.defaultAudioLanguage);
  const defaultLang = parseLangCode(snippet?.defaultLanguage);

  if (audio) return audio === lang;
  if (defaultLang) return defaultLang === lang;

  if (!CONTENT_LANGUAGE_CONFIG[lang]) return true;

  if (lang === "en") {
    return !SUPPORTED_LANGUAGES.some(
      (language) =>
        language.code !== "en" && textMatchesLanguage(text, language.code),
    );
  }

  return textMatchesLanguage(text, lang);
};

app.get("/api/youtube/trending", youtubeLimiter, async (req, res) => {
  logger.info("YouTube trending requested", {
    pageToken: req.query?.pageToken,
  });
  try {
    const { pageToken } = req.query || {};
    const params = {
      part: "snippet,statistics,contentDetails,status",
      chart: "mostPopular",
      regionCode: "US",
      maxResults: 30,
      pageToken: pageToken || undefined,
    };

    const cacheKey = getCacheKey("trending", params);
    const cached = await firestoreCacheGet(cacheKey);
    if (cached) {
      logger.info("YouTube trending cache hit");
      return res.json(cached);
    }

    const data = await ytGet("/videos", params);
    const usableItems = (data.items || []).filter((item) => {
      const isNotMusic = item.snippet?.categoryId !== "10";
      const isPublic = item.status?.privacyStatus === "public";
      const isEmbeddable = item.status?.embeddable === true;
      return isNotMusic && isPublic && isEmbeddable;
    });

    const payload = {
      videos: mapYouTubeResponseToVideos(usableItems.slice(0, 15)),
      nextPageToken: data.nextPageToken,
    };
    await firestoreCacheSet(cacheKey, payload, "trending", params);
    logger.info("YouTube trending fetched successfully", {
      count: payload.videos.length,
    });
    return res.json(payload);
  } catch (err) {
    logger.error("YouTube trending error", err);
    return res
      .status(err?.statusCode || 500)
      .json({ error: "Failed to fetch trending videos" });
  }
});

app.get("/api/youtube/search", youtubeLimiter, async (req, res) => {
  logger.info("YouTube search requested", {
    query: req.query?.q,
    pageToken: req.query?.pageToken,
  });
  try {
    const { q, pageToken, lang } = req.query || {};
    const query = typeof q === "string" ? q.trim() : "";
    const language = parseLangCode(lang);
    const languageConfig = CONTENT_LANGUAGE_CONFIG[language] || null;

    if (!query) {
      logger.warn("YouTube search: missing query");
      return res.status(400).json({ error: "q is required" });
    }
    if (query.length > 250) {
      logger.warn("YouTube search: query too long", { length: query.length });
      return res.status(400).json({ error: "q is too long" });
    }

    const searchParams = {
      part: "snippet",
      q: query,
      type: "video,playlist",
      maxResults: languageConfig ? 50 : 15,
      pageToken: pageToken || undefined,
      ...(languageConfig
        ? {
            relevanceLanguage: languageConfig.relevanceLanguage,
            regionCode: languageConfig.regionCode,
          }
        : {}),
    };

    const cacheKey = getCacheKey("search", {
      ...searchParams,
      v: languageConfig ? "lang3" : "1",
    });
    const cached = await firestoreCacheGet(cacheKey);
    if (cached) {
      logger.info("YouTube search cache hit", { query });
      return res.json(cached);
    }

    const searchData = await ytGet("/search", searchParams);
    const items = searchData.items || [];
    if (items.length === 0) {
      const payload = { videos: [], nextPageToken: undefined };
      await firestoreCacheSet(cacheKey, payload, "search", searchParams);
      logger.info("YouTube search: no results", { query });
      return res.json(payload);
    }

    const videoItems = items.filter(
      (item) => item.id?.kind === "youtube#video",
    );
    const videoIds = videoItems.map((item) => item.id.videoId).join(",");

    const videoDetailsMap = {};
    if (videoIds) {
      const videosData = await ytGet("/videos", {
        part: "snippet,statistics,contentDetails,status",
        id: videoIds,
      });
      (videosData.items || []).forEach((item) => {
        videoDetailsMap[item.id] = item;
      });
    }

    const mappedItems = [];
    items.forEach((item) => {
      if (item.id?.kind === "youtube#video") {
        const details = videoDetailsMap[item.id.videoId];
        if (
          details &&
          details.status?.embeddable === true &&
          details.status?.privacyStatus === "public" &&
          details.snippet?.categoryId !== "10" &&
          matchesSelectedLanguage(details.snippet, languageConfig ? language : "")
        ) {
          mappedItems.push({
            id: details.id,
            type: "video",
            title: details.snippet?.title || "Unknown Title",
            thumbnail:
              details.snippet?.thumbnails?.high?.url ||
              details.snippet?.thumbnails?.medium?.url ||
              "https://via.placeholder.com/640x360.png?text=No+Thumbnail",
            channelTitle: details.snippet?.channelTitle || "Unknown Channel",
            channelAvatar:
              "https://ui-avatars.com/api/?name=" +
              encodeURIComponent(details.snippet?.channelTitle || "U") +
              "&background=random",
            views: formatViewCount(details.statistics?.viewCount),
            publishedAt: details.snippet?.publishedAt
              ? new Date(details.snippet.publishedAt).toLocaleDateString()
              : "Unknown Data",
            duration: parseDuration(details.contentDetails?.duration),
          });
        }
      } else if (item.id?.kind === "youtube#playlist") {
        if (!matchesSelectedLanguage(item.snippet, languageConfig ? language : "")) {
          return;
        }
        mappedItems.push({
          id: item.id.playlistId,
          type: "playlist",
          title: item.snippet?.title || "Unknown Playlist",
          thumbnail:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            "https://via.placeholder.com/640x360.png?text=Playlist",
          channelTitle: item.snippet?.channelTitle || "Unknown Channel",
          channelAvatar:
            "https://ui-avatars.com/api/?name=" +
            encodeURIComponent(item.snippet?.channelTitle || "U") +
            "&background=random",
          views: "Playlist",
          publishedAt: item.snippet?.publishedAt
            ? new Date(item.snippet.publishedAt).toLocaleDateString()
            : "Unknown Data",
          duration: "Playlist",
        });
      }
    });

    const payload = {
      videos: mappedItems,
      nextPageToken: searchData.nextPageToken,
    };
    await firestoreCacheSet(cacheKey, payload, "search", searchParams);
    logger.info("YouTube search completed", {
      query,
      count: mappedItems.length,
    });
    return res.json(payload);
  } catch (err) {
    logger.error("YouTube search error", err, { query: req.query?.q });
    return res
      .status(err?.statusCode || 500)
      .json({ error: "Failed to search videos" });
  }
});

app.get("/api/youtube/video", youtubeLimiter, async (req, res) => {
  logger.info("YouTube video requested", { id: req.query?.id });
  try {
    const { id } = req.query || {};
    if (!id || typeof id !== "string") {
      logger.warn("YouTube video: missing id");
      return res.status(400).json({ error: "id is required" });
    }
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
      logger.warn("YouTube video: invalid id", { id });
      return res.status(400).json({ error: "Invalid id" });
    }

    const params = { part: "snippet,statistics,contentDetails", id };
    const cacheKey = getCacheKey("video", params);
    const cached = await firestoreCacheGet(cacheKey);
    if (cached) {
      logger.info("YouTube video cache hit", { id });
      return res.json(cached);
    }

    const data = await ytGet("/videos", params);
    const item = (data.items || [])[0];
    const payload = item ? mapYouTubeResponseToVideos([item])[0] : null;
    await firestoreCacheSet(cacheKey, payload, "video", params);
    logger.info("YouTube video fetched successfully", { id });
    return res.json(payload);
  } catch (err) {
    logger.error("YouTube video error", err, { id: req.query?.id });
    return res
      .status(err?.statusCode || 500)
      .json({ error: "Failed to fetch video" });
  }
});

app.get("/api/youtube/playlist", youtubeLimiter, async (req, res) => {
  logger.info("YouTube playlist requested", { id: req.query?.id });
  try {
    const { id } = req.query || {};
    if (!id || typeof id !== "string") {
      logger.warn("YouTube playlist: missing id");
      return res.status(400).json({ error: "id is required" });
    }
    if (id.length > 120) {
      logger.warn("YouTube playlist: invalid id", { id, length: id.length });
      return res.status(400).json({ error: "Invalid id" });
    }

    const params = { part: "snippet,contentDetails", id };
    const cacheKey = getCacheKey("playlist", params);
    const cached = await firestoreCacheGet(cacheKey);
    if (cached) {
      logger.info("YouTube playlist cache hit", { id });
      return res.json(cached);
    }

    const data = await ytGet("/playlists", params);
    const item = (data.items || [])[0];
    const payload =
      item && item.id
        ? {
            id: item.id,
            type: "playlist",
            title: item.snippet?.title || "Unknown Title",
            thumbnail:
              item.snippet?.thumbnails?.high?.url ||
              item.snippet?.thumbnails?.medium?.url ||
              "https://via.placeholder.com/640x360.png?text=Playlist",
            channelTitle: item.snippet?.channelTitle || "Unknown Channel",
            channelAvatar:
              "https://ui-avatars.com/api/?name=" +
              encodeURIComponent(item.snippet?.channelTitle || "U") +
              "&background=random",
            views: "Playlist",
            publishedAt: item.snippet?.publishedAt
              ? new Date(item.snippet.publishedAt).toLocaleDateString()
              : "Unknown Data",
            duration: item.contentDetails?.itemCount
              ? `${item.contentDetails.itemCount} videos`
              : "Playlist",
          }
        : null;
    await firestoreCacheSet(cacheKey, payload, "playlist", params);
    logger.info("YouTube playlist fetched successfully", { id });
    return res.json(payload);
  } catch (err) {
    logger.error("YouTube playlist error", err, { id: req.query?.id });
    return res
      .status(err?.statusCode || 500)
      .json({ error: "Failed to fetch playlist" });
  }
});

const VISITOR_COUNT_FILE = path.join(__dirname, "visitor-count.json");

const readVisitorCount = () => {
  try {
    const raw = fs.readFileSync(VISITOR_COUNT_FILE, "utf8");
    const data = JSON.parse(raw);
    const count = Number(data?.count);
    return Number.isFinite(count) && count >= 0 ? count : 0;
  } catch (_e) {
    logger.warn("Failed to read visitor count", { error: _e?.message });
    return 0;
  }
};

const writeVisitorCount = (count) => {
  fs.writeFileSync(VISITOR_COUNT_FILE, JSON.stringify({ count }), "utf8");
};

app.get("/api/visitors", (_req, res) => {
  const count = readVisitorCount();
  logger.info("Visitor count requested", { count });
  res.json({ count });
});

const incrementVisitorsHandler = (_req, res) => {
  const count = readVisitorCount() + 1;
  try {
    writeVisitorCount(count);
    logger.info("Visitor count incremented", { count });
  } catch (e) {
    logger.error("Visitor count write error", e);
    return res.status(500).json({ error: "Failed to update visitor count" });
  }
  return res.json({ count });
};

app.post("/api/visitors/increment", visitorsLimiter, incrementVisitorsHandler);
app.get("/api/visitors/increment", visitorsLimiter, incrementVisitorsHandler);

app.get("/api/youtube/download", downloadLimiter, async (req, res) => {
  logger.info("YouTube download requested", { videoId: req.query?.videoId });
  try {
    const { videoId } = req.query || {};

    if (!videoId || typeof videoId !== "string") {
      logger.warn("YouTube download: missing videoId");
      return res.status(400).json({ error: "videoId is required" });
    }

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      logger.warn("YouTube download: invalid videoId", { videoId });
      return res.status(400).json({ error: "Invalid videoId" });
    }

    const info = await ytdl.getInfo(videoId);
    const title =
      (info.videoDetails && info.videoDetails.title) || `youtube_${videoId}`;

    const safeTitle = String(title)
      .replace(/[\\/:*?\"<>|]/g, "_")
      .slice(0, 120);
    const filename = `${safeTitle}.mp4`;

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"${filename}\"`,
    );

    const stream = ytdl(videoId, {
      quality: "highest",
      filter: "audioandvideo",
    });

    stream.on("error", (err) => {
      logger.error("ytdl stream error", err, { videoId });
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to download video" });
      } else {
        res.end();
      }
    });

    logger.info("YouTube download started", { videoId, filename });
    stream.pipe(res);
  } catch (err) {
    logger.error("YouTube download error", err, {
      videoId: req.query?.videoId,
    });
    return res.status(500).json({ error: "Failed to download video" });
  }
});

app.post("/api/razorpay/create-order", async (req, res) => {
  logger.info("Create order requested", {
    amount: req.body?.amount,
    currency: req.body?.currency,
  });
  try {
    const { amount, currency = "INR", receipt, notes } = req.body || {};

    if (!amount || typeof amount !== "number") {
      logger.warn("Create order: invalid amount", { amount });
      return res.status(400).json({ error: "amount (number) is required" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency,
      receipt,
      notes,
    });

    logger.info("Order created successfully", {
      orderId: order.id,
      amount: order.amount,
    });
    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (err) {
    const statusCode = err?.statusCode;
    const errorBody = err?.error;
    logger.error("Create order failed", err, { amount: req.body?.amount });
    return res.status(500).json({
      error: "Failed to create order",
      details: {
        message: err?.message,
        statusCode,
        error: errorBody,
      },
    });
  }
});

app.post("/api/razorpay/verify-payment", (req, res) => {
  logger.info("Verify payment requested", {
    orderId: req.body?.razorpay_order_id,
  });
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      logger.warn("Verify payment: missing fields", {
        orderId: razorpay_order_id,
      });
      return res.status(400).json({ error: "Missing payment fields" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", razorpaySecret)
      .update(body)
      .digest("hex");

    const verified = expected === razorpay_signature;
    logger.info("Payment verification completed", {
      orderId: razorpay_order_id,
      verified,
    });

    return res.json({ verified });
  } catch (err) {
    logger.error("Verify payment failed", err, {
      orderId: req.body?.razorpay_order_id,
    });
    return res.status(500).json({ error: "Verification failed" });
  }
});

app.get("/api/payments/status", async (req, res) => {
  logger.info("Payment status check requested", {
    category: req.query.category,
  });
  const user = await requireFirebaseUser(req, res);
  if (!user) return;

  try {
    const category =
      typeof req.query.category === "string" ? req.query.category : undefined;
    const uid = user.uid;
    const snap = await firestore.collection("users").doc(uid).get();
    const data = snap.exists ? snap.data() : null;

    if (!data) {
      logger.info("Payment status: no user data", { uid, category });
      return res.json({ paid: false });
    }

    if (!category) {
      const isPaid = data.paid === true;
      logger.info("Payment status: general check", { uid, paid: isPaid });
      return res.json({ paid: isPaid });
    }

    const key = String(category || "").toLowerCase();
    const paidCategories = data.paidCategories || {};
    const entry = paidCategories[key];
    if (entry === true) {
      logger.info("Payment status: paid (boolean true)", {
        uid,
        category: key,
      });
      return res.json({ paid: true });
    }
    if (entry && typeof entry === "object") {
      if (entry.flag === true || entry.paid === true) {
        logger.info("Payment status: paid (object flag)", {
          uid,
          category: key,
        });
        return res.json({ paid: true });
      }
    }

    const paidCourses = data.paidCourses || {};
    if (paidCourses[key] && paidCourses[key].paid === true) {
      logger.info("Payment status: paid (paidCourses)", { uid, category: key });
      return res.json({ paid: true });
    }
    logger.info("Payment status: not paid", { uid, category: key });
    return res.json({ paid: false });
  } catch (err) {
    logger.error("Payment status check failed", err, {
      category: req.query.category,
    });
    return res.status(500).json({ error: "Failed to read payment status" });
  }
});

app.post("/api/payments/mark-paid", async (req, res) => {
  logger.info("Mark payment as paid requested", {
    category: req.body?.category,
    amount: req.body?.amount,
  });
  const user = await requireFirebaseUser(req, res);
  if (!user) return;

  try {
    const {
      category,
      amount,
      currency,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    if (!category || typeof category !== "string") {
      logger.warn("Mark paid: missing category", { uid: user.uid });
      return res.status(400).json({ error: "category is required" });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      logger.warn("Mark paid: missing payment fields", {
        uid: user.uid,
        category,
      });
      return res.status(400).json({ error: "Missing payment fields" });
    }

    if (typeof amount !== "number" || !(amount > 0)) {
      logger.warn("Mark paid: invalid amount", {
        uid: user.uid,
        category,
        amount,
      });
      return res.status(400).json({ error: "amount (number) is required" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", razorpaySecret)
      .update(body)
      .digest("hex");

    const verified = expected === razorpay_signature;
    if (!verified) {
      logger.warn("Mark paid: payment verification failed", {
        uid: user.uid,
        category,
        orderId: razorpay_order_id,
      });
      return res.status(400).json({ error: "Payment verification failed" });
    }

    const uid = user.uid;
    const key = String(category || "").toLowerCase();
    const ref = firestore.collection("users").doc(uid);

    await ref.set(
      {
        paid: true,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        paidCategories: {
          [key]: {
            flag: true,
            amount,
            currency: typeof currency === "string" ? currency : "INR",
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            razorpay_order_id,
            razorpay_payment_id,
          },
        },
        lastPayment: {
          category: key,
          amount,
          currency: typeof currency === "string" ? currency : "INR",
          razorpay_order_id,
          razorpay_payment_id,
        },
      },
      { merge: true },
    );

    logger.info("Payment marked as paid successfully", {
      uid,
      category: key,
      amount,
    });
    return res.json({ ok: true });
  } catch (err) {
    logger.error("Mark paid error", err, { category: req.body?.category });
    return res.status(500).json({ error: "Failed to store payment status" });
  }
});

// Visit history endpoints
app.post("/api/visits/log", async (req, res) => {
  logger.info("Visit log requested", { screen: req.body?.screen });
  const user = await requireFirebaseUser(req, res);
  if (!user) return;

  try {
    const { screen, action, details } = req.body || {};

    if (!screen || typeof screen !== "string") {
      logger.warn("Visit log: missing screen", { uid: user.uid });
      return res.status(400).json({ error: "screen is required" });
    }

    const visitRef = firestore.collection("visitHistory").doc();
    await visitRef.set({
      userId: user.uid,
      userEmail: user.email,
      screen,
      action: action || "view",
      details: details || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("Visit logged successfully", { uid: user.uid, screen, action });
    return res.json({ ok: true });
  } catch (err) {
    logger.error("Visit log error", err, { screen: req.body?.screen });
    return res.status(500).json({ error: "Failed to log visit" });
  }
});

app.get("/api/visits/history", async (req, res) => {
  logger.info("Visit history requested");
  const user = await requireFirebaseUser(req, res);
  if (!user) return;

  try {
    const { screen, limit } = req.query || {};
    const limitNum = limit ? Math.min(parseInt(limit), 100) : 50;

    let query = firestore
      .collection("visitHistory")
      .where("userId", "==", user.uid)
      .orderBy("timestamp", "desc")
      .limit(limitNum);

    if (screen && typeof screen === "string") {
      query = query.where("screen", "==", screen);
    }

    const snapshot = await query.get();
    const visits = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    logger.info("Visit history retrieved", {
      uid: user.uid,
      count: visits.length,
    });
    return res.json({ visits });
  } catch (err) {
    logger.error("Visit history error", err);
    return res.status(500).json({ error: "Failed to retrieve visit history" });
  }
});

const port = PORT || 4000;
app.listen(port, () => {
  console.log(`Razorpay server running on http://localhost:${port}`);
});
