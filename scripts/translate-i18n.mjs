/**
 * Build-time AI translation script for UI i18n strings.
 *
 * Reads zh_CN.ts as the source of truth and uses DeepSeek API
 * (or Anthropic API as fallback) to translate UI keys into target languages.
 *
 * Caching: a JSON cache file (.i18n-cache.json) stores a hash of the
 * source values per locale. If unchanged, translation is skipped.
 *
 * Usage:
 *   DEEPSEEK_API_KEY=sk-xxx node scripts/translate-i18n.mjs
 *   DEEPSEEK_API_KEY=sk-xxx DEEPSEEK_MODEL=deepseek-chat node scripts/translate-i18n.mjs
 *
 * Or with Anthropic:
 *   ANTHROPIC_API_KEY=sk-ant-xxx node scripts/translate-i18n.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── Config ──────────────────────────────────────────────────────────
const SOURCE_LOCALE = "zh_CN";
const SOURCE_FILE = "src/i18n/languages/zh_CN.ts";
const CACHE_FILE = ".i18n-cache.json";
const LANGUAGES_DIR = "src/i18n/languages";

// Target languages: locale code -> language name for the AI prompt
const TARGETS = {
  en: "English",
  es: "Spanish",
  fr: "French",
};

// API provider detection: prefer DeepSeek, fall back to Anthropic
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

const USE_DEEPSEEK = !!DEEPSEEK_API_KEY;
const API_KEY = USE_DEEPSEEK ? DEEPSEEK_API_KEY : ANTHROPIC_API_KEY;
const MODEL = USE_DEEPSEEK ? DEEPSEEK_MODEL : ANTHROPIC_MODEL;

// ── Helpers ─────────────────────────────────────────────────────────

function hashContent(obj) {
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex").slice(0, 16);
}

function parseTranslationFile(content) {
  /** Parse a TypeScript translation file into { key: value } pairs */
  const result = {};
  // Match: [Key.someKey]: "some value",
  const re = /\[Key\.(\w+)\]:\s*"((?:[^"\\]|\\.)*)"/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}

function formatTranslationFile(locale, translations) {
  /** Generate a TypeScript translation file */
  const lines = [];
  lines.push(`import Key from "../i18nKey";`);
  lines.push(`import type { Translation } from "../translation";`);
  lines.push(``);

  // Handle locale names that start with lowercase or have underscores
  const varName = locale.startsWith("zh_") ? locale : locale;
  lines.push(`export const ${varName}: Translation = {`);

  // Group keys by category for readability
  const groups = [
    { keys: ["home", "about", "archive", "search"] },
    { keys: ["tags", "categories", "recentPosts"] },
    { keys: ["comments"] },
    { keys: ["untitled", "uncategorized", "noTags"] },
    { keys: ["wordCount", "wordsCount", "minuteCount", "minutesCount", "postCount", "postsCount"] },
    { keys: ["themeColor"] },
    { keys: ["lightMode", "darkMode", "systemMode"] },
    { keys: ["more"] },
    { keys: ["author", "publishedAt", "license"] },
    { keys: ["langEn", "langZhCN", "langZhTW", "langJa", "langKo", "langVi", "langEs"] },
  ];

  for (let gi = 0; gi < groups.length; gi++) {
    if (gi > 0 && groups[gi - 1].keys.length > 0) lines.push(``);
    for (const key of groups[gi].keys) {
      const value = translations[key] || key;
      // Escape double quotes and backslashes
      const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      lines.push(`\t[Key.${key}]: "${escaped}",`);
    }
  }

  lines.push(`};`);
  lines.push(``); // trailing newline
  return lines.join("\n");
}

async function translateBatch(keysAndValues, targetLang, targetName) {
  /**
   * Call DeepSeek or Anthropic API to translate a batch of UI strings.
   * Returns { key: translated_value }.
   */
  const entries = Object.entries(keysAndValues);
  const sourceText = entries
    .map(([k, v]) => `${k}: "${v}"`)
    .join("\n");

  const prompt = `You are translating UI strings for a blog website from Simplified Chinese (zh_CN) to ${targetName} (${targetLang}).

Translate each key's value naturally and concisely for a blog UI context. Preserve the exact same keys. Return ONLY valid JSON like:
{
  "home": "translated",
  "about": "translated",
  ...
}

Here are the strings to translate:
${sourceText}

Important rules:
- For "zh_TW" (Traditional Chinese): use Taiwan-specific terminology, not direct character conversion
- Keep translations short - these are UI labels, nav items, and metadata tags
- "wordCount"/"wordsCount" should be the unit for word count (Chinese "字" might become "characters" or a locale-appropriate word)
- "postCount"/"postsCount" translates to "article" or the locale equivalent (not "post" like mail)
- For the "lang*" keys: these are language names displayed in the language switcher. Translate them appropriately.
- Return ONLY the JSON object, no other text.`;

  let responseText;

  if (USE_DEEPSEEK) {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    responseText = data.choices[0].message.content;
  } else {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    responseText = data.content[0].text;
  }

  // Extract JSON from the response (handle possible markdown wrapping)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Could not parse JSON from response: ${responseText.slice(0, 200)}`);
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`JSON parse error: ${e.message}\nContent: ${jsonMatch[0].slice(0, 300)}`);
  }
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.warn("⚠️  No API key set. Skipping AI translation.");
    console.warn("   Set DEEPSEEK_API_KEY or ANTHROPIC_API_KEY to enable build-time translation.");
    console.warn("   Using existing language files as-is.");
    return;
  }

  console.log(`🤖 Using ${USE_DEEPSEEK ? "DeepSeek" : "Anthropic"} API (model: ${MODEL})`);

  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const sourcePath = resolve(root, SOURCE_FILE);
  const cachePath = resolve(root, CACHE_FILE);
  const langDir = resolve(root, LANGUAGES_DIR);

  // Read and parse source
  console.log(`📖 Reading source: ${SOURCE_LOCALE}`);
  const sourceContent = await readFile(sourcePath, "utf-8");
  const sourceTranslations = parseTranslationFile(sourceContent);
  const sourceHash = hashContent(sourceTranslations);
  console.log(`   ${Object.keys(sourceTranslations).length} keys, hash: ${sourceHash}`);

  // Load cache
  let cache = {};
  if (existsSync(cachePath)) {
    cache = JSON.parse(await readFile(cachePath, "utf-8"));
  }

  let totalTranslated = 0;
  let totalSkipped = 0;

  for (const [locale, langName] of Object.entries(TARGETS)) {
    const cached = cache[locale];

    // Skip if source unchanged
    if (cached && cached.sourceHash === sourceHash) {
      console.log(`⏭️  ${locale} (${langName}): cached, skipping`);
      totalSkipped++;
      continue;
    }

    console.log(`🤖 Translating ${locale} (${langName})...`);
    try {
      const translated = await translateBatch(sourceTranslations, locale, langName);

      // Verify all keys present
      const missing = Object.keys(sourceTranslations).filter((k) => !(k in translated));
      if (missing.length > 0) {
        console.warn(`   ⚠️  Missing keys: ${missing.join(", ")}`);
        // Fill missing with source values
        for (const k of missing) {
          translated[k] = sourceTranslations[k];
        }
      }

      // Write file
      const fileContent = formatTranslationFile(locale, translated);
      const filePath = resolve(langDir, `${locale}.ts`);
      await writeFile(filePath, fileContent, "utf-8");
      console.log(`   ✅ Wrote ${filePath} (${Object.keys(translated).length} keys)`);

      // Update cache
      cache[locale] = { sourceHash, translated };
      totalTranslated++;
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`);
      // If we have a cached version, keep it
      if (cached) {
        console.log(`   ⚠️  Keeping cached version for ${locale}`);
      }
    }
  }

  // Save cache
  await writeFile(cachePath, JSON.stringify(cache, null, 2), "utf-8");
  console.log(`\n📦 Cache saved to ${CACHE_FILE}`);

  // Summary
  console.log(`\n✨ Done! ${totalTranslated} translated, ${totalSkipped} cached.`);
  if (totalTranslated > 0) {
    const remaining = Object.keys(TARGETS).length - totalTranslated - totalSkipped;
    if (remaining > 0) {
      console.log(`   ${remaining} failed.`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
