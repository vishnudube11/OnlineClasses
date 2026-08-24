import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";

import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { i18n, loadSavedLanguage } from "@/src/i18n";
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

    if (!user && !inAuthGroup) {
      // Redirect to the login page.
      router.replace("/login");
    } else if (user && inAuthGroup) {
      // Redirect away from the login page.
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}
