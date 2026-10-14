---
title: 'npm v12 Disables Lifecycle Scripts by Default: A Security Change Affecting All Developers'
published: 2026-06-15
description: npm v12, scheduled for release in July 2026, will disable install lifecycle scripts, Git dependencies, and remote URL dependencies by default. This article explains the background, scope, and migration paths for these three breaking changes to help teams adapt before the deadline.
image: ''
tags: [npm, Node.js, Security, Frontend]
category: Frontend
draft: false
---
## 1. Introduction

In July 2026, npm will release **v12**, bringing the most aggressive security policy change in npm's history—**lifecycle script execution disabled by default**. This means that `preinstall`, `install`, and `postinstall` scripts of any dependency package will no longer run by default, and Git dependencies and remote URL dependencies will also be blocked by default.

This follows pnpm v10 (January 2025), which was the first to introduce a similar mechanism, with npm now being the last mainstream JavaScript package manager to adopt this security practice. GitHub explicitly stated in its official Changelog: **approximately 455,000 malicious packages were published to the npm registry in 2025**, while only about 2% of npm packages actually need to execute install scripts—yet 100% of packages have the ability to run arbitrary code at install time.

---

## 2. Three Breaking Changes

npm v12 introduces three default value changes, each of which directly cuts off a supply chain attack path.

### 2.1 `allowScripts` Disabled by Default

This is the most far-reaching change. Starting from npm v12, the following lifecycle scripts **no longer execute by default**:

| Script | Trigger Timing | Affected Scope |
|------|----------|------------|
| `preinstall` | Before package install | All dependencies |
| `install` | During package install | All dependencies |
| `postinstall` | After package install | All dependencies |
| `prepare` | During git/file/link dependency install | git/file/link dependencies |

It's worth noting that **implicit `node-gyp` rebuilds are also blocked**—even if a package doesn't explicitly declare an install script, as long as it contains a `binding.gyp` file, native module compilation will still be triggered at install time, which also requires explicit authorization under v12.

### 2.2 `--allow-git` Defaults to `none`

Git dependencies (`"foo": "git+https://github.com/user/repo.git"`) are no longer resolved by default. This change closes a critical code execution path: **a Git dependency's `.npmrc` file can override the Git executable path**, allowing attackers to bypass `--ignore-scripts` restrictions.

### 2.3 `--allow-remote` Defaults to `none`

Remote URL dependencies (HTTPS tarballs, etc.) are likewise no longer resolved by default, further narrowing the window for unreviewed code to enter the dependency tree.

---

## 3. Why This Is Necessary

### 3.1 Alarming Attack Data

The npm ecosystem has experienced an unprecedented wave of supply chain attacks over the past year:

| Incident | Time | Impact |
|------|------|------|
| **Miasma Worm** | June 2026 | Malware that self-propagates using install scripts |
| **Axios Poisoning Incident** | March 2026 | Popular HTTP library injected with malicious code |
| **18 Packages Hijacked** | September 2025 | Core toolkits including `debug` and `chalk` taken over |
| **Full-Year Malicious Packages** | All of 2025 | Approximately **455,000** malicious packages published to the npm registry |

### 3.2 Asymmetric Trust Model

The traditional npm install model has a fundamental trust asymmetry:

- **Only 2% of packages** actually need to run install scripts (such as native module compilation or platform binary downloads)
- **But 100% of packages** have the ability to execute arbitrary code at install time
- A deeply nested transitive dependency's install script is enough to compromise an entire system

This "trust everything by default" model is no longer sustainable in the current threat environment.

### 3.3 pnpm Has Already Validated This Path

pnpm v10 was the first to implement a security model of **blocking lifecycle scripts by default + explicit allowlist** in January 2025. Over a year of practice has proven:

- The vast majority of projects only need to approve a very small number of packages (such as `esbuild`, `sharp`, `node-gyp` and other packages requiring native compilation)
- CI/CD pipelines can be automated through the allowlist in `package.json`
- The impact on developer experience is far less than expected, while the security benefits are enormous

The changes in npm v12 essentially roll out this proven security model across the entire npm ecosystem.

---

## 4. Migration Plan

### 4.1 Immediate Action: Upgrade to npm 11.16.0+

npm 11.16.0 (released in June 2026) already includes **early warning mechanisms** for all v12 changes. After upgrading, run `npm install` and you'll see warnings about which scripts v12 will block, rather than being hard-blocked in July.

```bash
# 升级到最新 npm 11
npm install -g npm@11

# 在项目中运行安装，观察警告
npm install
```

### 4.2 Review and Build an Allowlist

npm 11 provides a brand-new approval workflow:

```bash
# 查看所有有待审批安装脚本的包
npm approve-scripts --allow-scripts-pending

# 批准你信任的包（写入 package.json）
npm approve-scripts esbuild
npm approve-scripts sharp
npm approve-scripts node-gyp

# 拒绝不需要的包
npm deny-scripts some-suspicious-package
```

### 4.3 Commit the Allowlist

Approval results are written to `package.json`, **which is a team decision that needs version control**:

```json
{
  "name": "my-project",
  "dependencies": {
    "esbuild": "^0.27.0",
    "sharp": "^0.34.0"
  },
  "allowScripts": {
    "esbuild": true,
    "sharp": true
  }
}
```

The advantages of the allowlist are:
- **Reviewable**: Every PR shows which packages have been granted install script permissions
- **Traceable**: Git history records the time and person behind each trust decision
- **Automatable**: CI/CD reads `package.json` directly, with no additional configuration needed

### 4.4 Handle Git Dependencies and Remote Dependencies

If your project depends on Git repositories or remote URLs:

```bash
# 在 .npmrc 或命令行中显式授权
npm install --allow-git=all          # 允许所有 Git 依赖
npm install --allow-git=foo/bar      # 只允许特定仓库
npm install --allow-remote=all       # 允许所有远程 URL 依赖
```

It's recommended to migrate Git/remote dependencies to officially published packages on the npm registry as soon as possible, fundamentally eliminating the risk.

---

## 5. Impact on CI/CD

### 5.1 Docker Images

If your Dockerfile has `npm install -g` global installs, you need to confirm whether these packages contain install scripts:

```dockerfile
# npm v12 的 Docker 镜像（node:24+ 将内置 npm v12）
FROM node:24

# 需要显式审批全局包的脚本
RUN npm approve-scripts -g esbuild
RUN npm install -g esbuild
```

### 5.2 GitHub Actions / Other CI Environments

```yaml
# .github/workflows/ci.yml
- name: Install dependencies
  run: |
    # package.json 中的 allowScripts 会被自动读取
    npm install
    # 如果需要额外授权（不推荐），使用：
    # npm install --allow-scripts=all
```

The recommended approach is to **write `allowScripts` into `package.json` and commit it**, so that CI environments need no additional configuration.

### 5.3 Emergency Fallback (Not Recommended)

If a project temporarily cannot complete the migration, the old behavior can be restored through the following configuration:

```bash
# 全局恢复旧行为（高风险，不推荐）
npm install --allow-scripts=all --allow-git=all --allow-remote=all
```

However, it's strongly recommended that this be used only as an emergency measure—**attackers rely precisely on developers using such "wide-open" configurations long-term.**

---

## 6. Scenarios Not Covered by the Change

This security mechanism is not a silver bullet; the following risks still exist:

- **Runtime malicious code**: Install scripts are only one attack entry point; functions executed by packages at runtime are unaffected
- **Maintainer account compromise**: Attackers who gain maintainer privileges can directly modify package source code without needing install scripts
- **Typosquatting**: Malicious packages disguised as popular package names to trick users into manual installation
- **Social engineering risk**: `npm approve-scripts --all` one-click approval of all scripts renders the security mechanism useless

---

## 7. Timeline and Action Recommendations

| Time | Event | Action |
|------|------|------|
| **Now** | npm 11.16.0 has been released | Upgrade to npm@11 and start reviewing projects |
| **Now ~ July** | Buffer period | Build an allowlist and commit it to `package.json` |
| **July 2026** | npm v12 officially released | Ensure all CI/CD has been adapted |
| **After v12** | Long-term | New projects are secure by default; old projects continuously maintain allowlists |

### Immediate Action Checklist

1. **Upgrade npm**: `npm install -g npm@11`
2. **Run a full install once**: Observe v12 compatibility warnings
3. **Review install scripts**: `npm approve-scripts --allow-scripts-pending`
4. **Build an allowlist**: Make an explicit decision for each package that needs scripts
5. **Commit to the repository**: Bring `package.json` in `allowScripts` under version control
6. **Clean up Git/remote dependencies**: Migrate to official npm registry packages wherever possible

---

## 8. Summary

This change in npm v12 is essentially the JavaScript ecosystem's end to the era of **"insecure by default."** Moving from "trust all packages by default, fix things when they break" to "don't trust by default, explicitly authorize trusted packages" is a paradigm shift that is overdue but must happen.

For the vast majority of projects, the actual impact is not significant—you only need to approve 3-5 dependency packages that genuinely require native compilation. What truly requires investment is **a shift in team mindset**: treating install script approval as part of code review, and treating `allowScripts` as a security configuration just as important as `dependencies`.

The July 2026 deadline is not far away. Spending an hour now to complete the migration is far better than facing a full CI collapse on the deadline.

--- END CONTENT ---