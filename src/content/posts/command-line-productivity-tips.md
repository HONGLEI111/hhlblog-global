---
title: 命令行技巧：提升终端操作效率的 20 个命令
published: 2026-08-28
description: '从历史命令、模糊查找、JSON 处理到并行执行与后台任务，梳理 20 个能立刻提升终端操作效率的命令与工具，附可直接复制的配置片段。'
image: ''
tags: [命令行, Shell, 效率工具, fzf, ripgrep, jq]
category: '后端'
draft: false
lang: ''
---

图形界面越做越花哨，但真正高频的操作，往往还是终端里那几行字快。问题是：很多人用了十年 Shell，还停留在 `cd`、`ls`、`grep`、`cat` 这四个命令上，每天都为重复劳动多花几分钟。

这篇文章不追求「命令大全」，只挑 20 个能**立刻见效**的命令和工具，按场景分组，每个都附可直接复制的用法。文末给一份配置片段，粘进 `.zshrc` 或 `.bashrc` 就能用。

## 一、历史命令：别再重新敲一遍

**1. `!!` —— 重复上一条命令**

敲完 `apt install` 才发现忘加 `sudo`？不用重敲：

```bash
apt install ripgrep
sudo !!          # 等价于 sudo apt install ripgrep
```

**2. `!$` —— 上一条命令的最后一个参数**

`mkdir` 建了个很深的目录，接着要 `cd` 进去：

```bash
mkdir -p projects/blog/src/components
cd !$            # 等价于 cd projects/blog/src/components
```

**3. `Ctrl+R` 反向搜索**

在提示符下按 `Ctrl+R`，边输入边实时匹配历史命令。装 fzf 后体验更佳——它能把你几十年的历史命令变成模糊搜索列表（见下文第 7 条）。

**4. `cd -` 与目录栈**

```bash
cd /etc/nginx
cd /var/www
cd -             # 回到 /etc/nginx
```

需要频繁在两个目录间切换时，用 `pushd` / `popd` 维护一个目录栈：

```bash
pushd /etc/nginx     # 压栈并切换
pushd /var/log
popd                 # 弹回 /etc/nginx
```

## 二、定位：比 find/grep 更快的现代替代

**5. `rg`（ripgrep）—— 全文搜索**

`grep -r` 的现代化替代，默认跳过 `.gitignore`、二进制文件，速度极快：

```bash
rg "useState" src/              # 递归搜索
rg -l "TODO" .                  # 只列文件名
rg --type ts "fetch\("          # 限定文件类型
```

**6. `fd` —— 查找文件**

`find` 那套 `-name` `-type` 语法记不住？`fd` 按直觉来：

```bash
fd config.yaml          # 按名字找
fd -e ts                # 找所有 .ts 文件
fd '^App' src           # 正则匹配
```

**7. `fzf` —— 模糊查找器**

fzf 是那种「装上就回不去」的工具。单独用它能模糊选文件，配合 `Ctrl+T`（粘贴选中文件路径）、`Ctrl+R`（模糊搜历史命令）更实用：

```bash
# 在 fzf 选出的目录里 cd
cd "$(find . -type d | fzf)"
```

## 三、数据处理：JSON 与并行

**8. `jq` —— 命令行处理 JSON**

curl 返回的一大坨 JSON，不用再复制到浏览器里看：

```bash
curl -s https://api.github.com/repos/BurntSushi/ripgrep | jq '.stargazers_count'
jq '.items[] | {name: .name, stars: .stargazers_count}' repos.json
```

**9. `xargs -P` —— 并行执行**

有一批图片要压缩、一批仓库要 clone，顺序跑太慢。`-P` 指定并行数：

```bash
cat urls.txt | xargs -P 8 -I {} curl -O {}
```

**10. `awk` —— 快速按列取值**

日志、`ps`、`docker ps` 的输出，取某一列不用写脚本：

```bash
ps aux | awk '{print $2, $11}'          # PID 和命令
docker ps | awk 'NR>1 {print $1}'       # 跳过表头，取容器 ID
```

**11. `sed -i` —— 批量替换**

把一批文件里的旧 API 域名统一换掉：

```bash
sed -i 's/api.example.com/api.newdomain.com/g' src/**/*.ts
```

（替换前建议先去 `-i` 跑一遍，看看输出是否符合预期。）

## 四、让输出更友好

**12. `bat` —— 带语法高亮的 cat**

`cat` 的增强版：行号、语法高亮、git 集成、自动分页。装好后可以直接 `alias cat=bat`。

**13. `tldr` —— 比 man 更实用的手册**

`man` 动辄几百行，`tldr` 只给你最常见的几种用法：

```bash
tldr tar
tldr ffmpeg
```

**14. `git diff` 换用 delta**

原生的 diff 在长文件里容易看花眼。`delta` 用语法高亮 + 侧边对比让 diff 可读性大增：

```bash
# 在 ~/.gitconfig 中配置
[core]
    pager = delta
```

**15. `gh` —— GitHub CLI**

在终端里直接开 PR、看 issue、跑 workflow，不用切浏览器：

```bash
gh pr create --title "feat: xxx"
gh pr status
gh run watch
```

## 五、后台任务与监控

**16. `&` + `disown` —— 安全地放到后台**

关掉终端不想中断任务？`nohup` 最经典，`disown` 更轻量：

```bash
./long-running-job &
disown          # 让它脱离当前 shell，关终端不受影响
```

**17. `watch` —— 定时重复执行**

等一个服务起来、观察日志文件大小，每 2 秒自动刷新：

```bash
watch -n 2 'kubectl get pods'
watch -n 5 'du -sh build/'
```

**18. `htop` / `btm` —— 交互式监控**

`top` 的升级版 `htop` 支持鼠标和滚动；想同时看 CPU、内存、磁盘、网络，用 Rust 写的 `btm`（bottom）一个界面全包。

**19. `ncdu` —— 磁盘占用可视化**

磁盘满了，`du -sh *` 一层层翻太慢。`ncdu` 交互式浏览目录大小，方向键直达元凶。

**20. `ss` + `lsof` —— 端口与文件排查**

```bash
ss -tlnp                      # 谁在监听哪些端口
lsof -i :8080                 # 谁占用了 8080
lsof -p 1234                  # 某个进程打开了哪些文件
```

## 一个可直接粘贴的配置片段

```bash
# ~/.zshrc 或 ~/.bashrc
alias cat=bat
alias du=ncdu
alias grep=rg

export FZF_DEFAULT_COMMAND='fd --type f --hidden --follow --exclude .git'
export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"

# 用 fzf 增强 Ctrl+R 历史搜索
[ -f /usr/share/doc/fzf/examples/key-bindings.zsh ] && \
  source /usr/share/doc/fzf/examples/key-bindings.zsh

# 常用 git 简写
alias gco='git checkout'
alias gst='git status'
alias glog='git log --oneline --graph --decorate'
```

## 结语

这些命令的共同点是：**减少认知负担**。`fd` 省去记 `find` 语法的成本，`jq` 省去肉眼扫 JSON 的成本，`tldr` 省去翻 man 的成本，`!!` 省去重敲的成本。它们单看都不起眼，叠加起来每天能省十几分钟——而写代码的效率，很多时候就赢在这些不起眼的地方。

不必一次全装。先从最痛的场景挑三个：常翻历史命令就上 fzf，常搜代码就上 ripgrep，常看 JSON 就上 jq，一周后你会自己去找更多。

## 参考来源

- ripgrep：<https://github.com/BurntSushi/ripgrep>
- fzf：<https://github.com/junegunn/fzf>
- jq 官方手册：<https://jqlang.github.io/jq/manual/>
- tldr：<https://tldr.sh/>
- zoxide（智能 cd）：<https://github.com/ajeetdsouza/zoxide>
- GitHub CLI：<https://cli.github.com/>
