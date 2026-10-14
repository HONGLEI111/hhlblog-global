---
title: 'Command Line Tips: 20 Commands to Boost Terminal Efficiency'
published: 2026-08-28
description: From command history and fuzzy finding to JSON processing, parallel execution, and background tasks, here are 20 commands and tools that can immediately improve your terminal workflow, with copy-paste-ready configuration snippets.
image: ''
tags: [Command Line, Shell, Productivity Tools, fzf, ripgrep, jq]
category: Backend
draft: false
---
Graphical interfaces keep getting fancier, but the truly high-frequency operations are often still faster with a few lines in the terminal. The problem is: many people have used Shell for ten years and still stop at the four commands `cd`, `ls`, `grep`, `cat`, spending a few extra minutes every day on repetitive work.

This article does not aim to be a "complete command reference"; it only picks 20 commands and tools that can **take effect immediately**, grouped by scenario, each with copy-paste-ready usage. At the end there is a configuration snippet you can paste into `.zshrc` or `.bashrc` and use right away.

## 1. Command history: stop retyping everything

**1. `!!` — repeat the previous command**

You finish typing `apt install` and only then realize you forgot to add `sudo`? No need to retype:

```bash
apt install ripgrep
sudo !!          #Equivalent to sudo apt install ripgrep
```

**2. `!$` — the last argument of the previous command**

`mkdir` created a very deep directory, and next you need to `cd` into it:

```bash
mkdir -p projects/blog/src/components
cd !$            #Equivalent to cd projects/blog/src/components
```

**3. `Ctrl+R` reverse search**

At the prompt, press `Ctrl+R` to match history commands in real time as you type. The experience is even better after installing fzf—it turns your decades of command history into a fuzzy-searchable list (see item 7 below).

**4. `cd -` and the directory stack**

```bash
cd /etc/nginx
cd /var/www
cd -             #Back to /etc/nginx
```

When you need to switch frequently between two directories, use `pushd` / `popd` to maintain a directory stack:

```bash
pushd /etc/nginx     #Push and switch
pushd /var/log
popd                 #Pop back to /etc/nginx
```

## 2. Locating: modern alternatives faster than find/grep

**5. `rg` (ripgrep) — full-text search**

A modern replacement for `grep -r`, skipping `.gitignore` and binary files by default, and extremely fast:

```bash
rg "useState" src/              #Recursive search
rg -l "TODO" .                  #List filenames only
rg --type ts "fetch\("          #Limit by file type
```

**6. `fd` — find files**

Can't remember that whole `-name` `-type` syntax from `find`? `fd` works more intuitively:

```bash
fd config.yaml          #Find by name
fd -e ts                #Find all .ts files
fd '^App' src           #Regex match
```

**7. `fzf` — fuzzy finder**

fzf is the kind of tool that, once installed, you can't go back from. Used alone, it can fuzzy-select files; paired with `Ctrl+T` (paste the selected file path) and `Ctrl+R` (fuzzy-search history commands), it becomes even more practical:

```bash
#cd into the directory selected in fzf
cd "$(find . -type d | fzf)"
```

## 3. Data processing: JSON and parallelism

**8. `jq` — process JSON on the command line**

No need to copy that huge blob of JSON returned by curl into a browser just to look at it:

```bash
curl -s https://api.github.com/repos/BurntSushi/ripgrep | jq '.stargazers_count'
jq '.items[] | {name: .name, stars: .stargazers_count}' repos.json
```

**9. `xargs -P` — parallel execution**

If you have a batch of images to compress or a batch of repositories to clone, running them sequentially is too slow. `-P` specifies the level of parallelism:

```bash
cat urls.txt | xargs -P 8 -I {} curl -O {}
```

**10. `awk` — quickly extract values by column**

For logs or the output of `ps` and `docker ps`, you don't need to write a script to grab a column:

```bash
ps aux | awk '{print $2, $11}'          #PID and command
docker ps | awk 'NR>1 {print $1}'       #Skip the header, get the container ID
```

**11. `sed -i` — batch replacement**

Replace an old API domain uniformly across a batch of files:

```bash
sed -i 's/api.example.com/api.newdomain.com/g' src/**/*.ts
```

(Before replacing, it is recommended to run it once in `-i` first to see whether the output matches expectations.)

## 4. Make output friendlier

**12. `bat` — cat with syntax highlighting**

An enhanced version of `cat`: line numbers, syntax highlighting, git integration, and automatic paging. Once installed, you can use `alias cat=bat` directly.

**13. `tldr` — a more practical manual than man**

`man` often runs to hundreds of lines, while `tldr` gives you only the most common usages:

```bash
tldr tar
tldr ffmpeg
```

**14. Switch `git diff` to delta**

Native diff is easy to misread in long files. `delta` greatly improves diff readability with syntax highlighting + side-by-side comparison:

```bash
#Configure in ~/.gitconfig
[core]
    pager = delta
```

**15. `gh` — GitHub CLI**

Open PRs, view issues, and run workflows directly in the terminal without switching to the browser:

```bash
gh pr create --title "feat: xxx"
gh pr status
gh run watch
```

## 5. Background tasks and monitoring

**16. `&` + `disown` — safely send to the background**

Don't want a task interrupted when you close the terminal? `nohup` is the most classic, and `disown` is lighter:

```bash
./long-running-job &
disown          #Detach it from the current shell so closing the terminal doesn't affect it
```

**17. `watch` — repeated execution on a schedule**

Wait for a service to come up or watch a log file's size, refreshing automatically every 2 seconds:

```bash
watch -n 2 'kubectl get pods'
watch -n 5 'du -sh build/'
```

**18. `htop` / `btm` — interactive monitoring**

The upgraded version of `top`, `htop`, supports the mouse and scrolling; if you want to view CPU, memory, disk, and network at the same time, the Rust-written `btm` (bottom) covers it all in one interface.

**19. `ncdu` — visualize disk usage**

When the disk is full, `du -sh *` is too slow to dig through layer by layer. `ncdu` lets you interactively browse directory sizes, using the arrow keys to go straight to the culprit.

**20. `ss` + `lsof` — port and file troubleshooting**

```bash
ss -tlnp                      #Who is listening on which ports
lsof -i :8080                 #Who is using port 8080
lsof -p 1234                  #Which files a process has open
```

## A directly pasteable configuration snippet

```bash
#~/.zshrc or ~/.bashrc
alias cat=bat
alias du=ncdu
alias grep=rg

export FZF_DEFAULT_COMMAND='fd --type f --hidden --follow --exclude .git'
export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"

#Enhance Ctrl+R history search with fzf
[ -f /usr/share/doc/fzf/examples/key-bindings.zsh ] && \
  source /usr/share/doc/fzf/examples/key-bindings.zsh

#Common git aliases
alias gco='git checkout'
alias gst='git status'
alias glog='git log --oneline --graph --decorate'
```

## Conclusion

What these commands have in common is: **reducing cognitive load**. `fd` saves the cost of remembering `find` syntax, `jq` saves the cost of scanning JSON by eye, `tldr` saves the cost of digging through man pages, and `!!` saves the cost of retyping. Individually they seem unremarkable, but together they can save more than ten minutes a day—and coding efficiency is often won in these unremarkable places.

You don't have to install them all at once. Start with three from your most painful scenarios: if you often dig through command history, get fzf; if you often search code, get ripgrep; if you often inspect JSON, get jq. A week later, you'll go looking for more yourself.

## References

- ripgrep: <https://github.com/BurntSushi/ripgrep>
- fzf: <https://github.com/junegunn/fzf>
- jq official manual: <https://jqlang.github.io/jq/manual/>
- tldr: <https://tldr.sh/>
- zoxide (smart cd): <https://github.com/ajeetdsouza/zoxide>
- GitHub CLI: <https://cli.github.com/>