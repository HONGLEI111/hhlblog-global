---
title: 'Identifying and Managing Technical Debt: Stop Using "Bad Code" as an Excuse'
published: 2026-10-02
description: Technical debt originally meant "principal plus interest," not "bad code." This post clarifies the concept using Cunningham's original words and Fowler's four quadrants, provides a ready-to-run Git hotspot analysis script to find the most frequently changed and most convoluted files in a real repository, and discusses how to price debt and when to pay it down versus accept it.
image: ''
tags: [Technical Debt, Refactoring, Code Quality, Git, Engineering Practices]
category: Backend
draft: false
---
## The Point of Debt Is Not "Bad Code"

In 1992, Ward Cunningham first wrote down the metaphor of technical debt in an experience report at OOPSLA. Here is the original quote:

> Shipping first time code is like going into debt. A little debt speeds development so long as it is paid back promptly with a rewrite. … The danger occurs when the debt is not repaid. Every minute spent on not-quite-right code counts as interest on that debt.

Pay attention to two key words: **borrowing**—the speed gained from a temporary expedient; and **interest**—the extra cost of every minute spent on code that is "not quite right."

More than thirty years later, the term has been used as a synonym for "badly written code." But these two things are completely different: bad code is **interest already incurred**, while debt is **the original loan**. The consequences of conflating them are very practical—when people see bad code, their instinct is to refactor; but the first question of debt management should be:

**How high is the interest on this debt?**

For debt whose interest is low enough to be negligible, the best way to handle it is **not to handle it**. A ten-thousand-line legacy module that no one has touched in five years and will never touch again does not generate interest no matter how ugly it is. Conversely, a two-hundred-line file that gets changed three times a week, even if it looks respectable, may be charging you compound interest.

This article covers two things: how to find the part of the codebase that is actually paying interest, and once you find it, how to pay it back.

## 1. Classify First: The Same Name, but Completely Different in Nature

The [technical debt quadrant](https://martinfowler.com/bliki/TechnicalDebtQuadrant.html) proposed by Martin Fowler in 2009 is still the most useful classification I have ever seen. It asks only two questions: Was this debt borrowed **deliberately**? Was it borrowed **recklessly**?

|  | Reckless | Prudent |
| --- | --- | --- |
| **Deliberate** | "Ship first, think about design later"—you know what you are violating and you know the consequences, but you have not thought through the cost | "We have to release now, and we will bear the consequences ourselves"—you understand the cost, have a repayment plan, and have notified the relevant people |
| **Inadvertent** | "What is layering?"—you have no idea what the right approach is, so you accumulate a mess | "Only now do I understand how it should have been written"—even excellent teams cannot avoid this; it is an inevitable byproduct of learning |

The most useful thing about this table is that it separates "**knowing**" from "**recklessness**." Many teams feel full of moral guilt whenever technical debt comes up, as if borrowing were equivalent to making a mistake. But the bottom-right cell—prudent and inadvertent—is something any normally evolving system will inevitably produce: you gradually understand the problem domain while writing code, and it is normal to realize only a year later what the best design is. Fowler's original point is that this kind of debt "should be expected, not blamed."

What truly deserves vigilance is the bottom-left cell: not knowing what the right approach is, so you borrow new debt every day, and no one keeps the books. This cell is not solved by refactoring; it is solved by filling in basic engineering common sense.

**The practical use of classification is to assign different ways of handling debt**:

- Deliberate + prudent → record it, schedule it, repay it when due;
- Deliberate + reckless → ask "was there really no time back then?" In most cases the answer is "there actually was";
- Inadvertent + prudent → normal phenomenon, follow the rhythm of refactoring;
- Inadvertent + reckless → a problem with training and review mechanisms, not a debt problem.

## 2. Locate Next: Not All Debt Is Worth Repaying

Suppose you now have a thousand files. In theory, "fix all the bad smells" is one option, but it has two fatal flaws: **the cost has no upper bound, and the benefit has no lower bound**.

A more practical approach comes from the **hotspot analysis** popularized by Adam Tornhill in *Your Code as a Crime Scene*: multiply two dimensions—

- **Complexity**: how convoluted the file itself is;
- **Churn**: how frequently the file is changed.

Looking at either one alone is meaningless. A highly complex file that no one touches is a museum exhibit; keeping it around does no harm. A frequently changed file with a simple structure is not painful to modify. **Only the product of the two points to the real pain point**—a place that is both convoluted and constantly being changed, where every modification pays interest. Tornhill's core argument is that hotspot files make up only a small part of the codebase, yet carry most development activity and defects.

The good news is that the churn dimension does not require any commercial tool; `git log` has it all.

--- END CONTENT ---
## 3. Hands-On: Finding Hotspots with 60 Lines of Code

The script below depends only on Node.js and git, and it aggregates a repository's past year of history into a hotspot leaderboard.

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

The first step is to deliberately run it once **without filters**, and you'll immediately understand why a blacklist is needed:

```
  分数  提交  复杂度  文件
   2574    26      99  src/layouts/Layout.astro ████████████████████████
   2460    10     246  pnpm-lock.yaml ███████████████████████
```

`pnpm-lock.yaml` shot up to second place, with a complexity proxy more than double that of Layout. It's meaningless for "cyclomatic complexity"—those 246 branch keywords come from tens of thousands of package names and version numbers. Lock files do change frequently, but they are a **generated artifact** with no design, no ownership, and no room for refactoring. Files like these must be excluded, otherwise the leaderboard will be crowded out by them.

After adding filter rules, the results become usable:

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

(This is a real result from running it on this site's Astro blog repository.)

`Layout.astro` ranks first by an overwhelming margin: 26 commits in a year, a complexity proxy of 99, more than five times that of second place. This is a classic high-interest debt—almost every page feature has to pass through it, and the risk of changing it is also the highest.
## 4. Quantifying Interest: From "Changed Frequently" to "Paying Interest"

Hotspot scores only tell you "where to make changes," not whether making those changes is earning money or paying it back. This step can be supplemented with commit messages:

```bash
# 过去六个月，这个文件被改了多少次？
git log --since="6 months ago" --oneline -- src/layouts/Layout.astro | wc -l
# 25

# 其中有多少次是「修」而不是「加」？(^fix 锚定到标题行首，避免正文误伤)
git log --since="6 months ago" --oneline -i --grep='^fix' -- src/layouts/Layout.astro | wc -l
# 10
```

Of the 25 changes, **10** start with `fix`. This ratio is direct evidence of interest: every time a new requirement comes in, there's a significant chance of first running into an old problem.

Dig one layer deeper—why does it keep getting fixed? The answer is often written right there in that comment:

```bash
$ grep -n 'TODO' src/layouts/Layout.astro
427:	// TODO: temp solution to change the height of the banner

$ git log -1 --format=%ad --date=short -S 'TODO: temp solution to change the height of the banner' -- src/layouts/Layout.astro
2026-03-23
```

A workaround labeled **temp solution** has been sitting there since March 23, 2026—over half a year now. It's a **deliberate, sloppy** loan (top-left quadrant), and it probably did buy shipping speed at the time—now it's collecting interest per use. Every time someone touches banner-related logic, they have to work around it first.

By the way, this `git log -S` usage is worth remembering: it finds "which commit introduced this text"—that is, **when and why this debt was borrowed**. Knowing the reason for borrowing tells you whether it can be repaid now—if it was to meet a deadline that no longer exists, then this debt should be settled now.

## 5. Pricing the Debt: What Metrics Can and Cannot Measure

Tools like SonarQube give technical debt a comparable number, centered on the **Technical Debt Ratio**:

```
技术债比率 = 修复所有问题的成本 / 从零重写整个项目的成本 × 100%
```

SonarSource's [metric definition documentation](https://docs.sonarsource.com/sonarqube-community-build/user-guide/code-metrics/metrics-definition) explains the relevant measurement criteria. The Maintainability Rating (`sqale_rating`) is graded by this ratio, with default ranges roughly: A ≤ 5%, B ≤ 10%, C ≤ 20%, D ≤ 50%, E > 50% (thresholds are configurable globally; it originates from the SQALE method, which predates these tools).

The value of this metric lies in its **comparability**: it turns "this module is a mess" into "paying it off requires 40 person-days, 23% of rewrite cost," which can then enter scheduling meetings for discussion. But it has a limitation you must be wary of:

**It measures principal, not interest.**

Technical Debt Ratio calculates "how much time to fix it"—equivalent to the principal of the debt. What determines whether this debt should be repaid now is the **interest**—that is, how much extra you'll pay on every future change if you don't fix it. A module full of problems that nobody touches may have an ugly ratio but near-zero interest; a core file with only two or three problems but changed five times a week may have a beautiful ratio but high interest.

So the correct combination is: **use tools like SonarQube to see the scale of principal, use hotspot analysis to see the interest rate, and pay off first those debts where "principal is manageable but interest is high."**

## 6. Debt Repayment Strategies: Repay, Rewrite, or Accept

Once you've determined a debt is worth addressing, there are only four actions:

1. **Repay**: Small-step refactoring, fix it in place. Suitable for files with clear hotspots and well-defined boundaries (like the banner height issue above).
2. **Rewrite**: Only consider when it's a hotspot **and** the principal already exceeds rewrite cost. One of the purposes of Technical Debt Ratio is to provide a reference line for this decision.
3. **Isolate**: Add an adapter layer over the old code, have new code depend only on the adapter interface, and freeze the old code. This is the lowest-cost stop-loss, especially suitable for modules "too scary to touch but must keep using."
4. **Accept**: Explicitly record "we know this debt exists and decide not to repay it," with clear reasoning.

The fourth is most easily overlooked, but it's actually the most important. The real goal of technical debt management isn't "no debt"—that's impossible—but **making every debt informed**. A ledger that clearly states "what was borrowed, why, how high the interest, who's responsible" is more useful than any dramatic refactoring campaign.

Regarding points 2 and 3, Google shared several lessons learned on large-scale codebases in the [Deprecation chapter of *Software Engineering at Google*](https://abseil.io/resources/swe-book/html/ch15.html), which are well worth copying directly:

- **There must be a clear owner**. Deprecation plans without an owner almost never complete naturally—they either never get deleted, or the entire migration cost gets dumped on users.
- **Warnings must be actionable and relevant**. Just writing `@deprecated` is useless; you must clearly state "replace with what, how to replace"; and only warn when users actually touch relevant code, otherwise it's alert fatigue for everyone.
- **Don't treat "deletion" as the only milestone**. Deleting old code is often the least notable step in the whole effort. If you only measure that, teams will rush the ending to hit the metric. Google's approach is to place infrastructure migration responsibility on the **provider** (the so-called Churn Rule: the infrastructure you provide, you're responsible for migrating users over), rather than expecting dozens of teams to each schedule their own migration.

## Conclusion

Consolidating the above into a set of immediately executable actions:

1. **Run the hotspot script** to get your own repository's top 10. Don't scan the whole codebase—just look at these ten.
2. **For each hotspot, check the fix ratio**: the higher the proportion of `--grep='^fix'` in that file's total changes, the more expensive the interest.
3. **Use `git log -S` to dig out the oldest TODO**, see who it was borrowed for originally, and whether it should still be repaid now.
4. **Classify the debt**: deliberate or inadvertent, prudent or reckless. Different classifications call for different actions.
5. **Keep a ledger**: even just a line in an issue like "Known debt: xxx, interest assessment: high/medium/low, decision: repay/isolate/accept" is better than nothing.

Finally, back to Cunningham's statement. The real value of the technical debt metaphor isn't moral judgment—it's reminding you: **borrowing itself is a normal and efficient means; the problem always arises when nobody keeps the books.**

## References

- [Ward Cunningham, *The WyCash Portfolio Management System* (OOPSLA '92 experience report, archived by the author)](http://c2.com/doc/oopsla92.html): The original source of the technical debt metaphor; the full "borrowing + interest" formulation is in the original text
- [Martin Fowler, *Technical Debt Quadrant*](https://martinfowler.com/bliki/TechnicalDebtQuadrant.html): The source of the four-quadrant classification in Section 1, including the argument that "prudent and inadvertent debt is inevitable"
- [Adam Tornhill, *Your Code as a Crime Scene* (2nd edition, Pragmatic Bookshelf official sample chapter PDF)](https://media.pragprog.com/titles/atcrime2/intro.pdf): Systematic exposition of hotspot analysis (complexity × change frequency); see also [InfoQ's coverage of his technical debt ranking approach](https://www.infoq.com/news/2017/04/tornhill-prioritise-tech-debt/)
- [SonarQube documentation: Understanding measures and metrics](https://docs.sonarsource.com/sonarqube-community-build/user-guide/code-metrics/metrics-definition): Definitions of Maintainability Rating and related measurement criteria (the ratio and grading described in Section 4 come from this system; thresholds are configurable)
- [*Software Engineering at Google*, Chapter 15 "Deprecation" (free HTML version on abseil.io)](https://abseil.io/resources/swe-book/html/ch15.html): Engineering experience with deprecation and migration in large-scale codebases; the owner, actionable warnings, and Churn Rule cited in the "Debt Repayment Strategies" section all come from this chapter
- [Git official documentation: `git log -S<string>`](https://git-scm.com/docs/git-log): The "content change" search parameter used in this article