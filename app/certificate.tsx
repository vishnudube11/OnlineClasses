import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
  downloadCertificate,
  findCertificateUri,
  normalizeEnrollmentNumber,
} from "@/src/certificates";
import AppTopBar from "@/src/components/AppTopBar";
import { pageTitle } from "@/src/seo/config";
import SeoHead from "@/src/seo/SeoHead";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CertificateScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [enrollment, setEnrollment] = useState("");
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<{
    enrollment: string;
    uri: string;
  } | null>(null);

  const onFind = async () => {
    setError("");
    setFound(null);
    const key = normalizeEnrollmentNumber(enrollment);
    if (!key) {
      setError("Enter your enrollment number.");
      return;
    }
    setChecking(true);
    try {
      const result = await findCertificateUri(key);
      if (!result) {
        setError("No certificate found for this enrollment number.");
        return;
      }
      setFound(result);
      setEnrollment(result.enrollment);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setChecking(false);
    }
  };

  const onDownload = async () => {
    if (!found) return;
    setDownloading(true);
    setError("");
    try {
      await downloadCertificate(found.enrollment, found.uri);
    } catch (e: any) {
      setError(e?.message || "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  const previewHeight = useMemo(() => {
    const pageWidth = Math.min(Math.max(280, width - 64), 640);
    return pageWidth * (297 / 210);
  }, [width]);

  const previewSrc = found
    ? `${found.uri.split("#")[0]}#view=FitH&toolbar=1`
    : "";

  const downloadButton = () => (
    <Pressable
      style={({ pressed }) => [
        styles.downloadBtn,
        pressed && styles.btnPressed,
        downloading && styles.btnDisabled,
      ]}
      onPress={onDownload}
      disabled={downloading}
    >
      {downloading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Ionicons name="download-outline" size={22} color="#fff" />
          <Text style={styles.primaryBtnText}>Download PDF</Text>
        </>
      )}
    </Pressable>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <SeoHead
        title={pageTitle("Download certificate")}
        description="Download your OnlineClasses course certificate using your enrollment number."
        path="/certificate"
        noIndex
      />
      <AppTopBar />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: found ? 96 + insets.bottom : 24 + insets.bottom,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
        </Pressable>

        <LinearGradient
          colors={["#4285F4", "#357ABD"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Ionicons name="ribbon" size={36} color="#fff" />
          <Text style={styles.heroTitle}>Download certificate</Text>
          <Text style={styles.heroSub}>
            Enter the enrollment number printed on your certificate file name.
          </Text>
        </LinearGradient>

        <Text style={[styles.label, { color: theme.text }]}>
          Enrollment number
        </Text>
        <TextInput
          value={enrollment}
          onChangeText={setEnrollment}
          placeholder="e.g. DCA20260101"
          placeholderTextColor={theme.tabIconDefault}
          autoCapitalize="characters"
          autoCorrect={false}
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: colorScheme === "dark" ? "#333" : "#ddd",
              backgroundColor: colorScheme === "dark" ? "#111" : "#fafafa",
            },
          ]}
          onSubmitEditing={onFind}
          returnKeyType="search"
        />

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.btnPressed,
            checking && styles.btnDisabled,
          ]}
          onPress={onFind}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Find certificate</Text>
            </>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {found !== null ? (
          <View
            style={[
              styles.previewCard,
              {
                borderColor: colorScheme === "dark" ? "#333" : "#e5e5e5",
                backgroundColor: colorScheme === "dark" ? "#111" : "#fff",
              },
            ]}
          >
            <View style={styles.previewHeader}>
              <Ionicons name="document-text" size={22} color="#4285F4" />
              <Text style={[styles.previewTitle, { color: theme.text }]}>
                Certificate ready — {found.enrollment}
              </Text>
            </View>

            {Platform.OS === "web" ? (
              <View
                style={[
                  styles.pdfFrameWrap,
                  { height: previewHeight, maxWidth: "100%" },
                ]}
              >
                {React.createElement("iframe", {
                  title: "Certificate preview",
                  src: previewSrc,
                  style: {
                    width: "100%",
                    height: "100%",
                    border: "none",
                    display: "block",
                  },
                })}
              </View>
            ) : (
              <Text
                style={[styles.nativeHint, { color: theme.tabIconDefault }]}
              >
                Preview is available on web. Tap download to save or share the
                PDF.
              </Text>
            )}

            {Platform.OS === "web" ? (
              <Pressable
                onPress={() => {
                  if (typeof window !== "undefined") {
                    window.open(found.uri, "_blank", "noopener");
                  }
                }}
                style={styles.openFullLink}
              >
                <Text style={styles.openFullLinkText}>
                  Open full certificate in new tab
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {found !== null ? (
        <View
          style={[
            styles.stickyFooter,
            {
              paddingBottom: insets.bottom + 12,
              borderTopColor: colorScheme === "dark" ? "#333" : "#e5e5e5",
              backgroundColor: theme.background,
            },
          ]}
        >
          {downloadButton()}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  backText: { fontSize: 16, fontWeight: "500" },
  hero: {
    borderRadius: 16,
    padding: 20,
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  heroSub: { color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "web" ? 12 : 10,
    fontSize: 16,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4285F4",
    borderRadius: 12,
    paddingVertical: 14,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2ecc71",
    borderRadius: 12,
    paddingVertical: 14,
    width: "100%",
  },
  stickyFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: "0 -4px 12px rgba(0,0,0,0.08)",
      },
      default: {
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
    }),
  },
  openFullLink: {
    marginTop: 10,
    alignItems: "center",
    paddingVertical: 8,
  },
  openFullLinkText: {
    color: "#4285F4",
    fontSize: 14,
    fontWeight: "600",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  btnPressed: { opacity: 0.85 },
  btnDisabled: { opacity: 0.6 },
  error: { color: "#e74c3c", fontSize: 14, marginTop: 4 },
  previewCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  previewTitle: { fontSize: 16, fontWeight: "600", flex: 1, flexShrink: 1 },
  pdfFrameWrap: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#eee",
    alignSelf: "center",
  },
  nativeHint: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
});
