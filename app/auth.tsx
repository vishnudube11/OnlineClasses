import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export default function AuthCallbackScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && window.opener && window.opener !== window) {
      return;
    }
    if (isLoading) return;
    router.replace(user ? "/" : "/login");
  }, [isLoading, user, router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#cc0000" />
    </View>
  );
}
