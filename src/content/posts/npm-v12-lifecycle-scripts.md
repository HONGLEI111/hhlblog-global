---
title: npm v12 默认禁止生命周期脚本执行：一次影响所有开发者的安全变革
published: 2026-06-15
description: 'npm v12 将于 2026 年 7 月发布，届时将默认禁止 install 生命周期脚本、Git 依赖和远程 URL 依赖的执行。本文详解三大破坏性变更的背景、影响范围及迁移方案，帮助团队在截止日期前完成适配。'
image: ''
tags: [npm, Node.js, 安全, 前端]
category: '前端'
draft: false
lang: ''
---

## 1. 引言

2026 年 7 月，npm 将发布 **v12 大版本**，带来 npm 历史上最激进的安全策略变更——**默认禁止生命周期脚本执行**。这意味着任何依赖包的 `preinstall`、`install`、`postinstall` 脚本将不再默认运行，Git 依赖和远程 URL 依赖也将被默认拦截。

这是继 pnpm v10（2025 年 1 月）率先引入类似机制后，npm 作为最后一个主流 JavaScript 包管理器跟进这一安全实践。GitHub 在官方 Changelog 中明确指出：**2025 年 npm 注册表上发布了约 455,000 个恶意包**，而实际只有约 2% 的 npm 包真正需要执行安装脚本——但 100% 的包都有能力在安装时运行任意代码。

---

## 2. 三大破坏性变更

npm v12 引入了三项默认值变更，每一项都直接切断一条供应链攻击路径。

### 2.1 `allowScripts` 默认关闭

这是影响最广的一项变更。从 npm v12 开始，以下生命周期脚本**默认不再执行**：

| 脚本 | 触发时机 | 受影响范围 |
|------|----------|------------|
| `preinstall` | 包安装前 | 所有依赖 |
| `install` | 包安装时 | 所有依赖 |
| `postinstall` | 包安装后 | 所有依赖 |
| `prepare` | git/file/link 依赖安装时 | git/file/link 依赖 |

值得注意的是，**隐式的 `node-gyp` 重建也会被阻止**——即使某个包没有显式声明 install 脚本，但只要包含 `binding.gyp` 文件，安装时同样会触发原生模块编译，这在 v12 下也需要显式授权。

### 2.2 `--allow-git` 默认值为 `none`

Git 依赖（`"foo": "git+https://github.com/user/repo.git"`）默认不再解析。这项变更关闭了一个关键的代码执行路径：**Git 依赖的 `.npmrc` 文件可以覆盖 Git 可执行文件路径**，攻击者可以借此绕过 `--ignore-scripts` 的限制。

### 2.3 `--allow-remote` 默认值为 `none`

远程 URL 依赖（HTTPS tarball 等）同样默认不再解析，进一步缩小了未经审查的代码进入依赖树的窗口。

---

## 3. 为什么必须这样做

### 3.1 触目惊心的攻击数据

npm 生态在过去一年经历了前所未有的供应链攻击浪潮：

| 事件 | 时间 | 影响 |
|------|------|------|
| **Miasma 蠕虫** | 2026 年 6 月 | 利用 install 脚本自我传播的恶意软件 |
| **Axios 投毒事件** | 2026 年 3 月 | 流行 HTTP 库被植入恶意代码 |
| **18 个包遭劫持** | 2025 年 9 月 | 包括 `debug`、`chalk` 在内的核心工具包被接管 |
| **全年恶意包** | 2025 全年 | 约 **455,000** 个恶意包发布到 npm 注册表 |

### 3.2 不对称的信任模型

传统的 npm 安装模型存在根本性的信任不对称：

- **只有 2% 的包**真正需要运行安装脚本（如原生模块编译、平台二进制下载）
- **但 100% 的包**都有能力在安装时执行任意代码
- 一个深度嵌套的传递依赖的 install 脚本，足以攻破整个系统

这种"默认信任一切"的模型在当前的威胁环境下已经不可持续。

### 3.3 pnpm 已经验证了这条路

pnpm v10 在 2025 年 1 月率先实现了**默认阻止生命周期脚本 + 显式许可名单**的安全模型。一年多的实践证明：

- 绝大多数项目只需批准极少数的包（如 `esbuild`、`sharp`、`node-gyp` 等需要原生编译的包）
- CI/CD 流程可以通过 `package.json` 中的许可名单实现自动化
- 开发者体验的影响远小于预期，安全收益巨大

npm v12 的变更本质上是在 npm 生态中全面推广这一已验证的安全模型。

---

## 4. 迁移方案

### 4.1 立即行动：升级到 npm 11.16.0+

npm 11.16.0（2026 年 6 月发布）已经包含了 v12 所有变更的**预警机制**。升级后运行 `npm install`，你会看到 v12 将阻止哪些脚本的警告信息，而不是直接在 7 月被硬阻断。

```bash
# 升级到最新 npm 11
npm install -g npm@11

# 在项目中运行安装，观察警告
npm install
```

### 4.2 审查并建立许可名单

npm 11 提供了全新的审批工作流：

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

### 4.3 提交许可名单

审批结果会写入 `package.json`，**这是一个需要版本控制的团队决策**：

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

许可名单的优势在于：
- **可审查**：每次 PR 都能看到哪些包被授予了安装脚本权限
- **可追溯**：Git 历史记录了每个信任决策的时间点和决策人
- **可自动化**：CI/CD 直接读取 `package.json`，无需额外配置

### 4.4 处理 Git 依赖和远程依赖

如果你的项目依赖了 Git 仓库或远程 URL：

```bash
# 在 .npmrc 或命令行中显式授权
npm install --allow-git=all          # 允许所有 Git 依赖
npm install --allow-git=foo/bar      # 只允许特定仓库
npm install --allow-remote=all       # 允许所有远程 URL 依赖
```

建议尽将 Git/远程依赖迁移到 npm 注册表的正式发布包，从根本上消除风险。

---

## 5. 对 CI/CD 的影响

### 5.1 Docker 镜像

如果你的 Dockerfile 中有 `npm install -g` 全局安装，需要确认这些包是否包含安装脚本：

```dockerfile
# npm v12 的 Docker 镜像（node:24+ 将内置 npm v12）
FROM node:24

# 需要显式审批全局包的脚本
RUN npm approve-scripts -g esbuild
RUN npm install -g esbuild
```

### 5.2 GitHub Actions / 其他 CI 环境

```yaml
# .github/workflows/ci.yml
- name: Install dependencies
  run: |
    # package.json 中的 allowScripts 会被自动读取
    npm install
    # 如果需要额外授权（不推荐），使用：
    # npm install --allow-scripts=all
```

推荐的做法是**将 `allowScripts` 写入 `package.json` 并提交**，这样 CI 环境无需任何额外配置。

### 5.3 应急回退（不推荐）

如果项目暂时无法完成迁移，可以通过以下配置恢复到旧行为：

```bash
# 全局恢复旧行为（高风险，不推荐）
npm install --allow-scripts=all --allow-git=all --allow-remote=all
```

但强烈建议这只是应急手段——**攻击者正是依赖开发者长期使用这类"全开"配置。**

---

## 6. 变更不覆盖的场景

这项安全机制并非银弹，以下风险依然存在：

- **运行时恶意代码**：安装脚本只是攻击入口之一，包在运行时执行的函数不受影响
- **维护者账号泄露**：攻击者获取维护者权限后直接修改包源码，不需要 install 脚本
- **拼写欺骗（Typosquatting）**：恶意包伪装成流行包名称，诱导手动安装
- **社会工程风险**：`npm approve-scripts --all` 一键批准所有脚本，让安全机制形同虚设

---

## 7. 时间线与行动建议

| 时间 | 事件 | 行动 |
|------|------|------|
| **现在** | npm 11.16.0 已发布 | 升级到 npm@11，开始审查项目 |
| **现在 ~ 7 月** | 缓冲期 | 建立许可名单，提交到 `package.json` |
| **2026 年 7 月** | npm v12 正式发布 | 确保所有 CI/CD 已适配 |
| **v12 之后** | 长期 | 新项目默认安全，旧项目持续维护许可名单 |

### 立即行动清单

1. **升级 npm**：`npm install -g npm@11`
2. **运行一次完整安装**：观察 v12 兼容性警告
3. **审查安装脚本**：`npm approve-scripts --allow-scripts-pending`
4. **建立许可名单**：对每个需要脚本的包做出明确决策
5. **提交到仓库**：将 `package.json` 中的 `allowScripts` 纳入版本控制
6. **清理 Git/远程依赖**：尽可能迁移到 npm 注册表正式包

---

## 8. 总结

npm v12 的这次变更，本质上是 JavaScript 生态对 **"默认不安全"**时代的终结。从"默认信任所有包，出事再修"转向"默认不信任，显式授权可信包"，这是一个迟到但必须发生的范式转移。

对于绝大多数项目而言，实际影响并不大——只需审批 3-5 个真正需要原生编译的依赖包。真正需要投入的是**团队的意识转变**：把安装脚本审批视为代码审查的一部分，把 `allowScripts` 视为和 `dependencies` 同等重要的安全配置。

2026 年 7 月的截止日期并不遥远。现在花一小时完成迁移，远好于在截止日面对 CI 全线崩溃。
