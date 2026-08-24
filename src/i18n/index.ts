import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { uiResources } from "./uiStrings";

const LANGUAGE_KEY = "@app_language";

const initPromise = i18n.use(initReactI18next).init({
  resources: uiResources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

const loadSavedLanguage = async () => {
  await initPromise;
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && savedLanguage !== i18n.language) {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.error("Failed to load saved language:", error);
  }
};

const changeLanguage = async (language: string) => {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
};

const getCurrentLanguage = () => i18n.language;

export { changeLanguage, getCurrentLanguage, i18n, loadSavedLanguage };
export default loadSavedLanguage;
