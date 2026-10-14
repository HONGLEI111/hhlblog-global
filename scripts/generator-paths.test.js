/* Filename and path contract tests for the three content generators (ticket #92).
   Cover the name -> filename rules and the directory layout each generator creates.
   No assertion here depends on the current date, the timezone, or the system locale; the one
   whole-tree digest below is a repository-isolation invariant, not a comparison of generated output. */

import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { GENERATORS, draftFile, makeTempDir, removeTempDir, repoRoot, runGenerator } from "./generator-fixtures.js"

const contentRoot = path.join(repoRoot, "src", "content")

let tempDir

beforeEach(() => {
  tempDir = makeTempDir()
})

afterEach(() => {
  removeTempDir(tempDir)
})

function snapshot(directory) {
  const digests = {}
  for (const entry of fs.readdirSync(directory, { withFileTypes: true, recursive: true })) {
    if (entry.isDirectory()) continue
    const full = path.join(entry.parentPath, entry.name)
    digests[path.relative(directory, full)] = crypto.createHash("sha1").update(fs.readFileSync(full)).digest("hex")
  }

  return digests
}

describe.each(GENERATORS)("$name path contract", (generator) => {
  it("appends .md to a bare name", () => {
    const result = runGenerator(generator, tempDir, "bare-name")

    expect(result.status).toBe(0)
    expect(fs.existsSync(draftFile(generator, tempDir, "bare-name.md"))).toBe(true)
  })

  it("respects an explicit .md extension instead of appending another", () => {
    const result = runGenerator(generator, tempDir, "explicit.md")

    expect(result.status).toBe(0)
    expect(fs.existsSync(draftFile(generator, tempDir, "explicit.md"))).toBe(true)
    expect(fs.existsSync(draftFile(generator, tempDir, "explicit.md.md"))).toBe(false)
  })

  it("respects an explicit .mdx extension", () => {
    const result = runGenerator(generator, tempDir, "explicit.mdx")

    expect(result.status).toBe(0)
    expect(fs.existsSync(draftFile(generator, tempDir, "explicit.mdx"))).toBe(true)
    expect(fs.existsSync(draftFile(generator, tempDir, "explicit.mdx.md"))).toBe(false)
  })

  it("creates the parent directories a nested name needs", () => {
    const result = runGenerator(generator, tempDir, "nested/deep/name")

    expect(result.status).toBe(0)
    expect(fs.existsSync(draftFile(generator, tempDir, "nested", "deep", "name.md"))).toBe(true)
  })

  it("writes a non-ASCII name verbatim", () => {
    const result = runGenerator(generator, tempDir, "中文标题")

    expect(result.status).toBe(0)
    expect(fs.existsSync(draftFile(generator, tempDir, "中文标题.md"))).toBe(true)
  })
})

describe("repository content tree", () => {
  it("is left byte-identical by every generator, including nested and non-ASCII names", () => {
    const before = snapshot(contentRoot)

    for (const generator of GENERATORS) {
      for (const name of ["touch-bare", "nested/touch-nested", "touch.mdx", "中文标题"]) {
        expect(runGenerator(generator, tempDir, name).status).toBe(0)
      }
    }

    expect(snapshot(contentRoot)).toEqual(before)
  })
})
