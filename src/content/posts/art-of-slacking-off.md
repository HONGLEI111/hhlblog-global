---
title: 'The Art of Slacking Off: An Office Survival Guide'
published: 2026-10-10
description: 'Mouse jigglers, boss keys, "I''m running a build"—everyone knows the slacking-off jokes, but there are actually two kinds of slacking: one relies on faking activity signals, the other on automating away the waiting. They look nearly identical on your screen; the difference is what you leave behind after you walk away.'
image: ''
tags: [programmer humor, slacking off, automation, productivity, engineering culture]
category: Other
draft: false
---
09:58, coffee in hand, back at your desk. On the screen: a spinning progress bar, and a weekly report that isn't finished yet.

10:00 standup. 10:07 it's over, and you say "I'll keep pushing this forward."

10:08 the build starts. 10:19 the build still hasn't finished. You've already scrolled through three group chats, read a trending topic, and mentally noted "I'll make it up later."

The most frequently told lie of the day isn't "almost done" — it's **"I'm running a build."** Its greatest advantage: it's probably true.

## 1. The Slacking Museum

### Mouse Jiggler

The closest thing the slacking world has to a hardware startup: a little gadget for a few dozen yuan that, once plugged in, nudges the pointer one pixel every few dozen seconds, so the screen never locks and the computer never sleeps. Some models are advertised on e-commerce pages as "undetectable."

What it forges isn't work — it's the *signal* of "currently working." And in June 2024, Wells Fargo fired more than a dozen employees over this, with the wording reported to FINRA being "simulating keyboard activity to create the impression of active work." This is the dividing line I'll unpack later in this article — **the same jiggler is either a meme or an accusation, depending on how your company sees you.**

### Boss Key

`Alt+Tab` is the oldest one-key costume change. Advanced versions include:

- `Ctrl+W` one-key evidence destruction (the cost is irreversibility — don't press it on a production tab);
- Virtual desktops: one for writing code, one for docs, and a spare;
- Terminal split panes: when the boss walks over, the prettiest thing on screen is always the `tail -f` logs.

### "I'm running a build"

Compiling, running tests, installing dependencies, waiting on CI — these are **legitimate rest permits**, because they genuinely take time, and they genuinely don't need *you*.

This is the only category of slacking that's fully justified, and the only one worth seriously optimizing. The distinction matters: the output of the first two categories is a "looks busy" state; the output of this one is a piece of code.

### Reverse slacking: monitoring software

The opposite side from jigglers is bossware (also called tattleware): periodic screenshots, keystroke counts, mouse trails, random webcam photos. The funniest part of this joke is that both sides are forging signals — employees forge "working," companies forge "we measure output." Neither side really trusts the other, and neither side really trusts the metric it's forging.

## 2. Taking the Joke Apart: There Are Two Kinds of Slacking

- **Deceptive slacking**: decoupling the "activity signal" from "work happening" — manufacturing the former, skipping the latter. The time it buys is **borrowed**; the creditor is your employer, and the repayment date is uncertain.
- **Waiting slacking**: your time is stuck inside something that's genuinely happening — compiling, installing dependencies, waiting on CI, waiting on a deploy, waiting on a colleague's review. This time isn't stolen; it's **not yet engineered away**.

The two look almost identical on screen (nobody's typing). The difference is only what you have in hand when you come back:

| | Deceptive | Waiting |
|---|---|---|
| Where the time comes from | Forging an activity signal | Eliminating real waiting |
| What's left behind | A "looks busy" state | A script, a shorter pipeline |
| When discovered | It's an accusation | It's an optimization |
| Sustainability | Comes due eventually | Earns again every run |

So the second kind is what's actually worth studying. The three moves below aren't new, but they share one thing: **while you're away, things genuinely move forward.**

## 3. Eliminating the "Wait": Three Levels

### Level 0: Time the wait first

Don't go by feel — by feel, you'll overestimate coding time and underestimate waiting time. Add a stopwatch to your commands:

```bash
# ~/.bashrc — usage: tt pnpm build
tt() {
  /usr/bin/time -f "%e\t%C" -a -o "$HOME/.tt.log" "$@"
}
```

```bash
# One week later: waiting-time leaderboard
sort -k1,1nr ~/.tt.log | head -20
```

Only GNU `time` has `-o`; on macOS it's BSD `time`, so you need to `brew install gnu-time` first, then use `gtime`. This leaderboard is usually more convincing than any productivity methodology: the top entries are always dependency installs, builds, CI waits — the actions **you never participated in from start to finish**.

### Level 1: Compress N commands into 1

Those five commands before you start work each day are "I'm ready" translated into five waits. Write them into a script:

```bash
#!/usr/bin/env bash
# scripts/dev.sh — one command, one foreground process, Ctrl-C exits everything
set -euo pipefail

# Installing dependencies and bringing up the database never needed to be serialized anyway, so start them at the same time
pnpm install --frozen-lockfile &
INSTALL=$!
docker compose up -d db &
DB=$!

wait "$INSTALL" "$DB"

# Cleanup: stop the database when the script exits, leaving no orphan processes
trap 'docker compose stop db >/dev/null 2>&1 || true' EXIT

pnpm db:migrate
exec pnpm dev
```

What this script really saves isn't those ten-odd seconds — it's **the order you have to remember**. The law of conservation of slacking says: every command you type by hand today comes back tomorrow as "how did I forget again."

### Level 2: Make the machine wait for you, not the other way around

CI is the most typical "it has to run fast even when nobody's there" scenario. For caching dependencies in GitHub Actions, the officially recommended approach is to hand it straight to the `setup-*` family of actions:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: pnpm        # The key is computed by it, so you don't have to write hits/archives by hand

# When you need to cache things beyond dependencies (such as build artifacts), use the cache explicitly:
- uses: actions/cache@v4
  with:
    path: .next/cache
    key: ${{ runner.os }}-next-${{ hashFiles('pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-next-
```

An exact `key` hit is a cache hit; on a miss, it does prefix matching by `restore-keys`, fishes out an "old but still usable" cache, and automatically saves a new one when the job finishes. The value of this mechanism isn't the few minutes of CPU it saves — it's that it turns "the first time is slow" into a one-time cost.

Then there's the **legitimate version** of the jiggler meme — also "letting the machine know you're alive," but the target is the machine, not a person:

```bash
# Linux: prevent idle sleep while running long tasks, and release it automatically when the task ends
systemd-inhibit --what=idle --why="running tests" pnpm test

# macOS
caffeinate -i pnpm test
```

A mouse jiggler is to make *other people* think you're working; `systemd-inhibit` is to let *the machine* know you're still working. **The test is simple: are you fooling the machine, or a person?**

### Level 3: Push manual steps into hooks

Anything that's "I'll format it later" becomes "next quarter we'll format everything at once, three thousand files in one go." Move it to before commit:

```bash
# .git/hooks/pre-commit (remember to chmod +x)
#!/usr/bin/env sh
pnpm biome check --staged --write || exit 1
git add -u
```

In team collaboration, the more common combo is `lint-staged` + `husky`, which does the same thing: **turn "I remember I should run it" into "it's impossible to forget."** Incidentally, the biggest debt this hook will block in the future is the one you owe yourself.

## 4. Grading the Quality of Slacking

Not all rest is equivalent. The finding in Gloria Mark's team's CHI 2008 paper "The Cost of Interrupted Work: More Speed and Stress" is a bit counterintuitive: after being interrupted, people do finish tasks **faster**, but at the cost of higher stress and effort — the speed is bought with tension. In her team's later field observation studies, the oft-cited number is "after an interruption, it takes an average of 23 minutes and 15 seconds to return to the original task," while people switch activities on average every 3 minutes and 5 seconds, and about half of those interruptions are **self-inflicted**.

Sio and Ormerod's 2009 meta-analysis spells out "stepping away" in more detail: incubation does improve problem-solving rates, with divergent tasks benefiting more than verbal/visual insight tasks; the longer the preparation period, the more pronounced the effect. But there are two key moderators:

1. Doing **high-cognitive-load** tasks during the incubation period significantly weakens the incubation effect;
2. For verbal insight problems, **low-cognitive-load filler activities** work even better than pure rest.

Translate these two into office language and you get a very practical slacking grading:

- **High-quality slacking**: low cognitive load + away from the screen. A walk, getting water, washing your cup, looking out the window, chatting about something else. Problems sort themselves out in the background.
- **Low-quality slacking**: high cognitive load + still staring at the same screen. Short videos, trending topics, switching into a more stimulating feed. Ten minutes later, you haven't rested, and you owe one more interruption.

Same ten minutes: one is digesting problems for you, the other is manufacturing trouble for you.

As for "work expands to fill all available time" (Parkinson's law), it's a reminder about **process**, not a whip for **people**: leaving whitespace is safe only when delivery boundaries are crystal clear. When boundaries are fuzzy, whitespace gets filled — and what fills it usually isn't work, it's anxiety.

## 5. Slacking Self-Check List

Ask yourself four questions before leaving work:

- [ ] Over the past week, how much time did I spend "waiting"? Have I measured it?
- [ ] Is the time I slacked today **earned** (via automation) or **borrowed** (via disguise)?
- [ ] When I rest, is the screen on or off?
- [ ] If a colleague ran my scripts, would they save time, or would it be more hassle?

## Final Thoughts

Jigglers will keep selling, memes will keep circulating. But be clear in your mind: **the highest form of slacking isn't making others think you're working — it's that while you're away, the work keeps moving forward.**

The problem with a mouse jiggler isn't that it costs ten yuan — it's that it only forges "someone is pushing forward," while nothing actually gets pushed forward. A good set of scripts is exactly the opposite: in those twenty minutes you're away, dependencies finish installing, the cache hits, the migration completes, the tests finish running — **your absence is backed by the pipeline.**

So next time someone asks "what were you just doing," the best answer isn't "I was running a build," but:

> I was running a build. And it went from 47 seconds down to 4.
## References

- [US bank Wells Fargo fires employees for 'simulating' being at their keyboards — The Guardian](https://www.theguardian.com/business/article/2024/jun/14/us-bank-wells-fargo-fires-employees-keyboards)
- [Wells Fargo fires workers over fake keyboard activity — BBC News](https://www.bbc.com/news/articles/cjll01220yeo)
- [The Cost of Interrupted Work: More Speed and Stress — Mark, Gudith & Klocke, CHI '08](https://doi.org/10.1145/1357054.1357072)
- [Does incubation enhance problem solving? A meta-analytic review — Sio & Ormerod, Psychological Bulletin, 2009](https://psycnet.apa.org/doiLanding?doi=10.1037%2Fa0014212)
- [Dependency caching reference — GitHub Docs](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [Parkinson's law — Wikipedia](https://en.wikipedia.org/wiki/Parkinson%27s_law)

Further reading: there are several other posts on this blog about "time and process" — [Command Line Tips: 20 Commands to Boost Terminal Efficiency](/posts/command-line-productivity-tips/), [The Classic Programmer Time Estimation Joke: Always Twice as Slow as Expected](/posts/estimating-time-jokes/), and [The Friday Deploy Curse: Superstition and Incidents on Release Day](/posts/friday-deploy-curse/).