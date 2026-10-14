---
title: 'How to Read Source Code: From Entry Point to Structure'
published: 2026-09-25
description: 'Getting stuck reading source code is often not about the code being too hard, but about lacking a route. This article presents an executable process for reading code: first clarify your purpose, then find the entry point from the line you call, use cpuprofile to let the running program reveal the real call chain, and use git log -S to archaeologically uncover design decisions, with a complete runnable call tree analysis script included.'
image: ''
tags: [Source Code Reading, Debugging, Node.js, Methodology, Performance Analysis]
category: Backend
draft: false
---
## The reason you get stuck usually isn't "difficulty"

Taking over an internal library, five thousand lines, with a README that has only one line: `npm install`. Some interface is slow, so you open `index.js` and resolve to start reading from the first line.

Two hours later you've read to line 200, and you've already forgotten what you were originally looking for.

Try a different approach: first get the program running, use `node --cpu-prof` to capture a profile, and five minutes later you know that `parseQuery` consumes 80% of the time, then read only those 30 lines.

The difference isn't about who is smarter, but about the fact that **the core action of reading source code isn't "reading," it's "locating."** You don't need to understand the entire codebase, only the "path leading to your particular problem." This article is about how to find that path.

## 1. First distinguish why you're reading it

The same library, four purposes corresponding to four completely different ways of reading:

| Purpose | Scope of reading | Depth | When to stop |
| --- | --- | --- | --- |
| Fix a bug | The chain traced backward from the error scene | Every line must be understood | Stop once it's fixed |
| Evaluate a dependency | Entry API, dependency tree, tests | Read only boundaries and contracts | Stop once you can judge the risk |
| Learn from the design | Core abstractions and data structures | Understand the why, not every line | When you can reproduce it yourself |
| Learn | The main flow | Allowed to skip details | There is no endpoint |

The most common mistake is **using the "learning" approach to do the "fix a bug" job**—reading from the first line, trying to build a complete mental model first, then going back to solve the problem. This path basically doesn't work in a five-thousand-line library.

If the purpose is fixing a bug or troubleshooting performance, you only need one chain; if it's evaluating a dependency, you may not even need to read the source code—reading its `package.json`, type definitions, and tests is enough.

## 2. Find the entry point: three reliable starting points

Choose the wrong entry point, and everything after is wasted effort. There are three starting points that almost never fail:

**1. The line in your own code that is currently being called.** This is the best entry point, because it's the only place you're certain "will definitely be executed." Jumping from `client.request()` to the definition is an order of magnitude more efficient than starting from the library's first line.

**2. The error stack.** At runtime it has already drawn the call chain for you for free—don't waste it. The first frame in the stack that belongs to this library is the entry point.

**3. The place where the framework calls back into you.** Lifecycle hooks, event callbacks, plugin interfaces—"who called me" is harder to trace than "who I called," but it's often more valuable, because it determines what context your code runs in.

The three-piece command-line toolkit for locating:

```bash
# Where is this symbol defined? Three common patterns, all in one search
rg -n "function parseQuery|const parseQuery|parseQuery =" src/

# Who calls it? (This is the starting point of the "reverse" thread)
rg -n "parseQuery\(" src/

# The language's implicit conventions — this kind of "magic" is the easiest to miss
rg -n "toJSON|Symbol\.toPrimitive|Symbol\.iterator" src/
```

The third one is often overlooked. When an object's result is wrong when `JSON.stringify`, just looking at the call site will never find the cause—the problem is in its own implementation of `toJSON`.

## 3. Three threads

After finding the entry point, unfold along three directions:

- **Downward: the call chain.** Who called whom, how control flow moves.
- **Sideways: the data flow.** From creation to destruction of an object, which fields were changed by whom. This thread is the easiest to overlook, and it's also where bugs are most concentrated.
- **Upward: the lifecycle.** Who called this code at what timing, and at what timing it will be destroyed.

Look at a real pitfall. This mini middleware pipeline is only 10 lines:

```js
const middlewares = [];

function use(fn) { middlewares.push(fn); }

async function handle(req) {
  let i = 0;
  const next = async () => {
    if (i >= middlewares.length) return;
    await middlewares[i++](req, next);
  };
  await next();
  return req;
}
```

The amount of code is small enough to read line by line, but all three threads are tangled:

- **On the call chain**, `next` is recursive—the `next` each middleware receives is actually the same closure, only the `i` inside the closure is changing;
- **On the data flow**, `req` is modified in turn by each middleware, and `i` is shared mutable state;
- **On the lifecycle**, `use()` must finish being called before `handle()`, otherwise the pipeline is incomplete.

If you're troubleshooting "why the third middleware didn't execute" in this library, just reading `handle` is enough to see it; but if it's "why is a field missing from the request object," you have to trace `req` sideways. **The same entry point, different problems, require different threads to follow.**

And if this code were someone else's ten-thousand-line version, reading is not as good as running.
## 4. Let the Program Speak for Itself: Run First, Read Later

This is the single most important point the entire article wants to convey: **you have a weapon that people reading source code don't have—you can make the program run, and then ask it what just happened.**

Node.js's built-in CPU profiler does exactly this. It doesn't require you to change a single line of business code:

```bash
node --cpu-prof --cpu-prof-dir=. app.mjs
```

After running, it generates a `CPU.*.cpuprofile` in the current directory, which is essentially a JSON file: `samples` are the functions hit by each sample, `timeDeltas` is the duration of that sample, and `nodes` is the call tree. What it records is the **actual execution path**, not the one you guessed.

The raw file is hard to read, so the script below restores it into a call tree. Full code:

```js
// analyze-cpu-profile.mjs — reconstructs the output of node --cpu-prof into a call tree that actually ran
// Usage: node analyze-cpu-profile.mjs <*.cpuprofile> [function name keyword]
import { readFileSync } from 'node:fs';

const [file, keyword] = process.argv.slice(2);
if (!file) {
  console.error('用法: node analyze-cpu-profile.mjs <*.cpuprofile> [函数名关键字]');
  process.exit(1);
}

const profile = JSON.parse(readFileSync(file, 'utf8'));
const byId = new Map(profile.nodes.map((n) => [n.id, n]));

// samples[i] is the node id hit by the i-th sample, timeDeltas[i] is the duration of that sample (in microseconds)
const selfTime = new Map();
for (let i = 0; i < profile.samples.length; i++) {
  const id = profile.samples[i];
  const dt = profile.timeDeltas[i] ?? 0;
  selfTime.set(id, (selfTime.get(id) ?? 0) + dt);
}

// Build a "child → parent" index; later we'll walk it backward to trace the call path
const parentOf = new Map();
for (const node of profile.nodes) {
  for (const childId of node.children ?? []) parentOf.set(childId, node.id);
}

// Accumulate bottom-up to get each node's total time (including all child calls).
// Use an explicit stack instead of recursion: a real project's call tree can get deep enough to blow the JS call stack.
const totalTime = new Map();
const stack = [[profile.nodes[0].id, false]];
while (stack.length) {
  const [id, expanded] = stack.pop();
  if (!expanded) {
    stack.push([id, true]);
    for (const childId of byId.get(id).children ?? []) stack.push([childId, false]);
    continue;
  }
  let sum = selfTime.get(id) ?? 0;
  for (const childId of byId.get(id).children ?? []) sum += totalTime.get(childId) ?? 0;
  totalTime.set(id, sum);
}

const ms = (us) => (us / 1000).toFixed(1);
// Keep only relative paths inside the repo; annotate node_modules and node: internal functions separately
const shortUrl = (url = '') => {
  if (url.startsWith('node:')) return url;
  const i = url.indexOf('/node_modules/');
  if (i >= 0) return `…${url.slice(i)}`;
  return url.replace(/^file:\/\//, '').replace(`${process.cwd()}/`, '');
};

// Sort by "self time": high total time only means it's upstream in the call chain; high self time is what's really eating CPU
const top = [...selfTime.entries()]
  .map(([id, self]) => ({ node: byId.get(id), self }))
  .filter((x) => x.node)
  .sort((a, b) => b.self - a.self)
  .slice(0, 15);

console.log(`采样 ${profile.samples.length} 次，总耗时 ${ms(totalTime.get(profile.nodes[0].id))}ms\n`);
console.log('自身耗时 Top 15（真正在烧 CPU 的函数）：');
for (const { node, self } of top) {
  const f = node.callFrame;
  console.log(`  ${ms(self).padStart(8)}ms  ${(node.hitCount ?? 0).toString().padStart(5)} 次  ${f.functionName || '(anonymous)'}  @ ${shortUrl(f.url)}:${f.lineNumber + 1}`);
}

// To find out "who called this function," walk back up through parentOf all the way to the root
if (keyword) {
  const hits = [...totalTime.entries()]
    .map(([id, total]) => ({ frame: byId.get(id).callFrame, id, total }))
    .filter((x) => x.frame.functionName?.includes(keyword))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);
  for (const { id, total } of hits) {
    const path = [];
    for (let cur = id; cur !== undefined; cur = parentOf.get(cur)) path.unshift(cur);
    console.log(`\n调用路径（总耗时 ${ms(total)}ms）：`);
    for (const cur of path) {
      const f = byId.get(cur).callFrame;
      console.log(`  ${ms(totalTime.get(cur)).padStart(8)}ms  ${f.functionName || '(anonymous)'}  @ ${shortUrl(f.url)}:${f.lineNumber + 1}`);
    }
  }
}
```

Run it against the middleware pipeline example from earlier:

```bash
node --cpu-prof --cpu-prof-dir=. app.mjs
node analyze-cpu-profile.mjs CPU.*.cpuprofile parseQuery
```

The output looks like this (values fluctuate by machine, paths simplified):

```
Sampled 157 times, total elapsed 337.0ms

Top 15 self time (functions actually burning CPU):
     164.1ms    106 times  parseQuery  @ app.mjs:16
      84.1ms     26 times  parseQuery  @ app.mjs:16
      62.3ms      0 times  (program)  @ :0
      10.3ms      8 times  (anonymous)  @ app.mjs:25
       1.1ms      1 times  next  @ app.mjs:8
      …(the rest is startup overhead of Node internal modules, omitted here)

Call path (total elapsed 164.1ms):
     337.0ms  (root)  @ :0
     172.5ms  (anonymous)  @ app.mjs:1
     172.5ms  handle  @ app.mjs:6
     172.5ms  next  @ app.mjs:8
     172.5ms  (anonymous)  @ app.mjs:25
     164.1ms  parseQuery  @ app.mjs:16
```

This output directly answers the three questions about the "thread":

- **Who is the hotspot?** The two `parseQuery` lines add up to 248ms, accounting for over seventy percent. You don't need to guess anymore.
- **Who called it?** Trace back from the root all the way: `handle` → `next` (pipeline scheduling) → the anonymous middleware in `app.mjs:25` → `parseQuery`. This is the **downward call chain** read in reverse—you already have the complete path, you just need to read these four levels.
- **Why are there two `parseQuery`?** Because they hang under different nodes in the call tree, one in the module evaluation path and one in the `handle` loop. This kind of duplication is only visible when you run it; reading code alone makes it very easy to miss.

It's worth noting that both keywords point to the same thing: **"self time" and "total time" must be looked at separately**. `handle` has the highest total time (172.5ms), but its own time is close to 0—it's just a scheduler, and optimizing it is meaningless. What really needs work is `parseQuery`.

This approach treats third-party libraries in `node_modules` the same way: there's no need for readable source code—the URLs in the profile will directly tell you which package and which line the hotspot falls on.
## 5. Archaeology: Read "Why", Not "What"

Code only tells you what; git tells you why. When a piece of logic seems to make no sense, don't rush to change it—ask history first:

```bash
# Which commit introduced this symbol? (-S searches "content changes," not file names)
git log -S "parseQuery" --oneline

# What happened to lines 16 through 20? The diff and commit message for each change will be listed
git log -L 16,20:src/parse.js --oneline

# Even if the file was renamed, follow it all the way through
git log --follow -p src/parse.js
```

`git log -S` can find out "when a piece of code was added," which is where it beats `git blame`—`blame` only tells you who last touched this line, while `-S` tells you **where this idea came from**.

In practice, a "seemingly redundant null check" is often backed by a real production incident. That commit message and its linked issue carry far more information than the code itself. Taking a look at the history before making changes is the lowest-cost form of self-protection.

## 6. Treat Tests as a Specification

If this library has tests, **starting from the test files is much faster than starting from `index.js`**.

The reason is simple: tests are the only documentation that doesn't lie. Comments go stale, READMEs miss things, but tests must stay consistent with the implementation—otherwise CI goes red. And tests naturally answer three questions:

- How is this API normally used? (Use cases)
- Where are the boundaries? (Assertions on exception branches)
- Which behaviors are deliberately guaranteed, and which are accidental? (Is there a corresponding test?)

An actionable order is: **run the failing test first, then look at the implementation.** A failing test will take you straight to the thread with the problem—much faster than fumbling around on your own.

## A Process You Can Stick on Your Monitor

Compress all of the above into six steps:

1. **Write down one sentence**: What question am I reading this source code to answer? If you can't answer that, don't open the file yet.
2. **Find the entry point**: Work backward from the line you called, or follow the error stack.
3. **Choose a thread**: For control flow issues, look at the call chain; for state issues, look at the data flow; for timing issues, look at the lifecycle.
4. **Run it first**: `--cpu-prof` to get the real call tree is an order of magnitude faster than reading code.
5. **Archaeology**: `git log -S` to clarify "why it is this way."
6. **Let tests catch you**: Tests are the only specification that doesn't lie.

One last thing: **The ability to read source code is essentially not a reading ability, but a questioning ability.** Go in with a specific question, and five thousand lines will automatically narrow down to a few dozen; go in without a question, and you'll get lost in fifty lines.

## References

- [Node.js CLI documentation: `--cpu-prof`](https://nodejs.org/api/cli.html#--cpu-prof) (and `--cpu-prof-dir`, `--cpu-prof-interval`): Official explanation and output format of the sampler used in Section 4 of this article
- [Chrome DevTools Performance panel documentation](https://developer.chrome.com/docs/devtools/performance/): How to visually read CPU profiles, including flame charts and the Bottom-Up view, which can be cross-checked with the scripts in this article
- [Git official documentation: `git log -S<string>` and `-L`](https://git-scm.com/docs/git-log): Full semantics of the two parameters used in Section 4, "Archaeology"
- [*The Programmer's Brain*](https://www.manning.com/books/the-programmers-brain) (Felienne Hermans): Discusses the cognitive load when the human brain reads code, the psychological basis for "why you should first distinguish the purpose" in Section 1 of this article
- [ripgrep user guide](https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md): The practical difference between `rg` and `grep` when searching for symbol definitions in large repositories