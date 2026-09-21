import { auth } from "@/src/firebase";
import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import type { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  PhoneAuthProvider,
  signInWithCredential,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
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
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

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

function mapFirebaseUser(fbUser: FirebaseUser): User {
  return {
    uid: fbUser.uid,
    name: fbUser.displayName || "Student",
    email: fbUser.email || fbUser.phoneNumber || "",
    avatar:
      fbUser.photoURL ||
      "https://ui-avatars.com/api/?name=" +
        encodeURIComponent(fbUser.displayName || "Student") +
        "&background=random",
  };
}

function useFirebaseSession() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recaptchaVerifier, setRecaptchaVerifier] =
    useState<FirebaseRecaptchaVerifierModal | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      setUser(fbUser ? mapFirebaseUser(fbUser) : null);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    void getRedirectResult(auth).catch(() => {});
  }, []);

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

  return {
    user,
    isLoading,
    setIsLoading,
    recaptchaVerifier,
    setRecaptchaVerifier,
    verificationId,
    sendOtp,
    verifyOtp,
    logout,
  };
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

const WebAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const session = useFirebaseSession();

  const loginWithGoogle = async () => {
    session.setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider());
    } catch (error: any) {
      const code = String(error?.code || "");
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return;
      }
      if (code === "auth/popup-blocked") {
        await signInWithRedirect(auth, googleProvider());
        return;
      }
      throw error;
    } finally {
      if (auth.currentUser) {
        session.setIsLoading(false);
      } else {
        session.setIsLoading(false);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: session.user,
        loginWithGoogle,
        sendOtp: session.sendOtp,
        verifyOtp: session.verifyOtp,
        setRecaptchaVerifier: session.setRecaptchaVerifier,
        verificationId: session.verificationId,
        logout: session.logout,
        isLoading: session.isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const NativeAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const session = useFirebaseSession();
  const handledGoogleToken = React.useRef<string | null>(null);

  const googleClientIds = useMemo(
    () => ({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    }),
    [],
  );

  const redirectUri = useMemo(
    () => makeRedirectUri({ path: "auth", scheme: "onlineclasses" }),
    [],
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientIds.webClientId,
    androidClientId: googleClientIds.androidClientId,
    redirectUri,
  });

  const {
    user,
    isLoading,
    setIsLoading,
    setRecaptchaVerifier,
    verificationId,
    sendOtp,
    verifyOtp,
    logout,
  } = session;

  useEffect(() => {
    const idToken =
      response?.type === "success" ? response.params?.id_token : undefined;
    if (!idToken || handledGoogleToken.current === idToken) return;
    handledGoogleToken.current = idToken;

    const run = async () => {
      setIsLoading(true);
      try {
        await signInWithCredential(
          auth,
          GoogleAuthProvider.credential(idToken),
        );
      } catch {
        handledGoogleToken.current = null;
        setIsLoading(false);
      }
    };

    void run();
  }, [response, setIsLoading]);

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  if (Platform.OS === "web") {
    return <WebAuthProvider>{children}</WebAuthProvider>;
  }
  return <NativeAuthProvider>{children}</NativeAuthProvider>;
};
