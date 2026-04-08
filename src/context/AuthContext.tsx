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

WebBrowser.maybeCompleteAuthSession();

type User = {
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

  const redirectUri = useMemo(() => makeRedirectUri({ path: "auth" }), []);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientIds.webClientId,
    androidClientId: googleClientIds.androidClientId,
    redirectUri,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      setUser({
        name: fbUser.displayName || "Student",
        email: fbUser.email || "",
        avatar:
          fbUser.photoURL ||
          "https://ui-avatars.com/api/?name=" +
            encodeURIComponent(fbUser.displayName || "Student") +
            "&background=random",
      });
      setIsLoading(false);
    });

    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    const idToken =
      response?.type === "success" ? response.params?.id_token : undefined;
    if (!idToken) return;

    const run = async () => {
      setIsLoading(true);
      try {
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [response]);

  const loginWithGoogle = async () => {
    if (!googleClientIds.webClientId && !googleClientIds.androidClientId) {
      throw new Error("Missing Google client IDs in env");
    }
    if (!request) {
      throw new Error("Google auth request not ready");
    }
    await promptAsync();
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
