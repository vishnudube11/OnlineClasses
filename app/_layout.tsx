import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { i18n, loadSavedLanguage } from "@/src/i18n";
import { DEFAULT_TITLE, SITE_NAME } from "@/src/seo/config";
import { I18nextProvider } from "react-i18next";

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function keepBrowserTitle() {
  if (typeof document === "undefined") return;
  const current = (document.title || "").trim();
  if (!current || current === "Untitled") {
    document.title = DEFAULT_TITLE;
  }
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [i18nInitialized, setI18nInitialized] = useState(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    const initializeApp = async () => {
      if (loaded) {
        await loadSavedLanguage();
        setI18nInitialized(true);
        SplashScreen.hideAsync();
      }
    };
    initializeApp();
  }, [loaded]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    keepBrowserTitle();
    const observer = new MutationObserver(keepBrowserTitle);
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, []);

  if (!loaded || !i18nInitialized) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <ProtectedLayout />
        </AuthProvider>
      </I18nextProvider>
    </ThemeProvider>
  );
}

function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "login";
    const isPublicPage =
      inAuthGroup || segments[0] === "(tabs)" || segments[0] === "course";

    if (!user && !isPublicPage) {
      router.replace("/login");
    } else if (user && inAuthGroup) {
      // Redirect away from the login page.
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        title: SITE_NAME,
        documentTitle: {
          enabled: true,
          formatter: (options: { title?: string } | undefined) =>
            options?.title?.trim() || DEFAULT_TITLE,
        },
      }}
    >
      <Stack.Screen
        name="login"
        options={{ headerShown: false, title: DEFAULT_TITLE }}
      />
      <Stack.Screen
        name="(tabs)"
        options={{ headerShown: false, title: DEFAULT_TITLE }}
      />
      <Stack.Screen
        name="course/[category]"
        options={{ headerShown: false, title: `Courses | ${SITE_NAME}` }}
      />
      <Stack.Screen
        name="video/[id]"
        options={{ headerShown: false, title: `Watch | ${SITE_NAME}` }}
      />
      <Stack.Screen
        name="pay/[category]"
        options={{ headerShown: false, title: `Checkout | ${SITE_NAME}` }}
      />
      <Stack.Screen name="modal" options={{ presentation: "modal", title: SITE_NAME }} />
    </Stack>
  );
}
