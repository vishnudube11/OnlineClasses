import { auth } from "@/src/firebase";
import { logger } from "@/src/utils/logger";
import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
    GoogleAuthProvider,
    onAuthStateChanged,
    PhoneAuthProvider,
    signInWithCredential,
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
  sendOtp: (phoneNumber: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  verificationId: string | null;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loginWithGoogle: async () => {},
  sendOtp: async () => {},
  verifyOtp: async () => {},
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
        logger.auth("User signed out");
        setUser(null);
        setIsLoading(false);
        return;
      }
      const userData = {
        name: fbUser.displayName || "Student",
        email: fbUser.email || "",
        avatar:
          fbUser.photoURL ||
          "https://ui-avatars.com/api/?name=" +
            encodeURIComponent(fbUser.displayName || "Student") +
            "&background=random",
      };
      logger.auth("User signed in", {
        email: userData.email,
        name: userData.name,
      });
      setUser(userData);
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
        logger.auth(
          "Google auth response received, signing in with credential",
        );
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
        logger.auth("Google sign in successful");
      } catch (error) {
        logger.error("Google sign in failed", error, {
          action: "google_signin",
        });
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [response]);

  const loginWithGoogle = async () => {
    logger.auth("Google login initiated");
    if (!googleClientIds.webClientId && !googleClientIds.androidClientId) {
      logger.error("Missing Google client IDs", null, {
        action: "google_login_init",
      });
      throw new Error("Missing Google client IDs in env");
    }
    if (!request) {
      logger.error("Google auth request not ready", null, {
        action: "google_login_init",
      });
      throw new Error("Google auth request not ready");
    }
    await promptAsync();
  };

  const sendOtp = async (phoneNumber: string) => {
    logger.auth("OTP send initiated", { phoneNumber });
    setIsLoading(true);
    try {
      const provider = new PhoneAuthProvider(auth);
      const vid = await provider.verifyPhoneNumber(phoneNumber, null as any);
      setVerificationId(vid);
      logger.auth("OTP sent successfully", { phoneNumber });
    } catch (error) {
      logger.error("OTP send failed", error, {
        phoneNumber,
        action: "send_otp",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (code: string) => {
    logger.auth("OTP verification initiated", {
      hasVerificationId: !!verificationId,
    });
    if (!verificationId) {
      logger.error("Missing verificationId", null, { action: "verify_otp" });
      throw new Error("Missing verificationId");
    }
    setIsLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      await signInWithCredential(auth, credential);
      setVerificationId(null);
      logger.auth("OTP verification successful");
    } catch (error) {
      logger.error("OTP verification failed", error, { action: "verify_otp" });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    logger.auth("Logout initiated");
    void signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loginWithGoogle,
        sendOtp,
        verifyOtp,
        verificationId,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
