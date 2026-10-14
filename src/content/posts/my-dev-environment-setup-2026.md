---
title: 我的开发环境配置 2026：把 dotfiles 当成一个软件项目来维护
published: 2026-09-11
description: '从 dotfiles 仓库、bootstrap 脚本，到 starship、mise、direnv、just 的现代配置，聊聊怎么让一台新机器在 10 分钟内变成熟悉的工作台。'
image: ''
tags: [开发环境, dotfiles, Shell, 效率工具, mise, Neovim]
category: '后端'
draft: false
lang: ''
---

换电脑、重装系统、临时开一台云主机——每次遇到这种事，最烦的不是装软件，而是「我原来是怎么配的来着？」。真正省事的做法只有一个：**把开发环境当成一个软件项目来维护**——有版本控制、有依赖声明、有一键安装脚本、有 README。

这篇文章记录我 2026 年的配置思路和具体文件，重点在「可复现」，而不是「堆插件」。

## 一、总原则：配置是代码，不是手工艺品

三条规则：

1. **所有配置进 Git**。包括 shell、编辑器、终端、Git 自身的配置。
2. **安装过程脚本化**。新机器上第一件事是 `git clone` + `./bootstrap.sh`，而不是回忆「我上次装了什么」。
3. **平台差异用条件分支，不用多份副本**。同一个 `.zshrc` 在 macOS 和 Linux 上跑，靠 `uname` 判断分支。

目录结构大概是这样：

```text
~/.dotfiles
├── bootstrap.sh          # 一键安装入口
├── install/
│   ├── brew.sh           # macOS: Homebrew 包
│   ├── apt.sh            # Linux: apt 包
│   └── links.sh          # 建符号链接
├── shell/
│   ├── .zshrc
│   └── aliases.zsh
├── config/
│   ├── starship.toml
│   ├── mise/config.toml
│   └── nvim/
└── git/.gitconfig
```

软链接这一步我推荐用 **GNU Stow**，它按目录结构自动建链接，比手写 `ln -s` 好维护：

```bash
# 把 shell/ 下的文件链接到 ~ 下，保持相对结构
stow --target="$HOME" --verbose shell git
```

如果不想引入额外依赖，用一段 shell 也能搞定，关键是**幂等**——重复执行不出错：

```bash
link() {
  local src="$1" dst="$2"
  mkdir -p "$(dirname "$dst")"
  # -n 避免把已有软链接当成目录，-f 覆盖旧链接
  ln -sfn "$src" "$dst"
}

link "$DOTFILES/shell/.zshrc"  "$HOME/.zshrc"
link "$DOTFILES/git/.gitconfig" "$HOME/.gitconfig"
```

## 二、Shell：zsh + starship，别名只留高频的

我不再用 Oh My Zsh——启动慢、插件黑盒。现在是一个极简 `.zshrc` 加 Starship 做提示符。

```bash
# ~/.zshrc
autoload -Uz compinit && compinit -C   # -C 跳过安全检查，启动快一倍
setopt HIST_IGNORE_ALL_DUPS HIST_VERIFY SHARE_HISTORY
setopt AUTO_CD CORRECT

# 历史搜索与模糊查找
source /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh
eval "$(starship init zsh)"
eval "$(zoxide init zsh)"
eval "$(mise activate zsh)"
eval "$(direnv hook zsh)"

bindkey '^f' fzf-file-widget   # Ctrl+F 模糊找文件
```

Starship 的好处是**配置是纯 TOML**，跨 shell 通用，而且天然会显示当前目录的语言版本、Git 分支和耗时：

```toml
# ~/.config/starship.toml
add_newline = false

[cmd_duration]
min_time = 500          # 超过 500ms 才显示，减少噪音
show_milliseconds = true

[git_status]
disabled = false

[nodejs]
symbol = " "
format = "via [$symbol($version )]($style)"
```

别名我只留真正每天敲的，其余靠补全：

```zsh
alias gs='git status -sb'
alias gp='git push'
alias ll='eza -lah --git'
alias cat='bat --style=plain'
alias lg='lazygit'
```

## 三、运行时版本：mise 一个工具管所有语言

过去我用 nvm 管 Node、pyenv 管 Python、rbenv 管 Ruby，三套逻辑三套坑。2026 年的答案基本收敛到 **mise**（前身 rtx），一个工具统管所有语言运行时，配置是统一格式：

```toml
# ~/.config/mise/config.toml —— 全局默认
[tools]
node = "22"
python = "3.13"
go = "1.24"
```

项目里再放一个 `.mise.toml`，进入目录自动切换，**不需要手动 `nvm use`**：

```toml
# 项目根目录/.mise.toml
[tools]
node = "20.19.0"
pnpm = "10"

[env]
NODE_ENV = "development"

[tasks.dev]
run = "pnpm dev"

[tasks.test]
depends = ["lint"]
run = "pnpm vitest run"
```

```bash
mise install     # 安装 .mise.toml 里声明的所有版本
mise ls          # 查看当前生效的版本
mise run test    # 跑任务，替代 npm scripts 的层层转发
```

这里有个实实在在的收益：**版本声明进了 Git**，团队里所有人的 Node 版本一致，CI 里只要跑一句 `mise install` 就能复现本地环境，"在我机器上是好的" 少了一大半。

## 四、环境变量：direnv 按目录自动加载

`.env` 文件最大的问题是容易被误提交。**direnv** 的思路是按目录自动注入环境变量，并且默认不信任任何新文件，必须手动 `direnv allow` 一次：

```bash
# 项目根目录/.envrc
export DATABASE_URL="postgres://localhost:5432/dev"
export API_KEY="dev-only-key"

# 复用 .env 但保持 git 忽略
dotenv_if_exists .env

# 复杂逻辑可以抽成脚本
PATH_add ./bin
layout node
```

关键安全点：把 `.envrc` 提交进仓库，但**只放非敏感的开发默认值**，真实密钥仍然通过 `dotenv_if_exists` 从被忽略的 `.env` 读取。这样 `git clone` 之后不需要问任何人要配置，也不会泄露密钥。

## 五、任务入口：just 替代散落的脚本

每个项目都有一堆「怎么跑起来」的知识，散在 README、`package.json`、同事脑子里。**just** 用一个 `Justfile` 把它们收拢：

```makefile
# Justfile
set dotenv-load

default:
    @just --list

dev:
    mise run dev

test *args:
    pnpm vitest run {{args}}

setup:
    mise install
    pnpm install --frozen-lockfile
    cp -n .env.example .env || true
    @echo "✅ 环境就绪，运行 just dev"
```

新同事入职的流程从「翻文档 + 问人」变成两条命令：

```bash
git clone git@github.com:team/project.git && cd project
just setup && just dev
```

## 六、编辑器：配置也要能版本化

VS Code 我用 **Settings Sync + 仓库内 `.vscode/`** 双轨：个人偏好走 Sync，**项目约束走仓库**——格式化器、推荐插件、调试配置都提交进 Git，保证团队一致：

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": { "source.fixAll.biome": "explicit" },
  "[typescript]": { "editor.defaultFormatter": "biomejs.biome" },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

```json
// .vscode/extensions.json —— 打开项目时提示安装
{
  "recommendations": ["biomejs.biome", "vitest.explorer", "streetsidesoftware.code-spell-checker"]
}
```

Neovim 这边则完全走 Lua 配置，跟着 dotfiles 仓库走：

```lua
-- ~/.config/nvim/lua/options.lua
vim.opt.number = true
vim.opt.relativenumber = true      -- 相对行号，配合 5j / 3k 跳转
vim.opt.undofile = true            -- 重启后仍能撤销
vim.opt.swapfile = false
vim.g.mapleader = " "
```

## 七、bootstrap.sh：新机器的唯一入口

所有上面的东西，最后收敛成一个脚本。它的价值在于**可重复执行**——已经装过的跳过，没装的补上：

```bash
#!/usr/bin/env bash
set -euo pipefail

DOTFILES="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$(uname -s)" in
  Darwin) brew bundle --file="$DOTFILES/install/Brewfile" ;;
  Linux)  sudo apt-get install -y zsh git curl ripgrep fd-find jq tmux ;;
esac

# 链接配置文件
while IFS= read -r -d '' f; do
  rel="${f#"$DOTFILES"/}"          # 去掉前缀，得到相对路径
  link "$f" "$HOME/${rel#*/}"      # 剥掉第一层目录名再链接到 $HOME
done < <(find "$DOTFILES/shell" "$DOTFILES/git" -type f -print0)

# 安装运行时与全局工具
mise install
curl -sS https://starship.rs/install.sh | sh -s -- --yes

echo "🎉 完成，重启 shell 生效"
```

## 结语

配置环境的投入产出比，往往被低估。花一个周末把 dotfiles 整理成仓库，此后每换一次机器、每加一台服务器、每带一个新同事，都在回收这笔投资。

如果你现在还没开始，最小可行的起点是三件事：**把 `.zshrc` 和 `.gitconfig` 提交到一个私有仓库**、**写一个只做符号链接的 `link()` 函数**、**用 `.mise.toml` 声明项目版本**。剩下的可以慢慢长。

## 参考来源

- GNU Stow 手册：<https://www.gnu.org/software/stow/manual/stow.html>
- mise：<https://mise.jdx.dev/>
- direnv：<https://direnv.net/>
- Starship 配置文档：<https://starship.rs/config/>
- just 命令运行器：<https://github.com/casey/just>
- Homebrew Bundle：<https://docs.brew.sh/Brew-Bundle-and-Brewfile>
- VS Code 工作区设置：<https://code.visualstudio.com/docs/getstarted/settings>
