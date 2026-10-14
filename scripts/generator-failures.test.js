/* Failure contract tests for the three content generators (ticket #91).
   Assert only what a caller can observe: exit status, and what the script wrote to stderr and disk.
   Never import script internals. */

import fs from "node:fs"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { GENERATORS, draftFile, makeTempDir, removeTempDir, repoRoot, runGenerator } from "./generator-fixtures.js"

const packageScripts = Object.keys(JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")).scripts)

const SAMPLE_NAME = "failure-sample"

let tempDir

beforeEach(() => {
  tempDir = makeTempDir()
})

afterEach(() => {
  removeTempDir(tempDir)
})

describe.each(GENERATORS)("$name failure contract", (generator) => {
  it("fails with a usage hint and writes nothing when no filename is given", () => {
    const result = runGenerator(generator, tempDir)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("Usage:")
    expect(fs.readdirSync(tempDir)).toEqual([])
  })

  it("names a runnable package script in its usage hint", () => {
    const result = runGenerator(generator, tempDir)
    const hint = result.stderr.match(/npm run ([a-z-]+) --/)

    expect(hint).not.toBeNull()
    expect(hint?.[1]).toBe(generator.name)
    expect(packageScripts).toContain(hint?.[1])
  })

  it("refuses to overwrite an existing draft and leaves it byte-identical", () => {
    const created = runGenerator(generator, tempDir, SAMPLE_NAME)
    expect(created.status).toBe(0)
    const draft = draftFile(generator, tempDir, `${SAMPLE_NAME}.md`)
    const before = fs.readFileSync(draft)
    const fileCountBefore = fs.readdirSync(tempDir).length

    const second = runGenerator(generator, tempDir, SAMPLE_NAME)

    expect(second.status).not.toBe(0)
    expect(second.stderr).toContain("already exists")
    expect(fs.readFileSync(draft)).toEqual(before)
    expect(fs.readdirSync(tempDir).length).toBe(fileCountBefore)
  })
})
