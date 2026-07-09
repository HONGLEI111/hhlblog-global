/**
 * Generate a search index JSON for Fuse.js client-side search.
 *
 * Reads all markdown content files, extracts title/description/tags,
 * and writes a search-index.json to the public/ directory.
 *
 * Usage: node scripts/generate-search-index.mjs
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CONTENT_DIRS = ["posts", "technology", "read", "tools"];
const OUTPUT_FILE = resolve(ROOT, "public", "search-index.json");

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter = {};
  const lines = match[1].split("\n");
  let currentKey = null;

  for (const line of lines) {
    // Array items (tags, etc.)
    const arrayMatch = line.match(/^\s*-\s+(.+)/);
    if (arrayMatch && currentKey) {
      const val = arrayMatch[1].replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").trim();
      if (!frontmatter[currentKey]) frontmatter[currentKey] = [];
      frontmatter[currentKey].push(val);
      continue;
    }

    // Key: value pairs
    const keyMatch = line.match(/^(\w+):\s*(.+)/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      let val = keyMatch[2].trim();
      // Remove quotes
      val = val.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      frontmatter[currentKey] = val;
    }
  }

  return frontmatter;
}

function getUrlFromPath(contentDir, filePath) {
  const fileName = basename(filePath, ".md");
  return `/${contentDir}/${fileName}/`.replace(/\/+/g, "/");
}

async function main() {
  console.log("🔍 Generating search index...");
  const index = [];

  for (const contentDir of CONTENT_DIRS) {
    const dirPath = resolve(ROOT, "src", "content", contentDir);
    if (!existsSync(dirPath)) {
      console.log(`  ⏭️  Skipping ${contentDir} (not found)`);
      continue;
    }

    const files = await readdir(dirPath);
    const mdFiles = files.filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));

    for (const file of mdFiles) {
      const filePath = resolve(dirPath, file);
      try {
        const content = await readFile(filePath, "utf-8");
        const fm = parseFrontmatter(content);

        if (fm.draft === "true" || fm.draft === true) continue;

        const url = getUrlFromPath(contentDir, file);
        const tags = Array.isArray(fm.tags) ? fm.tags : [];

        index.push({
          title: fm.title || basename(file, ".md"),
          description: fm.description || "",
          url,
          tags,
        });
      } catch (err) {
        console.error(`  ❌ Error processing ${file}: ${err.message}`);
      }
    }

    console.log(`  ✅ ${contentDir}: ${mdFiles.length} files indexed`);
  }

  // Ensure public dir exists
  const publicDir = resolve(ROOT, "public");
  if (!existsSync(publicDir)) {
    await (await import("node:fs/promises")).mkdir(publicDir, { recursive: true });
  }

  await writeFile(OUTPUT_FILE, JSON.stringify(index), "utf-8");
  console.log(`\n📦 Search index written to ${OUTPUT_FILE} (${index.length} items)`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
