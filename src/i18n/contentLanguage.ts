import supportedLanguages from "./supportedLanguages.json";

export type ContentLanguageConfig = {
  code: string;
  relevanceLanguage: string;
  regionCode: string;
  queryPhrase: string;
};

export type SupportedLanguage = {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  relevanceLanguage: string;
  regionCode: string;
  queryPhrase: string;
  keywords: string[];
  scriptStart: string;
  scriptEnd: string;
};

export const SUPPORTED_LANGUAGES = supportedLanguages as SupportedLanguage[];

const CONFIG: Record<string, ContentLanguageConfig> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((language) => [
    language.code,
    {
      code: language.code,
      relevanceLanguage: language.relevanceLanguage,
      regionCode: language.regionCode,
      queryPhrase: language.queryPhrase,
    },
  ]),
);

export const normalizeAppLanguage = (language?: string) =>
  String(language || "en")
    .trim()
    .toLowerCase()
    .split("-")[0] || "en";

export const getContentLanguage = (
  language?: string,
): ContentLanguageConfig => {
  const code = normalizeAppLanguage(language);
  return CONFIG[code] || CONFIG.en;
};

export const withContentLanguage = (
  query: string,
  language?: string,
): string => {
  const { queryPhrase } = getContentLanguage(language);
  const q = String(query || "").trim();
  if (!queryPhrase) return q;
  if (!q) return queryPhrase;
  if (q.toLowerCase().includes(queryPhrase.toLowerCase())) return q;
  return `${q} ${queryPhrase}`;
};
