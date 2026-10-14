---
title: 'My Development Environment Setup 2026: Maintaining dotfiles as a Software Project'
published: 2026-09-11
description: From dotfiles repos and bootstrap scripts to modern configurations with starship, mise, direnv, and just — how to turn a new machine into a familiar workspace in 10 minutes.
image: ''
tags: [Development Environment, dotfiles, Shell, Productivity Tools, mise, Neovim]
category: Backend
draft: false
---
Switching computers, reinstalling the system, spinning up a temporary cloud host—every time this happens, the most annoying part isn't installing software, it's "how did I have this configured before?" The only truly hassle-free approach is: **treat your development environment as a software project**—with version control, dependency declarations, a one-click install script, and a README.

This article documents my 2026 configuration approach and the specific files, with a focus on "reproducibility" rather than "piling on plugins."

## 1. General Principles: Configuration Is Code, Not Handicraft

Three rules:

1. **All configuration goes into Git**. Including shell, editor, terminal, and Git's own configuration.
2. **The installation process is scripted**. The first thing to do on a new machine is `git clone` + `./bootstrap.sh`, not trying to recall "what did I install last time."
3. **Platform differences use conditional branches, not multiple copies**. The same `.zshrc` runs on both macOS and Linux, branching via `uname`.

The directory structure looks roughly like this:

```text
~/.dotfiles
├── bootstrap.sh          #One-click install entry point
├── install/
│   ├── brew.sh           #macOS: Homebrew package
│   ├── apt.sh            #Linux: apt package
│   └── links.sh          #Create symlinks
├── shell/
│   ├── .zshrc
│   └── aliases.zsh
├── config/
│   ├── starship.toml
│   ├── mise/config.toml
│   └── nvim/
└── git/.gitconfig
```

For the symlinking step, I recommend **GNU Stow**. It automatically creates links based on directory structure, which is easier to maintain than hand-writing `ln -s`:

```bash
#Link files under shell/ into ~, preserving relative structure
stow --target="$HOME" --verbose shell git
```

If you don't want to introduce an extra dependency, a shell snippet can get the job done too. The key is **idempotency**—repeated execution doesn't cause errors:

```bash
link() {
  local src="$1" dst="$2"
  mkdir -p "$(dirname "$dst")"
  #-n avoids treating existing symlinks as directories, -f overwrites old links
  ln -sfn "$src" "$dst"
}

link "$DOTFILES/shell/.zshrc"  "$HOME/.zshrc"
link "$DOTFILES/git/.gitconfig" "$HOME/.gitconfig"
```

## 2. Shell: zsh + starship, aliases only for high-frequency commands

I no longer use Oh My Zsh—slow startup, black-box plugins. Now it's a minimal `.zshrc` plus Starship for the prompt.

```bash
# ~/.zshrc
autoload -Uz compinit && compinit -C   #-C skips safety checks, starts twice as fast
setopt HIST_IGNORE_ALL_DUPS HIST_VERIFY SHARE_HISTORY
setopt AUTO_CD CORRECT

#History search and fuzzy finding
source /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh
eval "$(starship init zsh)"
eval "$(zoxide init zsh)"
eval "$(mise activate zsh)"
eval "$(direnv hook zsh)"

bindkey '^f' fzf-file-widget   #Ctrl+F fuzzy file finder
```

The advantage of Starship is that **the configuration is pure TOML**, cross-shell compatible, and it naturally displays the language version, Git branch, and elapsed time for the current directory:

```toml
# ~/.config/starship.toml
add_newline = false

[cmd_duration]
min_time = 500          #Only shows after 500ms to reduce noise
show_milliseconds = true

[git_status]
disabled = false

[nodejs]
symbol = " "
format = "via [$symbol($version )]($style)"
```

I only keep aliases for things I actually type every day; the rest rely on completion:

```zsh
alias gs='git status -sb'
alias gp='git push'
alias ll='eza -lah --git'
alias cat='bat --style=plain'
alias lg='lazygit'
```

## 3. Runtime Versions: mise Manages All Languages with One Tool

In the past I used nvm for Node, pyenv for Python, and rbenv for Ruby—three sets of logic, three sets of pitfalls. In 2026 the answer has basically converged on **mise** (formerly rtx), a single tool that manages all language runtimes with a unified configuration format:

```toml
#~/.config/mise/config.toml — global defaults
[tools]
node = "22"
python = "3.13"
go = "1.24"
```

Then put a `.mise.toml` in the project, and entering the directory switches automatically—**no need to manually `nvm use`**:

```toml
#project root/.mise.toml
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
mise install     #Install all versions declared in .mise.toml
mise ls          #Show the currently active version
mise run test    #Run tasks, replacing npm scripts' layer upon layer of forwarding
```

There's a tangible benefit here: **version declarations go into Git**, everyone on the team uses the same Node version, and CI only needs to run `mise install` to reproduce the local environment. "It works on my machine" is cut down by more than half.

## 4. Environment Variables: direnv Auto-Loads per Directory

The biggest problem with `.env` files is that they're easy to accidentally commit. **direnv**'s approach is to automatically inject environment variables per directory, and by default it doesn't trust any new file—you must manually `direnv allow` once:

```bash
#project root/.envrc
export DATABASE_URL="postgres://localhost:5432/dev"
export API_KEY="dev-only-key"

#Reuse .env but keep it git-ignored
dotenv_if_exists .env

#Complex logic can be extracted into scripts
PATH_add ./bin
layout node
```

Key security point: commit `.envrc` into the repository, but **only put non-sensitive development defaults in it**. Real secrets are still read via `dotenv_if_exists` from the ignored `.env`. This way, after `git clone` you don't need to ask anyone for configuration, and secrets won't leak.

## 5. Task Entry Point: just Replaces Scattered Scripts

Every project has a pile of "how to get it running" knowledge scattered across READMEs, `package.json`, and colleagues' heads. **just** gathers them into a single `Justfile`:

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
    @echo "✅ Environment ready, run just dev"
```

The onboarding process for a new colleague goes from "dig through docs + ask people" to two commands:

```bash
git clone git@github.com:team/project.git && cd project
just setup && just dev
```

## 6. Editor: Configuration Should Also Be Versionable

For VS Code I use a dual-track approach of **Settings Sync + in-repo `.vscode/`**: personal preferences go through Sync, **project constraints go into the repo**—formatters, recommended extensions, and debug configurations are all committed to Git to ensure team consistency:

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
//.vscode/extensions.json — prompt to install when opening the project
{
  "recommendations": ["biomejs.biome", "vitest.explorer", "streetsidesoftware.code-spell-checker"]
}
```

For Neovim, it's entirely Lua configuration, following the dotfiles repository:

```lua
-- ~/.config/nvim/lua/options.lua
vim.opt.number = true
vim.opt.relativenumber = true      --Relative line numbers, works with 5j / 3k jumps
vim.opt.undofile = true            --Still undoable after restart
vim.opt.swapfile = false
vim.g.mapleader = " "
```
## 7. bootstrap.sh: The Single Entry Point for a New Machine

Everything above ultimately converges into a single script. Its value lies in being **idempotent**—skip what's already installed, fill in what isn't:

```bash
#!/usr/bin/env bash
set -euo pipefail

DOTFILES="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$(uname -s)" in
  Darwin) brew bundle --file="$DOTFILES/install/Brewfile" ;;
  Linux)  sudo apt-get install -y zsh git curl ripgrep fd-find jq tmux ;;
esac

#Link config files
while IFS= read -r -d '' f; do
  rel="${f#"$DOTFILES"/}"          #Strip the prefix to get the relative path
  link "$f" "$HOME/${rel#*/}"      #Strip the first directory level, then link into $HOME
done < <(find "$DOTFILES/shell" "$DOTFILES/git" -type f -print0)

#Install runtimes and global tools
mise install
curl -sS https://starship.rs/install.sh | sh -s -- --yes

echo "🎉 Done, restart the shell for it to take effect"
```

## Conclusion

The return on investment for configuring your environment is often underestimated. Spend a weekend organizing your dotfiles into a repository, and every time you switch machines, add a server, or onboard a new colleague, you'll be recouping that investment.

If you haven't started yet, the minimum viable starting point is three things: **commit `.zshrc` and `.gitconfig` to a private repository**, **write a `link()` function that only does symlinking**, **use `.mise.toml` to declare project versions**. The rest can grow over time.

## References

- GNU Stow manual: <https://www.gnu.org/software/stow/manual/stow.html>
- mise: <https://mise.jdx.dev/>
- direnv: <https://direnv.net/>
- Starship configuration docs: <https://starship.rs/config/>
- just command runner: <https://github.com/casey/just>
- Homebrew Bundle: <https://docs.brew.sh/Brew-Bundle-and-Brewfile>
- VS Code workspace settings: <https://code.visualstudio.com/docs/getstarted/settings>