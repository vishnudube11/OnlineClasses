import { auth } from "@/src/firebase";
import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import type { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  PhoneAuthProvider,
  signInWithCredential,
  signInWithPhoneNumber,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SITE_URL } from "@/src/seo/config";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

function clearGoogleCallbackUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  [
    "code",
    "state",
    "scope",
    "authuser",
    "prompt",
    "session_state",
    "iss",
    "error",
    "error_description",
  ].forEach((key) => url.searchParams.delete(key));
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (
    /(^|[&#])(id_token|access_token|code|state|error)=/.test(hash)
  ) {
    url.hash = "";
  }
  const next = `${url.pathname}${url.search}${url.hash}` || "/";
  window.history.replaceState(window.history.state, "", next);
}

type User = {
  uid: string;
  name: string;
  email: string;
  avatar: string;
};

interface AuthContextType {
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  sendOtp: (
    phoneNumber: string,
    verifier?: FirebaseRecaptchaVerifierModal | null,
  ) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  setRecaptchaVerifier: (ref: FirebaseRecaptchaVerifierModal | null) => void;
  verificationId: string | null;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loginWithGoogle: async () => {},
  sendOtp: async () => {},
  verifyOtp: async () => {},
  setRecaptchaVerifier: () => {},
  verificationId: null,
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recaptchaVerifier, setRecaptchaVerifier] =
    useState<FirebaseRecaptchaVerifierModal | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);

  const googleClientIds = useMemo(
    () => ({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    }),
    [],
  );

  const redirectUri = useMemo(() => {
    if (Platform.OS === "web") {
      return `${SITE_URL}/`;
    }
    return makeRedirectUri({ path: "auth", scheme: "onlineclasses" });
  }, []);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientIds.webClientId,
    androidClientId: googleClientIds.androidClientId,
    redirectUri,
  });

  const handledGoogleToken = React.useRef<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      setUser({
        uid: fbUser.uid,
        name: fbUser.displayName || "Student",
        email:
          fbUser.email ||
          fbUser.phoneNumber ||
          "",
        avatar:
          fbUser.photoURL ||
          "https://ui-avatars.com/api/?name=" +
            encodeURIComponent(fbUser.displayName || "Student") +
            "&background=random",
      });
      clearGoogleCallbackUrl();
      setIsLoading(false);
    });

    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    const idToken =
      response?.type === "success" ? response.params?.id_token : undefined;
    if (!idToken || handledGoogleToken.current === idToken) return;
    handledGoogleToken.current = idToken;

    const run = async () => {
      setIsLoading(true);
      try {
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
        clearGoogleCallbackUrl();
      } catch {
        handledGoogleToken.current = null;
        setIsLoading(false);
      }
    };

    void run();
  }, [response]);

  const loginWithGoogle = async () => {
    if (!googleClientIds.webClientId && !googleClientIds.androidClientId) {
      throw new Error("Missing Google client IDs in env");
    }
    if (!request) {
      throw new Error("Google sign-in is not ready. Refresh the page and try again.");
    }

    setIsLoading(true);
    const result = await promptAsync();
    if (!result || result.type === "cancel" || result.type === "dismiss") {
      setIsLoading(false);
      return;
    }
    if (result.type === "error") {
      setIsLoading(false);
      throw new Error(result.error?.message || "Google sign-in failed");
    }
    // Firebase session is applied from the auth response effect.
    // Keep loading until onAuthStateChanged sets the user.
  };

  const sendOtp = async (
    phoneNumber: string,
    verifier?: FirebaseRecaptchaVerifierModal | null,
  ) => {
    const activeVerifier = verifier ?? recaptchaVerifier;
    if (!activeVerifier) {
      throw new Error("Recaptcha verifier not ready");
    }
    setIsLoading(true);
    try {
      const confirmation = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        activeVerifier as any,
      );
      setVerificationId(confirmation.verificationId);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (code: string) => {
    if (!verificationId) {
      throw new Error("Missing verificationId");
    }
    setIsLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      await signInWithCredential(auth, credential);
      setVerificationId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    void signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loginWithGoogle,
        sendOtp,
        verifyOtp,
        setRecaptchaVerifier,
        verificationId,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
