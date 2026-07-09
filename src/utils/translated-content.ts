/**
 * Locale-aware content query layer.
 *
 * Loads build-time translated frontmatter (JSON) and pre-rendered
 * body HTML from src/content/translated/ using Vite's import.meta.glob.
 * This avoids runtime `fs` calls and works in Cloudflare Workers.
 *
 * When no translation is available (local dev without API key),
 * falls back gracefully to Chinese originals.
 */

interface FrontmatterTranslation {
  title: string;
  description: string;
}

type Translations = Record<string, FrontmatterTranslation>;

// ── Vite glob imports ────────────────────────────────────────────────
// These tell Vite to bundle all translated files at build time.
// At runtime, data is served from the bundle (no fs access needed).

const jsonModules = import.meta.glob<{ default: Translations }>(
  "../content/translated/*/*.json",
  { eager: false },
);

const htmlModules = import.meta.glob<string>(
  "../content/translated/*/*/*.html",
  { query: "?raw", eager: false },
);

// ── Helpers ───────────────────────────────────────────────────────────

function normalizeLocale(locale?: string): string {
  if (!locale) return "zh_CN";
  const lower = locale.toLowerCase();
  if (lower === "zh_cn" || lower === "zh-cn" || lower === "zh") return "zh_CN";
  if (lower === "zh_tw" || lower === "zh-tw") return "zh_TW";
  if (lower === "ja" || lower === "ja_jp" || lower === "ja-jp") return "ja";
  if (lower === "ko" || lower === "ko_kr" || lower === "ko-kr") return "ko";
  if (lower === "vi" || lower === "vi_vn" || lower === "vi-vn") return "vi";
  if (lower === "es" || lower === "es_es" || lower === "es-es") return "es";
  if (lower === "en" || lower === "en_us") return "en";
  return locale;
}

function isSourceLocale(locale: string): boolean {
  const normalized = normalizeLocale(locale);
  return normalized === "zh_CN";
}

// ── Translation loading ───────────────────────────────────────────────

export async function loadTranslations(
  locale: string,
  collection: string,
): Promise<Translations> {
  const normalized = normalizeLocale(locale);
  if (isSourceLocale(normalized)) return {};

  const key = `../content/translated/${normalized}/${collection}.json`;
  const loader = jsonModules[key];
  if (!loader) return {};

  try {
    const mod = await loader();
    return (mod as any).default || mod || {};
  } catch {
    return {};
  }
}

export async function getTranslatedBodyHtml(
  locale: string,
  collection: string,
  slug: string,
): Promise<string | null> {
  const normalized = normalizeLocale(locale);
  if (isSourceLocale(normalized)) return null;

  const key = `../content/translated/${normalized}/${collection}/${slug}.html`;
  const loader = htmlModules[key];
  if (!loader) return null;

  try {
    const mod = await loader();
    // ?raw query returns the content as a default export string
    if (typeof mod === "string") return mod;
    return (mod as any).default || "";
  } catch {
    return null;
  }
}

// ── Translated field helpers ──────────────────────────────────────────

export function translateField(
  translations: Translations,
  slug: string,
  field: "title" | "description",
  original: string,
): string {
  const t = translations[slug];
  if (!t) return original;

  if (field === "title" && t.title) return t.title;
  if (field === "description" && t.description !== undefined) return t.description;

  return original;
}
