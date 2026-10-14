---
title: 'Common Frontend Tools: From package.json to Vite, a Guide to Frontend Engineering'
published: 2026-06-17
description: 'A clear and accessible overview of core frontend engineering tools: package.json, dependency management, versioning rules, lock files, npm/yarn/pnpm, scripts, Vite, and Webpack.'
image: ''
tags: [frontend tools, npm, Vite, Webpack, engineering, frontend fundamentals]
category: Frontend
draft: false
---
## 1. Introduction

Modern front-end development is no longer the era of "one HTML file + a few script tags." A typical front-end project uses:

- Various third-party libraries (React, Vue, Lodash...)
- Build tools (Vite, Webpack...)
- Linting and formatting (ESLint, Prettier...)
- Testing frameworks (Vitest, Playwright...)

Managing these requires a toolchain. This article will walk you through the core concepts and tools of front-end engineering.

---

## 2. package.json: The Project's "Instruction Manual"

### 2.1 What Is It?

`package.json` is the **metadata file** for every Node.js / front-end project, recording the project's basic information, dependencies, script commands, and more. You can think of it as the project's **ID card + instruction manual**.

### 2.2 A Typical package.json

```json
{
    "name": "my-awesome-app",
    "version": "1.0.0",
    "private": true,
    "type": "module",
    "scripts": {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview"
    },
    "dependencies": {
        "react": "^19.0.0",
        "react-dom": "^19.0.0"
    },
    "devDependencies": {
        "vite": "^8.0.0",
        "@vitejs/plugin-react": "^5.0.0",
        "typescript": "^5.8.0"
    }
}
```

### 2.3 Key Fields Explained

| Field | Purpose |
|------|------|
| `name` | Project name (must be unique if publishing to npm) |
| `version` | Project version number |
| `private: true` | Set to true to prevent accidental publishing to npm |
| `type` | `"module"` enables ES Module (`import`/`export`), defaults to CommonJS (`require`) |
| `scripts` | Defines project command aliases |
| `dependencies` | **Production dependencies**, packages needed at runtime in production |
| `devDependencies` | **Development dependencies**, packages only needed during local development |
| `peerDependencies` | Peer dependencies, requiring the host to provide a specified version of the package |

---

## 3. dependencies and devDependencies

### 3.1 The Difference

```
Production dependencies (dependencies):
  → Code that must be loaded when users visit your website
  → For example: react, vue, lodash, axios

Development dependencies (devDependencies):
  → Only take effect during the development phase, and do not enter the final build output after bundling
  → For example: vite, webpack, typescript, eslint, prettier, vitest
```

### 3.2 Install Commands

```bash
# Install as a production dependency (default)
npm install react

# Install as a development dependency
npm install -D vite typescript

# Equivalent syntax
npm install --save-dev vite
```

### 3.3 Why Distinguish Between Them?

| Scenario | No Distinction | With Distinction |
|------|--------|------|
| `npm install` | Install everything | Install everything |
| `npm install --production` | Install everything | **Only install dependencies** |
| Final bundle | May accidentally include testing tools | Cleaner tree shaking |

In production environments (CI/CD or Docker), using `npm install --production` can **significantly reduce installation time and disk usage**.

---

## 4. Version Number Rules: SemVer

### 4.1 Semantic Versioning

npm uses **Semantic Versioning** (SemVer for short), with the format:

```
Major version number.Minor version number.Patch number
 MAJOR . MINOR . PATCH
```

| Number | Meaning | When to Increment |
|------|------|---------|
| MAJOR | Major version | Incompatible API changes (breaking changes) |
| MINOR | Minor version | Backward-compatible new features |
| PATCH | Patch number | Backward-compatible bug fixes |

Example: `3.2.1` = major version 3, minor version 2, patch number 1.

### 4.2 Version Range Symbols

Version numbers in `package.json` usually have a symbol in front of them:

| Notation | Meaning | Allowed Range |
|------|------|---------|
| `^19.0.0` | Compatible with patches and minor versions | `>=19.0.0 <20.0.0` |
| `~19.0.0` | Only compatible with patches | `>=19.0.0 <19.1.0` |
| `19.0.0` | Exact version | Only allows `19.0.0` |
| `*` | Any version | The latest |
| `>=19.0.0` | Greater than or equal to | `≥19.0.0` |

```bash
# Concrete example
^1.2.3  →  >=1.2.3 <2.0.0   # Recommended, allows new features
~1.2.3  →  >=1.2.3 <1.3.0   # Conservative, only allows fixes
1.2.3   →  1.2.3 only       # Fully locked down
```

> **Recommendation**: For everyday development, use `^` (caret) to let the project automatically receive bug fixes and new features. Critical libraries can use exact versions.

---

## 5. npm install and node_modules

### 5.1 What Does `npm install` Do?

```bash
npm install
```

When you run this command, npm will:

1. Read `dependencies` and `devDependencies` from `package.json`
2. Resolve the dependency tree, finding all dependencies of dependencies (transitive dependencies)
3. Download each package's code to the `node_modules/` directory
4. Generate or update `package-lock.json`

### 5.2 The "Black Hole" of node_modules

The `node_modules` directory is notorious for its size. A medium-sized project can contain hundreds of MB and tens of thousands of files:

```
node_modules/
├── react/
├── react-dom/
├── vite/
├── typescript/
├── ... (hundreds of packages)
```

**Important**: `node_modules` **should not be committed to Git**. `.gitignore` should include:

```
node_modules/
```

After team members clone the project, they can run `npm install` to regenerate it.

---

## 6. Lock Files: Locking Down Exact Versions

### 6.1 Why Are Lock Files Needed?

`package.json` uses **range versions** like `^1.2.3`, meaning that `npm install` at different times may install different versions:

```
Installed on March 1: react ^19.0.0 → 19.0.0
Installed on May 1: react ^19.0.0 → 19.2.3  ← Not the same!
```

This leads to the classic "**it works on my machine**" problem.

### 6.2 The Role of Lock Files

| Tool | Lock File | Characteristics |
|------|----------|------|
| npm | `package-lock.json` | JSON format, records exact versions and download URLs of all packages |
| yarn | `yarn.lock` | YAML-like format |
| pnpm | `pnpm-lock.yaml` | YAML format |

Lock files record the **exact version of every layer of dependencies**, ensuring that dependencies installed by team members and CI/CD are completely identical.

```json
// package-lock.json snippet
"node_modules/react": {
    "version": "19.2.3",
    "resolved": "https://registry.npmjs.org/react/-/react-19.2.3.tgz",
    "integrity": "sha512-..."
}
```

> **Lock files must be committed to Git.** They are the key to ensuring environment consistency.

---

## 7. npm, yarn, pnpm: The Three Major Package Managers

### 7.1 Development History

```
npm (2010)
  → The first Node.js package manager, installed alongside Node.js

yarn (2016)
  → Created by Facebook, solving npm's slowness and inconsistency issues

pnpm (2017)
  → Best disk efficiency, strict dependency handling
```

### 7.2 Core Comparison

| Feature | npm | yarn | pnpm |
|------|-----|------|------|
| Install speed | Medium | Fast | Fastest |
| Disk efficiency | Low (independent copy per project) | Low (same as npm) | High (global store + hard links) |
| Phantom dependencies | Allowed | Allowed | **Prohibited** (strict mode) |
| Lock file | `package-lock.json` | `yarn.lock` | `pnpm-lock.yaml` |
| Monorepo support | Workspaces | Workspaces | Native first-class support |

### 7.3 The "Phantom Dependency" Problem

npm and yarn Classic **flatten** all dependencies at the top level of `node_modules`. This allows you to `require('express')` even if you didn't declare it in `package.json` (if some package depends on express).

pnpm uses **strict nested dependencies**, so you can only access dependencies you declared yourself in `package.json`, exposing missing dependencies at code-writing time.

### 7.4 How to Choose?

| Scenario | Recommendation |
|------|------|
| Personal projects, rapid prototyping | npm (zero configuration) |
| Team collaboration, medium-to-large projects | pnpm (fast, disk-efficient, strict) |
| Monorepo | pnpm (best native support) |

---
## 8. scripts and npm run: Giving Commands Aliases

### 8.1 What is scripts?

The `scripts` field in `package.json` allows you to give short aliases to complex commands:

```json
{
    "scripts": {
        "dev": "vite --host 0.0.0.0 --port 3000",
        "build": "tsc && vite build",
        "lint": "eslint . --ext .ts,.tsx",
        "format": "prettier --write .",
        "test": "vitest run",
        "test:watch": "vitest"
    }
}
```

When using:

```bash
npm run dev    # Equivalent to running vite --host 0.0.0.0 --port 3000
npm run build  # Equivalent to running tsc && vite build
npm run lint   # Equivalent to running eslint . --ext .ts,.tsx
```

### 8.2 Special Scripts

Some script names can omit `run` directly:

```bash
npm start      # Equivalent to npm run start
npm test       # Equivalent to npm run test
npm stop       # Equivalent to npm run stop
npm restart    # Equivalent to npm run restart
```

### 8.3 pre and post Hooks

npm has built-in **lifecycle hooks**:

```json
{
    "scripts": {
        "prebuild": "npm run clean",    // Runs before build
        "build": "vite build",           // Main command
        "postbuild": "npm run analyze"   // Runs after build
    }
}
```

When executing `npm run build`, npm executes in the order of `prebuild → build → postbuild`.

---

## 9. Vite and Webpack: Build Tools

### 9.1 Why Do We Need Build Tools?

Browsers cannot directly run `.vue`, `.tsx`, `.scss` files, nor do they support `import` path aliases. The role of build tools is to **transform development code into code that browsers can run**:

```
Source files (.tsx / .vue / .scss)
   ￬ Build tools (Vite / Webpack)
Final output (.js / .css / .html)
```

### 9.2 Webpack

**Webpack** was once the absolute king of frontend building (2014-2022). Its core philosophy: **everything is a module, handle all files through Loader and Plugin**.

```javascript
// webpack.config.js
module.exports = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
    },
    module: {
        rules: [
            { test: /\.css$/, use: ['style-loader', 'css-loader'] },
            { test: /\.tsx?$/, use: 'ts-loader' },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({ template: './index.html' }),
    ],
};
```

| Advantages | Disadvantages |
|------|------|
| Extremely rich ecosystem | Complex configuration (Webpack configuration engineer) |
| Very mature plugin system | Slow build speed (JS single-threaded) |
| Large number of existing projects | Slow dev server startup |

### 9.3 Vite

**Vite** (French for "fast") was created by Vue author Evan You, and quickly became mainstream after 2022:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: { port: 3000 },
});
```

The core differences between Vite and Webpack:

| Dimension | Webpack | Vite |
|------|---------|------|
| Dev mode | Bundle all modules then start → slow | Leverage browser native ESM, compile on demand → fast |
| Underlying engine | JavaScript (Node.js) | esbuild (Go) + Rolldown (Rust) |
| Startup speed | Tens of seconds (medium-to-large projects) | **Millisecond level** |
| HMR hot update | Slows down as module count increases | Extremely fast, independent of module count |
| Configuration complexity | High (need to understand Loader/Plugin) | Low (works out of the box) |
| Production build | Webpack itself | Rolldown (Rust, speed dominates) |

### 9.4 How to Choose?

| Scenario | Recommendation |
|------|------|
| New projects | **Vite** (faster, simpler, more modern) |
| Maintaining old projects | Keep existing Webpack configuration unchanged |
| Need to support legacy browsers | Webpack (more mature ecosystem) |
| Need deep build customization | Webpack (richest plugins) |

---

## 10. Summary

The frontend toolchain looks complex, but each tool has a clear positioning:

| Tool/Concept | One-line positioning |
|----------|----------|
| `package.json` | The project's ID card and instruction manual |
| `dependencies` / `devDependencies` | Runtime dependencies vs development dependencies |
| SemVer | `主.次.修` standardized version management |
| `node_modules` | Where the actual code of dependencies is stored |
| lock file | Locks down the exact versions of dependencies, ensuring environment consistency |
| npm / yarn / pnpm | Tools for installing dependencies and managing versions |
| `scripts` | Giving aliases to complex commands |
| Vite / Webpack | Compiling development code into artifacts that browsers can run |

Mastering these tools will let you understand the "skeleton" of any frontend project, and no longer be intimidated by the dense fields in `package.json`. Frontend engineering, at its core, is about solving one problem: **taking code from "can write" to "can run" to "can maintain."**