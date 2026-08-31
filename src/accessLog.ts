import { auth } from "@/src/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const GUEST_ID_KEY = "@access_guest_id";

let cachedGuestId: string | null = null;
let lastLogKey = "";
let lastLogAt = 0;

const randomId = () =>
  `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const getGuestId = async (): Promise<string> => {
  if (cachedGuestId) return cachedGuestId;
  try {
    const existing = await AsyncStorage.getItem(GUEST_ID_KEY);
    if (existing) {
      cachedGuestId = existing;
      return existing;
    }
    const created = randomId();
    await AsyncStorage.setItem(GUEST_ID_KEY, created);
    cachedGuestId = created;
    return created;
  } catch {
    const fallback = randomId();
    cachedGuestId = fallback;
    return fallback;
  }
};

export type AccessLogInput = {
  screen: string;
  action?: string;
  details?: Record<string, unknown>;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
};

const waitForAuth = async () => {
  try {
    if (typeof auth.authStateReady === "function") {
      await auth.authStateReady();
    }
  } catch {
    // Continue with whatever auth state is available.
  }
};

export const logAccess = async ({
  screen,
  action = "view",
  details = {},
  userId,
  userName,
  userEmail,
}: AccessLogInput) => {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl || !screen) return;

  try {
    await waitForAuth();
    const currentUser = auth.currentUser;
    const resolvedUserId = userId || currentUser?.uid || null;
    const resolvedEmail =
      userEmail ||
      currentUser?.email ||
      currentUser?.phoneNumber ||
      null;
    const resolvedName =
      userName || currentUser?.displayName || null;

    const key = `${screen}|${action}|${resolvedUserId || "guest"}|${JSON.stringify(details)}`;
    const now = Date.now();
    if (key === lastLogKey && now - lastLogAt < 2000) return;
    lastLogKey = key;
    lastLogAt = now;

    const guestId = await getGuestId();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (currentUser) {
      headers.Authorization = `Bearer ${await currentUser.getIdToken()}`;
    }

    await axios.post(
      `${baseUrl}/api/visits/log`,
      {
        screen,
        action,
        details,
        guestId,
        userId: resolvedUserId,
        userName: resolvedName,
        userEmail: resolvedEmail,
      },
      { headers, timeout: 8000 },
    );
  } catch {
    // Access logging must never break the app.
  }
};
