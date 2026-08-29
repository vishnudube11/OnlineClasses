export const SITE_NAME = "OnlineClasses";

export const SITE_URL = (
  process.env.EXPO_PUBLIC_WEB_URL || "https://www.online-classes.in"
).replace(/\/$/, "");

export const SITE_DESCRIPTION =
  "OnlineClasses is a video learning app for Java, Python, AI, machine learning, and more — with tutorials in English, Hindi, Tamil, Telugu, and other languages.";

export const SITE_KEYWORDS = [
  "OnlineClasses",
  "online classes India",
  "Java tutorial in Hindi",
  "Python course online",
  "AI tutorial",
  "machine learning course",
  "learn programming in Tamil",
  "Telugu coding tutorials",
  "video courses",
  "OnlineClasses app",
].join(", ");

export const DEFAULT_TITLE =
  "OnlineClasses | Learn Java, AI & Programming in Your Language";

export const pageTitle = (page: string) => `${page} | ${SITE_NAME}`;
