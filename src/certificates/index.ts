import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { BUNDLED_CERTIFICATES } from "./bundled";

/**
 * Add `{ENROLLMENT}.pdf` under assets/certificate/, then run:
 * node scripts/sync-certificate-registry.js
 */

export function normalizeEnrollmentNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isBundledEnrollment(enrollment: string): boolean {
  const key = normalizeEnrollmentNumber(enrollment);
  return key.length > 0 && key in BUNDLED_CERTIFICATES;
}

export async function findCertificateUri(
  enrollmentRaw: string,
): Promise<{ enrollment: string; uri: string } | null> {
  const enrollment = normalizeEnrollmentNumber(enrollmentRaw);
  if (!enrollment) return null;

  const bundled = BUNDLED_CERTIFICATES[enrollment];
  if (!bundled) return null;

  const asset = Asset.fromModule(bundled);
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;
  if (!uri) return null;
  return { enrollment, uri };
}

export async function downloadCertificate(
  enrollment: string,
  uri: string,
): Promise<void> {
  const fileName = `${enrollment}-certificate.pdf`;

  if (Platform.OS === "web" && typeof document !== "undefined") {
    const res = await fetch(uri);
    if (!res.ok) {
      throw new Error("Could not download certificate.");
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    return;
  }

  const dest = `${FileSystem.cacheDirectory}${fileName}`;
  if (uri.startsWith("file://") || uri.startsWith(FileSystem.cacheDirectory || "")) {
    if (uri !== dest) {
      await FileSystem.copyAsync({ from: uri, to: dest });
    }
  } else {
    await FileSystem.downloadAsync(uri, dest);
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest, {
      mimeType: "application/pdf",
      dialogTitle: "Download certificate",
      UTI: "com.adobe.pdf",
    });
  } else {
    throw new Error("Sharing is not available on this device.");
  }
}
