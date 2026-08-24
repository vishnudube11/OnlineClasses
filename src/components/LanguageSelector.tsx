import { changeLanguage, getCurrentLanguage } from "@/src/i18n/index";
import { SUPPORTED_LANGUAGES } from "@/src/i18n/contentLanguage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
  onLanguageChange?: (language: string) => void;
}

export default function LanguageSelector({
  visible,
  onClose,
  onLanguageChange,
}: LanguageSelectorProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState(
    () => getCurrentLanguage().split("-")[0],
  );

  useEffect(() => {
    if (visible) {
      setSelectedLanguage(getCurrentLanguage().split("-")[0]);
      setQuery("");
    }
  }, [visible]);

  const filteredLanguages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter((language) => {
      return (
        language.name.toLowerCase().includes(q) ||
        language.nativeName.toLowerCase().includes(q) ||
        language.code.toLowerCase().includes(q)
      );
    });
  }, [query]);

  const handleLanguageSelect = async (languageCode: string) => {
    setSelectedLanguage(languageCode);
    await changeLanguage(languageCode);
    onLanguageChange?.(languageCode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("common.selectLanguage")}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#888" />
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#888" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("common.searchLanguage")}
              placeholderTextColor="#999"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <ScrollView style={styles.languageList}>
            {filteredLanguages.map((language) => (
              <Pressable
                key={language.code}
                style={({ pressed }) => [
                  styles.languageItem,
                  pressed && styles.languageItemPressed,
                  selectedLanguage === language.code &&
                    styles.languageItemSelected,
                ]}
                onPress={() => handleLanguageSelect(language.code)}
              >
                <Text style={styles.flag}>{language.flag}</Text>
                <View style={styles.languageInfo}>
                  <Text style={styles.languageName}>{language.name}</Text>
                  <Text style={styles.nativeName}>{language.nativeName}</Text>
                </View>
                {selectedLanguage === language.code && (
                  <LinearGradient
                    colors={["#ff6b6b", "#ee5a5a"]}
                    style={styles.checkmark}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </LinearGradient>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    paddingVertical: 4,
  },
  languageList: {
    flexGrow: 0,
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 16,
  },
  languageItemPressed: {
    backgroundColor: "#f5f5f5",
  },
  languageItemSelected: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
  },
  flag: {
    fontSize: 32,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  nativeName: {
    fontSize: 14,
    color: "#888",
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
