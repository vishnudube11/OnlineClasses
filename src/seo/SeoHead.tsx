import Head from "expo-router/head";
import { useEffect } from "react";
import { Platform } from "react-native";

import {
  DEFAULT_TITLE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_URL,
} from "@/src/seo/config";

type SeoHeadProps = {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string;
  noIndex?: boolean;
};

export default function SeoHead({
  title = DEFAULT_TITLE,
  description = SITE_DESCRIPTION,
  path = "/",
  keywords = SITE_KEYWORDS,
  noIndex = false,
}: SeoHeadProps) {
  const url = SITE_URL
    ? `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
    : undefined;

  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.title = title;
    }
  }, [title]);

  return (
    <Head>
      <meta name="description" content={description} />
      {noIndex ? <meta name="robots" content="noindex, follow" /> : null}
      <meta name="keywords" content={keywords} />
      <meta name="application-name" content={SITE_NAME} />
      {url ? <link rel="canonical" href={url} /> : null}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {url ? <meta property="og:url" content={url} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Head>
  );
}
