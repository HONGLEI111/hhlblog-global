/* Frontmatter contract tests for the three content generators (ticket #90).
   Run each generator through its process boundary, then assert the frontmatter it wrote to disk.
   Assertions are per key/value and per key set — never a whole-file string compare or snapshot,
   and never an import of script internals. */

import fs from "node:fs"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { GENERATORS, draftFile, makeTempDir, removeTempDir, runGenerator } from "./generator-fixtures.js"

const SAMPLE_NAME = "contract-sample"

// Keys every generator writes, with the raw value it leaves for the author to fill in.
const SHARED_FIELDS = {
  description: "''",
  image: "''",
  tags: "[]",
  category: "''",
  draft: "false",
  lang: "''",
}

let tempDir

beforeEach(() => {
  tempDir = makeTempDir()
})

afterEach(() => {
  removeTempDir(tempDir)
})

function today() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")

  return `${now.getFullYear()}-${month}-${day}`
}

function parseFrontmatter(text) {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (block === null) throw new Error("the generated file has no frontmatter block")

  const fields = {}
  for (const line of block[1].split(/\r?\n/)) {
    const separator = line.indexOf(":")
    if (separator > 0) fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim()
  }

  return fields
}

function generate(generator, name = SAMPLE_NAME) {
  const result = runGenerator(generator, tempDir, name)
  if (result.status !== 0) {
    throw new Error(`${generator.name} exited with ${result.status}: ${result.stderr}`)
  }

  const fileName = /\.(md|mdx)$/i.test(name) ? name : `${name}.md`

  return parseFrontmatter(fs.readFileSync(draftFile(generator, tempDir, fileName), "utf8"))
}

describe.each(GENERATORS)("$name frontmatter", (generator) => {
  it("titles the draft from the raw argument rather than the derived filename", () => {
    expect(generate(generator, "raw-title").title).toBe("raw-title")
    expect(generate(generator, "raw-title.mdx").title).toBe("raw-title.mdx")
  })

  it("dates the draft with the local date it ran on", () => {
    const before = today()
    const fields = generate(generator)
    const after = today()

    expect(fields.published).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect([before, after]).toContain(fields.published)
  })

  it("writes exactly this collection's fields, left empty for the author", () => {
    const fields = generate(generator)
    const expected = ["title", "published", ...Object.keys(SHARED_FIELDS), ...Object.keys(generator.extraFields)]

    expect(fields).toMatchObject({ ...SHARED_FIELDS, ...generator.extraFields })
    expect(Object.keys(fields).sort()).toEqual(expected.sort())
  })

  it("never emits a field belonging to another collection", () => {
    const fields = generate(generator)
    const foreignKeys = GENERATORS.flatMap((other) => Object.keys(other.extraFields)).filter(
      (key) => !(key in generator.extraFields),
    )

    expect(Object.keys(fields).filter((key) => foreignKeys.includes(key))).toEqual([])
  })
})
