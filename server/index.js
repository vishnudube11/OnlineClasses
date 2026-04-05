const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const crypto = require("crypto");
const fs = require("fs");
const axios = require("axios");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const Razorpay = require("razorpay");
const ytdl = require("ytdl-core");

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
} = process.env;

const razorpaySecret = RAZORPAY_KEY_SECRET || RAZORPAY_SECRET;

if (!RAZORPAY_KEY_ID || !razorpaySecret) {
  console.warn(
    "Missing Razorpay keys. Expected RAZORPAY_KEY_ID and (RAZORPAY_KEY_SECRET or RAZORPAY_SECRET) in server env.",
  );
}

if (!YOUTUBE_API_KEY) {
  console.warn(
    "Missing YOUTUBE_API_KEY in server env. YouTube proxy endpoints will fail without it.",
  );
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
const ytCache = new Map();

const getCacheKey = (kind, params) => {
  const sorted = Object.keys(params || {})
    .sort()
    .map((k) => `${k}=${String(params[k])}`)
    .join("&");
  return `${kind}?${sorted}`;
};

const cacheGet = (key) => {
  const hit = ytCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    ytCache.delete(key);
    return null;
  }
  return hit.value;
};

const cacheSet = (key, value) => {
  ytCache.set(key, { value, expiresAt: Date.now() + YT_CACHE_TTL_MS });
};

const pruneCache = () => {
  const now = Date.now();
  for (const [k, v] of ytCache.entries()) {
    if (!v || now > v.expiresAt) ytCache.delete(k);
  }
};

setInterval(pruneCache, 5 * 60 * 1000).unref();

const ytGet = async (path, params) => {
  if (!YOUTUBE_API_KEY) {
    const err = new Error("Missing YOUTUBE_API_KEY");
    err.statusCode = 500;
    throw err;
  }
  const res = await axios.get(`${YT_BASE_URL}${path}`, {
    params: { ...params, key: YOUTUBE_API_KEY },
    timeout: 15000,
  });
  return res.data;
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

app.get("/api/youtube/trending", youtubeLimiter, async (req, res) => {
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
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

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
    cacheSet(cacheKey, payload);
    return res.json(payload);
  } catch (err) {
    console.error("youtube trending error:", err?.response?.data || err);
    return res
      .status(err?.statusCode || 500)
      .json({ error: "Failed to fetch trending videos" });
  }
});

app.get("/api/youtube/search", youtubeLimiter, async (req, res) => {
  try {
    const { q, pageToken } = req.query || {};
    const query = typeof q === "string" ? q.trim() : "";

    if (!query) {
      return res.status(400).json({ error: "q is required" });
    }
    if (query.length > 200) {
      return res.status(400).json({ error: "q is too long" });
    }

    const searchParams = {
      part: "snippet",
      q: query,
      type: "video,playlist",
      maxResults: 15,
      pageToken: pageToken || undefined,
    };

    const cacheKey = getCacheKey("search", searchParams);
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const searchData = await ytGet("/search", searchParams);
    const items = searchData.items || [];
    if (items.length === 0) {
      const payload = { videos: [], nextPageToken: undefined };
      cacheSet(cacheKey, payload);
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
          details.snippet?.categoryId !== "10"
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
    cacheSet(cacheKey, payload);
    return res.json(payload);
  } catch (err) {
    console.error("youtube search error:", err?.response?.data || err);
    return res
      .status(err?.statusCode || 500)
      .json({ error: "Failed to search videos" });
  }
});

app.get("/api/youtube/video", youtubeLimiter, async (req, res) => {
  try {
    const { id } = req.query || {};
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "id is required" });
    }
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const params = { part: "snippet,statistics,contentDetails", id };
    const cacheKey = getCacheKey("video", params);
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const data = await ytGet("/videos", params);
    const item = (data.items || [])[0];
    const payload = item ? mapYouTubeResponseToVideos([item])[0] : null;
    cacheSet(cacheKey, payload);
    return res.json(payload);
  } catch (err) {
    console.error("youtube video error:", err?.response?.data || err);
    return res
      .status(err?.statusCode || 500)
      .json({ error: "Failed to fetch video" });
  }
});

app.get("/api/youtube/playlist", youtubeLimiter, async (req, res) => {
  try {
    const { id } = req.query || {};
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "id is required" });
    }
    if (id.length > 120) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const params = { part: "snippet,contentDetails", id };
    const cacheKey = getCacheKey("playlist", params);
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

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
    cacheSet(cacheKey, payload);
    return res.json(payload);
  } catch (err) {
    console.error("youtube playlist error:", err?.response?.data || err);
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
    return 0;
  }
};

const writeVisitorCount = (count) => {
  fs.writeFileSync(VISITOR_COUNT_FILE, JSON.stringify({ count }), "utf8");
};

app.get("/api/visitors", (_req, res) => {
  const count = readVisitorCount();
  res.json({ count });
});

const incrementVisitorsHandler = (_req, res) => {
  const count = readVisitorCount() + 1;
  try {
    writeVisitorCount(count);
  } catch (e) {
    console.error("visitor count write error:", e);
    return res.status(500).json({ error: "Failed to update visitor count" });
  }
  return res.json({ count });
};

app.post("/api/visitors/increment", visitorsLimiter, incrementVisitorsHandler);
app.get("/api/visitors/increment", visitorsLimiter, incrementVisitorsHandler);

app.get("/api/youtube/download", downloadLimiter, async (req, res) => {
  try {
    const { videoId } = req.query || {};

    if (!videoId || typeof videoId !== "string") {
      return res.status(400).json({ error: "videoId is required" });
    }

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
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
      console.error("ytdl stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to download video" });
      } else {
        res.end();
      }
    });

    stream.pipe(res);
  } catch (err) {
    console.error("youtube download error:", err);
    return res.status(500).json({ error: "Failed to download video" });
  }
});

app.post("/api/razorpay/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, notes } = req.body || {};

    if (!amount || typeof amount !== "number") {
      return res.status(400).json({ error: "amount (number) is required" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency,
      receipt,
      notes,
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
    console.error("create-order error:", {
      message: err?.message,
      statusCode,
      error: errorBody,
    });
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
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment fields" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", razorpaySecret)
      .update(body)
      .digest("hex");

    const verified = expected === razorpay_signature;

    return res.json({ verified });
  } catch (err) {
    console.error("verify-payment error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
});

const port = PORT || 4000;
app.listen(port, () => {
  console.log(`Razorpay server running on http://localhost:${port}`);
});
