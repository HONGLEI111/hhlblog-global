---
title: 摸鱼的艺术：办公室生存指南
published: 2026-10-10
description: '鼠标抖动器、老板键、「我在跑构建」——摸鱼段子人人会讲，但摸鱼其实分两种：一种靠伪造活动信号，一种靠把等待时间自动化掉。它们在你屏幕上的样子几乎一模一样，区别在你离开之后留下了什么。'
image: ''
tags: [程序员笑话, 摸鱼, 自动化, 效率, 工程文化]
category: '其他'
draft: false
lang: ''
---

09:58，端着咖啡回到工位。桌面上是一个转圈的进度条，和一份还没写完的周报。

10:00 站会。10:07 结束，你说「我继续推进一下」。

10:08 编译开始。10:19 编译还没结束。你已经刷完了三个群、看完一条热搜，并在心里给自己记了一笔「等下补回来」。

这一天里最高频的一句谎话不是「马上就好」，而是 **「我在跑构建」**——它最大的好处是：它大概率是真的。

## 一、摸鱼博物馆

### 鼠标抖动器（Mouse Jiggler）

摸鱼界最接近硬件创业的产品：几十块钱一个小玩意，插上之后每隔几十秒把指针挪一个像素，让屏幕永远不锁、电脑永远不休眠。有些型号在电商页面上直接标着「undetectable」。

它伪造的不是工作，而是「正在工作」这个信号。而 2024 年 6 月，富国银行（Wells Fargo）因为这件事解雇了十多名员工，向 FINRA 报备的措辞是「模拟键盘活动，制造正在进行工作的印象」。这是本文后面要展开的那条分界线——**同样一个抖动器，它是段子还是指控，取决于公司怎么看你**。

### 老板键

`Alt+Tab` 是最古老的一键换装。进阶版本包括：

- `Ctrl+W` 一键销毁证据（代价是不可逆，别对着生产环境的标签页按）；
- 虚拟桌面：一个写代码，一个放文档，还有一个备用；
- 终端分屏：老板走过来时，屏幕上最好看的永远是 `tail -f` 的日志。

### 「我在跑构建」

编译、跑测试、装依赖、等 CI——这些是**合法的休息许可证**，因为它们真的需要时间，而且真的不需要你的人。

这是摸鱼里唯一理直气壮的一类，也是唯一值得认真优化的一类。区别很重要：前两类摸鱼的产出是一个「看起来很忙」的状态，这一类的产出是一段代码。

### 反向摸鱼：监控软件

与抖动器对立的一侧是 bossware（也叫 tattleware）：定时截屏、键盘计数、鼠标轨迹、摄像头随机拍照。这个段子最好笑的地方是双方都在伪造信号——员工伪造「在工作」，公司伪造「我们在衡量产出」。两边都不太相信对方，两边也都不太相信自己伪造的那个指标。

## 二、把段子拆开：摸鱼有两种

- **欺骗型摸鱼**：把「活动信号」和「工作发生」解耦，制造前者，不做后者。它换来的时间是**借来的**，债权人是雇主，还款日期不确定。
- **等待型摸鱼**：你的时间被卡在某个真实发生的过程中——编译、装依赖、等 CI、等部署、等同事 review。这段时间不是偷来的，它是**还没有被工程化掉**的。

两者在屏幕上的表现几乎完全相同（人都不在敲键盘）。区别只在于你回来之后手上多了什么：

| | 欺骗型 | 等待型 |
|---|---|---|
| 时间从哪来 | 伪造活动信号 | 消掉真实的等待 |
| 留下的东西 | 一个「看起来很忙」的状态 | 一段脚本、一条更短的流水线 |
| 被发现时 | 是一项指控 | 是一次优化 |
| 可持续性 | 到期要还 | 每跑一次再赚一次 |

所以真正值得研究的是第二类。下面三招都不新，但它们的共同点是：**你不在的时候，事情真的在往前跑。**

## 三、把「等」消掉：三个层级

### 第 0 层：先给等待计时

不要凭感觉，凭感觉的话你会高估写代码的时间、低估等待的时间。给自己的命令加个秒表：

```bash
# ~/.bashrc —— 用法: tt pnpm build
tt() {
  /usr/bin/time -f "%e\t%C" -a -o "$HOME/.tt.log" "$@"
}
```

```bash
# 一周后：等待时间排行榜
sort -k1,1nr ~/.tt.log | head -20
```

GNU `time` 才有 `-o`；macOS 上是 BSD `time`，得先 `brew install gnu-time` 再用 `gtime`。这个排行榜通常比任何效率方法学都更能说服人：排在前面的一定是装依赖、跑构建、等 CI 这类**你从头到尾没参与过**的动作。

### 第 1 层：把 N 条命令压成 1 条

每天开工前那五条命令，是把「我准备好了」翻译成了五次等待。写成一个脚本：

```bash
#!/usr/bin/env bash
# scripts/dev.sh —— 一条命令，一个前台进程，Ctrl-C 全部退出
set -euo pipefail

# 装依赖和拉起数据库本来就不用排队，让它们同时开始
pnpm install --frozen-lockfile &
INSTALL=$!
docker compose up -d db &
DB=$!

wait "$INSTALL" "$DB"

# 收尾：脚本退出时把数据库停掉，不留孤儿进程
trap 'docker compose stop db >/dev/null 2>&1 || true' EXIT

pnpm db:migrate
exec pnpm dev
```

这段脚本真正省下的不是那十几秒，是**你要记住的顺序**。摸鱼守恒定律说：你今天手工敲的每一条命令，都会在明天以「我怎么又忘了」的形式回来。

### 第 2 层：让机器等你，而不是你等机器

CI 是最典型的「人不在场也要它跑得快」的场景。GitHub Actions 里缓存依赖，官方推荐的写法是直接交给 `setup-*` 系列动作：

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: pnpm        # key 由它自己算，命中/存档都不用手写

# 需要缓存依赖之外的东西（比如构建产物）时再显式用缓存：
- uses: actions/cache@v4
  with:
    path: .next/cache
    key: ${{ runner.os }}-next-${{ hashFiles('pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-next-
```

`key` 精确命中就是 cache hit；没命中时按 `restore-keys` 做前缀匹配，捞一份「旧但还能用」的缓存回来，任务跑完再自动存一份新的。这套机制的价值不在于省了几分钟 CPU，而在于它把「第一次很慢」变成了一次性成本。

然后是抖动器那个梗的**正当版本**——同样是「让机器知道你还活着」，但对象是机器而不是人：

```bash
# Linux：跑长任务时阻止空闲休眠，任务结束自动解除
systemd-inhibit --what=idle --why="running tests" pnpm test

# macOS
caffeinate -i pnpm test
```

鼠标抖动器是为了让别人以为你在工作；`systemd-inhibit` 是为了让机器知道你还在工作。**判据很简单：你骗的是机器，还是人。**

### 第 3 层：把手工步骤塞进 hook

凡是「等会儿再格式化」的事，都会变成「下个季度统一格式化，一次改三千个文件」。把它挪到提交前：

```bash
# .git/hooks/pre-commit（记得 chmod +x）
#!/usr/bin/env sh
pnpm biome check --staged --write || exit 1
git add -u
```

团队协作里更常见的是 `lint-staged` + `husky` 这套组合，作用一样：**把「我记得要跑一下」变成「不可能忘记」。** 顺带一提，这份 hook 未来会拦住的最大一笔债务，是你自己欠的。

## 四、摸鱼的质量分级

休息不是都等价的。Gloria Mark 团队在 CHI 2008 那篇《The Cost of Interrupted Work: More Speed and Stress》里的发现有点反直觉：被打断之后，人们确实**更快**把活干完了，但同时付出了更高的压力和努力成本——快是用紧绷换来的。她团队后续的实地观察研究里，那个被反复引用的数字是「被打断后平均需要 23 分 15 秒才回到原任务」，而人们平均每 3 分 5 秒就切换一次活动，其中大约一半的中断是**自己造成的**。

Sio 与 Ormerod 2009 年的元分析则把「离开一下」这件事讲得更细：孵化（incubation）确实能提升问题解决率，发散性任务比语言/视觉洞察任务受益更大；准备期越长，效果越明显。但有两个关键调节变量：

1. 孵化期里做**高认知负荷**的任务，会显著削弱孵化效应；
2. 对语言类洞察问题，**低认知负荷的填充活动**效果甚至好于纯粹休息。

把这两条翻译成办公室语言，就得到一份很实用的摸鱼分级：

- **高质量摸鱼**：低认知负荷 + 离开屏幕。散步、倒水、洗杯子、看窗外、跟人聊点别的。问题在后台自己整理。
- **低质量摸鱼**：高认知负荷 + 仍然盯着同一块屏幕。刷短视频、看热搜、切进一个更刺激的信息流。十分钟之后，你既没有休息，又多欠了一次中断。

同样是十分钟，一个在替你消化问题，一个在替你制造麻烦。

至于「工作会自己膨胀到填满所有可用时间」（Parkinson's law），它是一句对**流程**的提醒，不是对**人**的鞭策：留白之所以安全，前提是交付边界清清楚楚。边界模糊的时候，留白会被填满，填满它的通常不是工作，而是焦虑。

## 五、摸鱼自检清单

下班前问自己四句：

- [ ] 过去这一周，我花在「等」上的时间有多少？我量过吗？
- [ ] 我今天摸鱼的时间是**挣来的**（自动化换的）还是**借来的**（伪装换的）？
- [ ] 我休息的时候，屏幕是亮的还是暗的？
- [ ] 如果同事照着我的脚本跑一遍，他会更省时间，还是更麻烦？

## 写在最后

抖动器会继续卖，段子会继续讲。但心里要清楚：**摸鱼的最高境界不是让别人以为你在工作，而是你不在的时候，工作照样在推进。**

鼠标抖动器的问题不在于它花了十块钱，而在于它只伪造了「有人在推进」，没有任何东西真的被推进。而一套好的脚本恰好相反：你不在的那二十分钟里，依赖装完了、缓存命中了、迁移做完了、测试跑完了——**你的不在场，是被流水线背书的。**

所以下次有人问你「刚才干嘛去了」，最好的回答不是「我在跑构建」，而是：

> 我在跑构建。而且它从 47 秒降到了 4 秒。

## 参考来源

- [US bank Wells Fargo fires employees for 'simulating' being at their keyboards — The Guardian](https://www.theguardian.com/business/article/2024/jun/14/us-bank-wells-fargo-fires-employees-keyboards)
- [Wells Fargo fires workers over fake keyboard activity — BBC News](https://www.bbc.com/news/articles/cjll01220yeo)
- [The Cost of Interrupted Work: More Speed and Stress — Mark, Gudith & Klocke, CHI '08](https://doi.org/10.1145/1357054.1357072)
- [Does incubation enhance problem solving? A meta-analytic review — Sio & Ormerod, Psychological Bulletin, 2009](https://psycnet.apa.org/doiLanding?doi=10.1037%2Fa0014212)
- [Dependency caching reference — GitHub Docs](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [Parkinson's law — Wikipedia](https://en.wikipedia.org/wiki/Parkinson%27s_law)

延伸阅读：本博客里还有几篇讲「时间和流程」的文章——[《命令行技巧：提升终端操作效率的 20 个命令》](/posts/command-line-productivity-tips)、[《程序员估算时间的经典笑话》](/posts/estimating-time-jokes)、以及[《周五上线魔咒：部署日的玄学与事故》](/posts/friday-deploy-curse)。
