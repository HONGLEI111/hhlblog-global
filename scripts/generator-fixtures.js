/* Shared fixtures for the content-generator contract tests.
   Deliberately not named *.test.js so vitest does not collect it as a suite. */

import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))

export const repoRoot = path.join(scriptDir, "..")

// Each generator writes into its own collection. `extraFields` are the keys only that collection gets,
// with the raw value the script leaves behind; `rating` is emitted as a bare `rating:` line.
export const POSTS = { name: "new-post", collection: "posts", extraFields: {} }
export const READ = {
  name: "new-read",
  collection: "read",
  extraFields: { author: "''", bookTitle: "''", rating: "", cover: "''" },
}
export const TECHNOLOGY = { name: "new-technology", collection: "technology", extraFields: {} }

export const GENERATORS = [POSTS, READ, TECHNOLOGY]

export function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "hhlblog-generators-"))
}

export function removeTempDir(tempDir) {
  fs.rmSync(tempDir, { recursive: true, force: true })
}

export function runGenerator(generator, cwd, ...args) {
  return spawnSync(process.execPath, [path.join(scriptDir, `${generator.name}.js`), ...args], {
    cwd,
    encoding: "utf8",
  })
}

export function draftFile(generator, cwd, ...segments) {
  return path.join(cwd, "src", "content", generator.collection, ...segments)
}
