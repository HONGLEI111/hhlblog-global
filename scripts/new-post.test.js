/* Contract tests for scripts/new-post.js.
   Run the script through its process boundary and assert what a caller can observe:
   exit status, stdout, stderr, and the file that lands on disk. Never import script internals. */

import fs from "node:fs"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { POSTS, draftFile, makeTempDir, removeTempDir, runGenerator } from "./generator-fixtures.js"

const POST_NAME = "hello-world"
const POST_FILE = `${POST_NAME}.md`

let tempDir

beforeEach(() => {
  tempDir = makeTempDir()
})

afterEach(() => {
  removeTempDir(tempDir)
})

function createPost() {
  const { status, stdout, stderr } = runGenerator(POSTS, tempDir, POST_NAME)

  return { status, stdout, stderr, file: draftFile(POSTS, tempDir, POST_FILE) }
}

describe("new-post success path", () => {
  it("exits 0, reports the path it created, and writes the file there", () => {
    const result = createPost()

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(fs.existsSync(result.file)).toBe(true)
    expect(result.stdout.replaceAll("\\", "/")).toContain("src/content/posts/hello-world.md")
  })

  it("seeds the new post with a frontmatter skeleton", () => {
    const body = fs.readFileSync(createPost().file, "utf8")

    expect(body.startsWith("---\n")).toBe(true)
    expect(body).toMatch(/^title: hello-world$/m)
    expect(body).toMatch(/^published: \d{4}-\d{2}-\d{2}$/m)
    expect(body).toMatch(/^draft: false\s*$/m)
  })
})
