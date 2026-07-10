/**
 * Build-time AI translation script for blog post content.
 *
 * Reads Chinese markdown posts from src/content/posts/ and translates
 * title, description, and body to target languages via DeepSeek API
 * (or Anthropic API as fallback).
 *
 * Output:
 *   src/content/translated/{locale}/posts.json          frontmatter map
 *   src/content/translated/{locale}/posts/{slug}.html   pre-rendered body
 *
 * Caching: .i18n-posts-cache.json stores a hash of the source per file.
 * If unchanged, translation is skipped.
 *
 * Usage:
 *   DEEPSEEK_API_KEY=sk-xxx node scripts/translate-posts.mjs
 *   ANTHROPIC_API_KEY=sk-ant-xxx node scripts/translate-posts.mjs
 */

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";

// ── Config ──────────────────────────────────────────────────────────
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_DIR = resolve(ROOT, "src", "content", "posts");
const READ_DIR = resolve(ROOT, "src", "content", "read");
const TECHNOLOGY_DIR = resolve(ROOT, "src", "content", "technology");
const TRANSLATED_DIR = resolve(ROOT, "src", "content", "translated");
const CACHE_FILE = resolve(ROOT, ".i18n-posts-cache.json");

const SOURCE_LOCALE = "zh_CN";

// Target languages: locale code -> language name for the AI prompt
const TARGETS = {
  en: "English",
  es: "Spanish",
};

// API provider detection: prefer DeepSeek, fall back to Anthropic
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

const USE_DEEPSEEK = !!DEEPSEEK_API_KEY;
const API_KEY = USE_DEEPSEEK ? DEEPSEEK_API_KEY : ANTHROPIC_API_KEY;
const MODEL = USE_DEEPSEEK ? DEEPSEEK_MODEL : ANTHROPIC_MODEL;

// Collections to translate (only ones with .md files)
const COLLECTIONS = [
  { dir: POSTS_DIR, name: "posts" },
  { dir: READ_DIR, name: "read" },
  { dir: TECHNOLOGY_DIR, name: "technology" },
];

// ── Markdown-it setup (simple, no plugins) ──────────────────────────
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
});

// ── Helpers ─────────────────────────────────────────────────────────

function hashContent(str) {
  return createHash("sha256").update(str).digest("hex").slice(0, 16);
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: content };
  const lines = match[1].split("\n");
  const fm = {};
  let currentKey = null;

  for (const line of lines) {
    // Array items (tags, etc.)
    const arrayMatch = line.match(/^\s*-\s+(.+)/);
    if (arrayMatch && currentKey) {
      const val = arrayMatch[1].replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").trim();
      if (!fm[currentKey]) fm[currentKey] = [];
      fm[currentKey].push(val);
      continue;
    }

    // Key: value pairs
    const keyMatch = line.match(/^(\w+):\s*(.*)/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      let val = keyMatch[2].trim();
      val = val.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      // Skip empty strings
      if (val === "" || val === "''" || val === '""') {
        fm[currentKey] = "";
        continue;
      }
      fm[currentKey] = val;
    }
  }

  const body = content.slice(match[0].length).trim();
  return { frontmatter: fm, body };
}

function extractTextBlocks(body) {
  /**
   * Extract translatable text blocks while preserving protected blocks.
   * Protected blocks: code fences, inline code, admonitions, mermaid, katex,
   * image links, HTML tags, URLs, frontmatter-style metadata.
   */
  const PROTECTED = [];

  // 1. Code fences (``` ... ```)
  let processed = body.replace(/```[\s\S]*?```/g, (match) => {
    PROTECTED.push(match);
    return `\x00PROTECTED${PROTECTED.length - 1}\x00`;
  });

  // 2. Admonition blocks (:::type ... :::)
  processed = processed.replace(/^:::\w+[\s\S]*?^:::$/gm, (match) => {
    PROTECTED.push(match);
    return `\x00PROTECTED${PROTECTED.length - 1}\x00`;
  });

  // 3. Inline code (`...`)
  processed = processed.replace(/`[^`]+`/g, (match) => {
    PROTECTED.push(match);
    return `\x00PROTECTED${PROTECTED.length - 1}\x00`;
  });

  // 4. KaTeX blocks ($$...$$)
  processed = processed.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
    PROTECTED.push(match);
    return `\x00PROTECTED${PROTECTED.length - 1}\x00`;
  });

  // 5. Inline KaTeX ($...$)
  processed = processed.replace(/\$[^$\n]+?\$/g, (match) => {
    PROTECTED.push(match);
    return `\x00PROTECTED${PROTECTED.length - 1}\x00`;
  });

  // 6. Mermaid blocks
  processed = processed.replace(/```mermaid[\s\S]*?```/g, (match) => {
    // Already covered by code fences above, but belt-and-suspenders
    return match;
  });

  // 7. Image syntax ![alt](url)
  processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match) => {
    PROTECTED.push(match);
    return `\x00PROTECTED${PROTECTED.length - 1}\x00`;
  });

  // 8. HTML tags
  processed = processed.replace(/<[^>]+>/g, (match) => {
    PROTECTED.push(match);
    return `\x00PROTECTED${PROTECTED.length - 1}\x00`;
  });

  // 9. Markdown links [text](url)
  processed = processed.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match) => {
    PROTECTED.push(match);
    return `\x00PROTECTED${PROTECTED.length - 1}\x00`;
  });

  // 10. Markdown images with obsidian/relative paths
  processed = processed.replace(/!\[\[([^\]]+)\]\]/g, (match) => {
    PROTECTED.push(match);
    return `\x00PROTECTED${PROTECTED.length - 1}\x00`;
  });

  return { text: processed, protected: PROTECTED };
}

function restoreProtected(text, protectedBlocks) {
  return text.replace(/\x00PROTECTED(\d+)\x00/g, (_, i) => {
    const idx = parseInt(i, 10);
    return protectedBlocks[idx] || `\x00PROTECTED${i}\x00`;
  });
}

async function translateFrontmatter(title, description, targetLang, targetName) {
  /** Translate title and description. Returns { title, description }. */

  // Skip empty descriptions
  const hasDesc = description && description.trim().length > 0;

  const prompt = `Translate the following blog post metadata from Simplified Chinese to ${targetName} (${targetLang}).

Blog post title:
"${title}"
${hasDesc ? `\nBlog post description:\n"${description}"` : ""}

Rules:
- Translate naturally and concisely for a tech blog audience
${hasDesc ? '- The description should be a brief, engaging summary (1-2 sentences)' : ''}
- Preserve any code terms, product names, and technical jargon (React, Vue, Astro, etc.)
- For zh_TW (Traditional Chinese): use Taiwan-specific terminology

Return ONLY valid JSON:
{
  "title": "translated title"${hasDesc ? ',\n  "description": "translated description"' : ''}
}`;

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
        max_tokens: 1024,
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
        max_tokens: 1024,
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

  // Extract JSON from response
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

async function translateBody(body, targetLang, targetName) {
  /** Translate markdown body. Returns translated markdown string. */

  const { text, protected: protectedBlocks } = extractTextBlocks(body);

  const prompt = `Translate the following blog post content from Simplified Chinese to ${targetName} (${targetLang}).

The content is in Markdown format. Some parts have been replaced with \x00PROTECTED{N}\x00 markers — DO NOT translate or modify these markers. They must appear exactly as-is in your translation.

Rules:
- Translate ONLY natural language text
- DO NOT translate code comments, variable names, or technical identifiers
- Preserve all Markdown formatting (headings, lists, bold, italic, tables, etc.)
- Keep all \x00PROTECTED{N}\x00 markers exactly as they appear
- For zh_TW (Traditional Chinese): use Taiwan-specific terminology
- For technical terms: prefer widely-understood terms in ${targetName}
- Maintain the original tone and style of a tech blog
- Keep line breaks and paragraph structure similar

Here is the content to translate:

${text}

Return ONLY the translated content with all \x00PROTECTED{N}\x00 markers preserved.`;

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
        max_tokens: 16384,
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
        max_tokens: 16384,
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

  // Restore protected blocks
  return restoreProtected(responseText, protectedBlocks);
}

// ── Main Translation Logic ──────────────────────────────────────────

async function translateCollection(collectionDir, collectionName, cache) {
  if (!existsSync(collectionDir)) {
    console.log(`  ⏭️  ${collectionName}: directory not found, skipping`);
    return 0;
  }

  const files = await readdir(collectionDir);
  const mdFiles = files.filter((f) => f.endsWith(".md") && !f.startsWith("."));

  if (mdFiles.length === 0) {
    console.log(`  ⏭️  ${collectionName}: no .md files found`);
    return 0;
  }

  let count = 0;

  for (const file of mdFiles) {
    const slug = basename(file, ".md");
    const filePath = resolve(collectionDir, file);
    const content = await readFile(filePath, "utf-8");
    const sourceHash = hashContent(content);
    const cacheKey = `${collectionName}/${slug}`;

    const { frontmatter, body } = parseFrontmatter(content);
    const title = frontmatter.title || slug;
    const description = frontmatter.description || "";

    for (const [locale, langName] of Object.entries(TARGETS)) {
      const cached = cache[locale]?.[cacheKey];

      // Skip if source unchanged
      if (cached && cached.sourceHash === sourceHash) {
        console.log(`  ⏭️  [${locale}] ${slug}: cached, skipping`);
        continue;
      }

      console.log(`  🤖 [${locale}] Translating ${slug} (${langName})...`);

      try {
        // Translate frontmatter
        const translatedFm = await translateFrontmatter(title, description, locale, langName);

        // Translate body
        let translatedBodyMarkdown = body;
        if (body.length > 0) {
          translatedBodyMarkdown = await translateBody(body, locale, langName);
        }

        // Render to HTML
        const html = md.render(translatedBodyMarkdown);

        // Write frontmatter JSON
        const jsonDir = resolve(TRANSLATED_DIR, locale);
        await mkdir(jsonDir, { recursive: true });
        const jsonPath = resolve(jsonDir, `${collectionName}.json`);

        // Load existing translations for this locale/collection
        let existingFm = {};
        if (existsSync(jsonPath)) {
          existingFm = JSON.parse(await readFile(jsonPath, "utf-8"));
        }
        existingFm[slug] = {
          title: translatedFm.title || title,
          description: translatedFm.description !== undefined ? translatedFm.description : description,
        };
        await writeFile(jsonPath, JSON.stringify(existingFm, null, 2), "utf-8");

        // Write HTML body
        const htmlDir = resolve(TRANSLATED_DIR, locale, collectionName);
        await mkdir(htmlDir, { recursive: true });
        const htmlPath = resolve(htmlDir, `${slug}.html`);
        await writeFile(htmlPath, html, "utf-8");

        // Update cache
        if (!cache[locale]) cache[locale] = {};
        cache[locale][cacheKey] = { sourceHash };
        count++;

        console.log(`    ✅ Done`);
      } catch (err) {
        console.error(`    ❌ Failed: ${err.message}`);
        // Keep cached version if available
        if (cached) {
          console.log(`    ⚠️  Keeping cached version for ${locale}/${slug}`);
        }
      }
    }
  }

  return count;
}

// ── Entry Point ─────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.warn("⚠️  No API key set. Skipping AI post translation.");
    console.warn("   Set DEEPSEEK_API_KEY or ANTHROPIC_API_KEY to enable build-time translation.");
    console.warn("   Using existing translations as-is.");
    return;
  }

  console.log(`🤖 Using ${USE_DEEPSEEK ? "DeepSeek" : "Anthropic"} API (model: ${MODEL})`);
  console.log(`📂 Source locale: ${SOURCE_LOCALE}\n`);

  // Load cache
  let cache = {};
  if (existsSync(CACHE_FILE)) {
    cache = JSON.parse(await readFile(CACHE_FILE, "utf-8"));
    const cachedLocales = Object.keys(cache).filter((l) => l !== "_meta");
    const cachedPosts = Object.values(cache).reduce((sum, l) => sum + Object.keys(l).length, 0);
    console.log(`📦 Cache loaded: ${cachedPosts} entries across ${cachedLocales.length} locales\n`);
  }

  let totalTranslated = 0;

  for (const collection of COLLECTIONS) {
    console.log(`📁 Translating collection: ${collection.name}`);
    const count = await translateCollection(collection.dir, collection.name, cache);
    totalTranslated += count;
    console.log(`   ${count} files translated\n`);
  }

  // Save cache
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
  console.log(`📦 Cache saved to ${CACHE_FILE}`);

  // Generate combined titles JSON for client-side listing page translation
  await generateTitlesJson();
  console.log("📦 Titles JSON written to public/translated-titles.json");

  // Summary
  const totalCached = Object.values(cache).reduce((sum, l) => sum + Object.keys(l).length, 0);
  console.log(`\n✨ Done! ${totalTranslated} translated, ${totalCached - totalTranslated} cached.`);
}

// ── Titles JSON Generator ───────────────────────────────────────────
// Combines all translated frontmatter into a single JSON file
// for client-side title swapping on static listing pages.

async function generateTitlesJson() {
  const output = {};

  for (const locale of Object.keys(TARGETS)) {
    for (const collection of COLLECTIONS) {
      const jsonPath = resolve(TRANSLATED_DIR, locale, `${collection.name}.json`);
      if (!existsSync(jsonPath)) continue;

      const data = JSON.parse(await readFile(jsonPath, "utf-8"));
      if (!output[collection.name]) output[collection.name] = {};
      if (!output[collection.name][locale]) output[collection.name][locale] = {};

      output[collection.name][locale] = data;
    }
  }

  // Also include the UI-only languages (zh_TW, ja) with empty data
  // so the language switcher doesn't break on listing pages
  const publicDir = resolve(ROOT, "public");
  await mkdir(publicDir, { recursive: true });
  await writeFile(
    resolve(publicDir, "translated-titles.json"),
    JSON.stringify(output),
    "utf-8",
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
