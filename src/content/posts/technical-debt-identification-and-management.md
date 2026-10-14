---
title: 技术债的识别与管理：别再用「代码烂」当借口
published: 2026-10-02
description: '技术债的原意是「借款 + 利息」，不是「代码烂」。本文用 Cunningham 的原话和 Fowler 的四象限理清概念，给出一份可直接运行的 git 热点分析脚本，用它在本站真实仓库里找出「改动最频繁 × 最绕」的文件，再谈怎么给债务定价、以及什么时候该还、什么时候该认。'
image: ''
tags: [技术债, 重构, 代码质量, Git, 工程实践]
category: '后端'
draft: false
lang: ''
---

## 债务的本意不是「代码烂」

1992 年，Ward Cunningham 在 OOPSLA 的经验报告里第一次写下技术债这个比喻。原话是这样：

> Shipping first time code is like going into debt. A little debt speeds development so long as it is paid back promptly with a rewrite. … The danger occurs when the debt is not repaid. Every minute spent on not-quite-right code counts as interest on that debt.

请留意两个关键词：**借款**——一时的权宜之计换来的速度；**利息**——每一分钟花在「不太对」的代码上的额外开销。

三十多年后，这个词被用成了「代码写得烂」的同义词。但这两件事完全不同：烂代码是**已经产生的利息**，而债务是**当初那笔借款**。混为一谈的后果很实际——看到烂代码，人的本能反应是重构；而债务管理的第一问应该是：

**这笔债的利息有多高？**

利息低到可以忽略的债，最好的处理方式就是**不处理**。一个一万行的老模块，五年没人碰过、也永远不会再碰，它再丑也不产生利息。反过来，一个两百行、每周都被改三次的文件，哪怕看起来很体面，也可能正在按复利收你的钱。

这篇文章讲两件事：怎么找到真正在付息的那部分代码，以及找到之后怎么还。

## 一、先分类：同样叫债务，性质完全不同

Martin Fowler 在 2009 年提出的[技术债四象限](https://martinfowler.com/bliki/TechnicalDebtQuadrant.html)至今仍是我见过最好用的分类法。它只问两个问题：这笔债是**有意**借的吗？借的时候**草率**吗？

|  | 草率 Reckless | 审慎 Prudent |
| --- | --- | --- |
| **有意 Deliberate** | 「先上线，设计以后再说」——知道自己在违反什么，也知道后果，但没想清楚代价 | 「必须现在发版，后果我们自己扛」——清楚代价、有还款计划，也通知了相关的人 |
| **无意 Inadvertent** | 「分层是什么？」——压根不知道什么是对的，于是攒出一团乱麻 | 「现在才明白当初该怎么写」——即便优秀的团队也躲不掉，这是学习的必然副产品 |

这张表最有用的一点，是它把「**知情**」和「**草率**」分开了。很多团队一说起技术债就充满道德愧疚，仿佛借债等于犯错。但右下角那格——审慎且无意——是任何一个正常演进的系统都必然产生的：你在写代码的过程中才逐渐理解问题域，一年后才想明白最佳设计是正常的。Fowler 的原话是，这种债「应该被预期到，而不是被指责」。

真正需要警惕的是左下角：不知道什么是对的做法，于是每天都在借新债，而且没人记账。这一格不靠重构解决，靠的是补齐工程常识。

**分类的实际用途是分配不同的处理方式**：

- 有意 + 审慎 → 记账，排进计划，到期偿还；
- 有意 + 草率 → 追问「当时真的没时间吗」，多数情况下答案是「其实有」；
- 无意 + 审慎 → 正常现象，跟着重构节奏走；
- 无意 + 草率 → 培训和评审机制的问题，不是债务问题。

## 二、再定位：不是所有的债都值得还

假设你现在有一千个文件。理论上「把所有坏味道都修掉」是一种方案，但它有两个致命缺陷：**成本没有上限，收益没有下限**。

更实际的做法来自 Adam Tornhill 在《Your Code as a Crime Scene》里推广的**热点分析（hotspot analysis）**：把两个维度相乘——

- **复杂度**：这个文件本身有多绕；
- **变更频率（churn）**：这个文件被改得有多频繁。

单独看任何一个都没有意义。复杂度高但没人动的文件，是博物馆展品，留着不碍事；频繁改动但结构简单的文件，改起来也不痛。**只有两者的乘积才指向真正的痛点**——既绕、又天天要动的地方，每一次改动都在向利息付费。Tornhill 的核心论点是：热点文件只占代码库的一小部分，却承载了大部分开发活动和缺陷。

好消息是，churn 这个维度不需要任何商业工具，`git log` 里全都有。

## 三、动手：用 60 行代码找出热点

下面这个脚本只依赖 Node.js 和 git，把仓库过去一年的历史汇总成一张热点排行榜。

```js
// hotspots.mjs —— 找出「改得最频繁 × 最绕」的文件：偿还技术债的最优先候选
// 用法: node hotspots.mjs [--since="1 year ago"] [--top=15]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const opts = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const since = opts.since ?? '1 year ago';
const topN = Number(opts.top ?? 15);

// 生成物不是技术债：锁文件、构建产物、快照改动频繁，但毫无「设计」可言，
// 不排除的话它们会霸榜，把真正的热点挤下去。
const IGNORED = [
  /(?:^|\/)(?:dist|build|vendor|node_modules|coverage|__snapshots__)\//,
  /(?:^|\/)(?:pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/,
  /\.(?:min\.js|min\.css|snap)$/,
];
const isIgnored = (p) => IGNORED.some((re) => re.test(p));

// 1) 从 git 历史统计每个文件的 churn（提交次数 + 增删行数）
// --numstat 输出 "新增\t删除\t路径"；--no-renames 避免重命名被算成两个文件
const log = execFileSync('git', ['log', `--since=${since}`, '--numstat', '--no-renames', '--format=%H'], {
  encoding: 'utf8',
  maxBuffer: 256 * 1024 * 1024,
});

const churn = new Map();
let inCommit = false;
for (const line of log.split('\n')) {
  if (!line) continue;
  if (/^[0-9a-f]{40}$/.test(line)) {
    inCommit = true;
    continue;
  }
  if (!inCommit) continue;
  const [added, deleted, ...rest] = line.split('\t');
  const path = rest.join('\t');
  if (added === '-' || !path || isIgnored(path)) continue; // 二进制或生成物
  const s = churn.get(path) ?? { commits: 0, added: 0, deleted: 0 };
  s.commits += 1;
  s.added += Number(added);
  s.deleted += Number(deleted);
  churn.set(path, s);
}

// 2) 估算当前文件的「分支密度」，作为圈复杂度的廉价代理。
//    只数会分叉的关键字与逻辑运算符，够用，且不依赖任何分析工具。
const BRANCH = /\b(?:if|for|while|case|catch)\b|&&|\|\||\?(?![\w.?])/g;
const complexity = (path) => {
  let src;
  try {
    src = readFileSync(path, 'utf8');
  } catch {
    return 0; // 文件已删除或重命名，本轮跳过
  }
  if (src.includes('\0')) return 0; // 二进制
  const code = src.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, ''); // 粗略去掉注释
  return (code.match(BRANCH) ?? []).length;
};

// 3) 热点分 = churn × 复杂度。绝对值没有意义，只看排序。
const rows = [...churn.entries()]
  .map(([path, c]) => ({ path, ...c, complexity: complexity(path) }))
  .filter((r) => r.complexity > 0)
  .map((r) => ({ ...r, score: r.commits * r.complexity }))
  .sort((a, b) => b.score - a.score)
  .slice(0, topN);

if (rows.length === 0) {
  console.log(`过去「${since}」没有可分析的文件`);
  process.exit(0);
}

const max = rows[0].score;
const bar = (v) => '█'.repeat(Math.max(1, Math.round((v / max) * 24)));
console.log(`热点文件 Top ${topN}（${since} 起，分数 = 提交次数 × 分支密度）\n`);
console.log('  分数  提交  复杂度  文件');
for (const r of rows) {
  console.log(
    `  ${String(r.score).padStart(5)}  ${String(r.commits).padStart(4)}  ${String(r.complexity).padStart(6)}  ${r.path} ${bar(r.score)}`,
  );
}
console.log('\n提示：分数高 ≠ 必须重构。先读它最近几个月的提交消息，');
console.log('      判断这些改动是「持续加功能」还是「反复修同一类 bug」——后者才是高息债务。');
```

第一步先故意**不加过滤**跑一次，你会立刻明白为什么需要黑名单：

```
  分数  提交  复杂度  文件
   2574    26      99  src/layouts/Layout.astro ████████████████████████
   2460    10     246  pnpm-lock.yaml ███████████████████████
```

`pnpm-lock.yaml` 冲到了第二名，复杂度还比 Layout 高一倍多。它对「圈复杂度」毫无意义——那 246 个分支关键字来自成千上万个包名和版本号。锁文件确实改得很勤，但它是一份**生成物**，没有设计、没有所有权、也没有重构空间。这类文件必须排除，否则排行榜会被它们挤满。

加上过滤规则后，结果变得可用了：

```
热点文件 Top 10（1 year ago 起，分数 = 提交次数 × 分支密度）

  分数  提交  复杂度  文件
   2574    26      99  src/layouts/Layout.astro ████████████████████████
    483     7      69  src/components/features/ChatWidget.svelte █████
    312    12      26  src/pages/read/[...slug].astro ███
    296     4      74  src/plugins/rehype-component-code-tabs.mjs ███
    266     2     133  src/types.d.ts ██
    252    14      18  src/layouts/MainGridLayout.astro ██
    221    13      17  astro.config.mjs ██
    189     9      21  src/utils/content-utils.ts ██
    176     8      22  src/utils/url-utils.ts ██
    168     6      28  src/components/misc/ImageWrapper.astro ██
```

（这是在本站这个 Astro 博客仓库上跑出来的真实结果。）

`Layout.astro` 以绝对优势排在第一位：一年 26 次提交，复杂度代理值 99，比第二名高出五倍以上。这就是典型的高息债务——几乎每个页面功能都要经过它，改它的风险也最高。

## 四、量化利息：从「改得频繁」到「在还利息」

热点分只告诉你「哪里要动」，不告诉你「动了之后是在赚钱还是在还钱」。这一步可以用提交消息补上：

```bash
# 过去六个月，这个文件被改了多少次？
git log --since="6 months ago" --oneline -- src/layouts/Layout.astro | wc -l
# 25

# 其中有多少次是「修」而不是「加」？(^fix 锚定到标题行首，避免正文误伤)
git log --since="6 months ago" --oneline -i --grep='^fix' -- src/layouts/Layout.astro | wc -l
# 10
```

25 次改动里有 **10 次**以 `fix` 开头。这个比例就是利息的直接证据：每次新需求进来，都有相当概率先撞上一个旧问题。

再往下挖一层，为什么反复修？答案往往就写在那行注释里：

```bash
$ grep -n 'TODO' src/layouts/Layout.astro
427:	// TODO: temp solution to change the height of the banner

$ git log -1 --format=%ad --date=short -S 'TODO: temp solution to change the height of the banner' -- src/layouts/Layout.astro
2026-03-23
```

一个标注为 **temp solution** 的权宜之计，从 2026 年 3 月 23 日躺到今天，已经半年多。它是一个**有意的、草率的**借款（四象限左上角），当初大概确实换来了上线速度——现在它在按次收利息，每次有人动 banner 相关逻辑，都要先绕过它。

顺便一提，这个 `git log -S` 的用法值得记住：它找的是「这段文字是哪个提交引入的」，也就是**这笔债是什么时候、因为什么借下的**。知道借款原因，才知道现在能不能还——如果当初是为了赶一个已经不存在了的 deadline，那这笔债现在就该结清。

## 五、给债务定价：指标能测什么，不能测什么

SonarQube 这类工具给了技术债一个可比较的数字，核心是 **Technical Debt Ratio（技术债比率）**：

```
技术债比率 = 修复所有问题的成本 / 从零重写整个项目的成本 × 100%
```

SonarSource 的[指标定义文档](https://docs.sonarsource.com/sonarqube-community-build/user-guide/code-metrics/metrics-definition)里说明了相关的度量口径，Maintainability Rating（`sqale_rating`）就是按这个比率分级的，默认区间大致是：A ≤ 5%、B ≤ 10%、C ≤ 20%、D ≤ 50%、E > 50%（阈值可在全局配置里调整；它源自 SQALE 方法，比现在这些工具要早）。

这个指标的价值在于**可比较**：它把「这个模块很乱」变成了「还清它需要 40 人天，占重写成本的 23%」，于是能进到排期会议上讨论。但它有个必须警惕的局限：

**它测的是本金，不是利息。**

Technical Debt Ratio 算的是「修好要花多少时间」，等价于债务的本金。而决定这笔债该不该现在还的，是**利息**——也就是不修它，未来每次改动要额外付出多少。一个满是问题但没人碰的模块，比率可能很难看，利息却接近零；一个只有两三个问题、但每周被改五次的核心文件，比率可能很漂亮，利息却很高。

所以正确的组合是：**用 SonarQube 之类的工具看本金规模，用热点分析看利息费率，先还那些「本金可控、利息很高」的债。**

## 六、还债策略：偿还、重写、还是接受

确定了一笔债值得处理之后，只有四种动作：

1. **偿还**：小步重构，就地改好。适合热点明确、边界清晰的文件（比如上面那个 banner 高度问题）。
2. **重写**：只有当它是热点**且**本金已经超过重写成本时才考虑。Technical Debt Ratio 存在的意义之一，就是给这个决策提供一条参考线。
3. **隔离**：给旧代码加一层适配层，新代码只依赖适配层接口，老代码冻结。这是成本最低的止损，特别适合「不敢动但必须继续用」的模块。
4. **接受**：明确记录「我们知道这笔债存在，且决定不还」，并写清理由。

第四种最容易被忽略，但它其实最重要。技术债管理的真正目标不是「没有债」——那不可能——而是**让每一笔债都是知情的**。一张写清楚「借了什么、为什么借、利息多高、谁负责」的账本，比任何一次轰轰烈烈的重构运动都有用。

关于第 2 和第 3 点，Google 在[《Software Engineering at Google》的 Deprecation 一章](https://abseil.io/resources/swe-book/html/ch15.html)里分享了他们在大规模代码库上学到的几条经验，非常值得直接抄：

- **必须有明确的负责人（owner）**。没有 owner 的废弃计划几乎从不会自然完成——最后要么永远不删，要么把迁移成本全甩给使用者。
- **警告必须可执行且相关**。只写一句 `@deprecated` 没用，要明确给出「换成什么、怎么换」；并且只在用户真正改到相关代码时才提示，否则就是全员告警疲劳。
- **别把「删除」当成唯一的里程碑**。删除旧代码往往是整件事里最不起眼的一步，如果只考核它，团队会为了达成指标而草率收尾。Google 的做法是把基础设施的迁移责任放在**提供方**（所谓 Churn Rule：你提供的基础设施，你自己负责把用户迁过来），而不是指望几十个团队各自排期。

## 结语

把上面这些收拢成一套可以立刻执行的动作：

1. **跑一遍热点脚本**，拿到你自己仓库的 top 10。不要扫全库，只看这十个。
2. **对每个热点看 fix 比例**：`--grep='^fix'` 占该文件总改动的比例越高，利息越贵。
3. **用 `git log -S` 挖出最老的那个 TODO**，看看它当初是为谁借的，现在还该不该还。
4. **给债分类**：是有意还是无意，审慎还是草率。分类不同，动作不同。
5. **记账**：哪怕只是 issue 里的一行「已知债务：xxx，利息评估：高/中/低，决定：还/隔离/接受」，也比没有强。

最后回到 Cunningham 那句话。技术债这个比喻真正的价值不在于道德评判，而在于它提醒你：**借债本身是一种正常且高效的手段，问题永远出在没人记账的时候。**

## 参考来源

- [Ward Cunningham, *The WyCash Portfolio Management System*（OOPSLA '92 经验报告，作者本人存档）](http://c2.com/doc/oopsla92.html)：技术债比喻的原始出处，「借款 + 利息」的完整表述见原文
- [Martin Fowler, *Technical Debt Quadrant*](https://martinfowler.com/bliki/TechnicalDebtQuadrant.html)：本文第一节四象限分类的来源，含「审慎且无意的债务是必然会出现的」这一论述
- [Adam Tornhill, *Your Code as a Crime Scene*（第 2 版，Pragmatic Bookshelf 官方样章 PDF）](https://media.pragprog.com/titles/atcrime2/intro.pdf)：热点分析（复杂度 × 变更频率）方法的系统论述；另见 [InfoQ 对其技术债排序思路的报道](https://www.infoq.com/news/2017/04/tornhill-prioritise-tech-debt/)
- [SonarQube 文档：Understanding measures and metrics](https://docs.sonarsource.com/sonarqube-community-build/user-guide/code-metrics/metrics-definition)：Maintainability Rating 与相关度量口径的定义（本文第四节所述比率与分级即出自该体系，阈值可配置）
- [*Software Engineering at Google*, 第 15 章「Deprecation」（abseil.io 免费 HTML 版）](https://abseil.io/resources/swe-book/html/ch15.html)：大规模代码库里废弃与迁移的工程经验，本文「还债策略」一节所引 owner、可执行警告与 Churn Rule 均出自此章
- [Git 官方文档：`git log -S<string>`](https://git-scm.com/docs/git-log)：本文用到的「内容变化」检索参数
