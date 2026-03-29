const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const crypto = require("crypto");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const ytdl = require("ytdl-core");

const app = express();

app.use(cors());
app.use(express.json());

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_SECRET, PORT } =
  process.env;

const razorpaySecret = RAZORPAY_KEY_SECRET || RAZORPAY_SECRET;

if (!RAZORPAY_KEY_ID || !razorpaySecret) {
  console.warn(
    "Missing Razorpay keys. Expected RAZORPAY_KEY_ID and (RAZORPAY_KEY_SECRET or RAZORPAY_SECRET) in server env.",
  );
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: razorpaySecret,
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
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

app.post("/api/visitors/increment", incrementVisitorsHandler);
app.get("/api/visitors/increment", incrementVisitorsHandler);

app.get("/api/youtube/download", async (req, res) => {
  try {
    const { videoId } = req.query || {};

    if (!videoId || typeof videoId !== "string") {
      return res.status(400).json({ error: "videoId is required" });
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
