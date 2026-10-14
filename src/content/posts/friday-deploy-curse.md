---
title: 'The Friday Deploy Curse: Superstition and Incidents on Release Day'
published: 2026-09-27
description: '"Never deploy on Friday" is probably the most widely repeated rule in ops — and the most frequently broken. Take it apart and you''ll find the real danger isn''t the day of the week, but having no one around, no kill switch, and no way to roll back when things go wrong.'
image: ''
tags: [programmer humor, deployment, SRE, operations]
category: Other
draft: false
---
Friday 17:20, someone asks in the group chat: Can this small change go out?

Five minutes, no reply.

17:25, he answers himself: It's just one line, I'm shipping it.

17:31, he leaves the group chat—not by choice.

## 1. The Museum of Deployment Superstitions

"No deploys on Friday" isn't a rule, it's a whole body of folklore. Versions scattered across companies include:

- **Read-Only Friday**: Fridays are read-only, no writes; release windows are scheduled Tuesday through Thursday;
- **Pre-holiday freeze**: before Christmas, Chinese New Year, or major sales events, changes are frozen—whoever requests one takes the blame;
- **Case-by-case caution**: no deploys before the boss goes on a business trip, no upgrades the night before a demo, only copy changes allowed on customer visit days;
- **Physical superstitions**: apples in the server room, "Stable for xx days" stickers on servers, take a deep breath before `sudo`.

These rules are funny, but they're not superstition. Each one is risk control hardcoded from organizational memory—**behind every rule lies an incident**. What's really worth asking is: what are they actually guarding against—"Friday," or something else?

## 2. Taking the Joke Apart: Where Friday Is Actually Dangerous

The key is this: Friday doesn't make code more likely to break, it makes breakage **harder to clean up**.

1. **MTTR gets longer**. Something breaks Wednesday afternoon, the on-call person is on it in five minutes; something breaks Friday night, you have to wait for them to put down their chopsticks first.
2. **The decision chain gets longer**. Whether to roll back requires finding the approver; the approver is at the dinner table right now, and the rollback window is priced by the minute.
3. **Change size gets bigger**. What ships on Friday is often a week's worth of merged work—a week of changes crammed into one window, and when something breaks, the suspect range is the entire week.
4. **Attention is at its lowest**. Friday afternoon reviews have the lowest `LGTM` value of the year.

There's also a counterintuitive data point: DORA / *Accelerate*'s long-term tracking concludes that **teams with the highest deployment frequency actually have lower change failure rates**. Because each change is smaller, easier to localize, faster to roll back—"fewer releases is safer" is an illusion; "small, frequent releases" is the answer.

So "no deploys on Friday" treats the symptom. It pushes a painful change to Monday, and makes Monday painful too.

## 3. Two Cases Where the Day of the Week Wasn't the Star

**CrowdStrike, July 19, 2024, a Friday.** At 04:09 UTC, a Falcon content update (Channel File 291) was pushed out; the content interpreter in the kernel read out of bounds, and roughly 8.5 million Windows devices worldwide went into blue-screen reboot loops—airline, hospital, and bank counters went dark row by row. The update was pulled within 78 minutes, but machines already blue-screened could only be manually fixed one at a time by booting into safe mode and deleting files. One key line from the postmortem: this type of content update **had no canary rollout**.

**Knight Capital, August 1, 2012, a Wednesday.** To connect to NYSE's new Retail Liquidity Program, the company deployed a batch of new code—code that reactivated a function in the router that had been moved in 2005 and long since deprecated. In the 45 minutes after market open, the router sent over 40 million orders to the market, filling only 212 customer orders, losing more than $460 million. The most painful part: the SEC later found that before market open that day, internal systems had automatically sent **97** error emails. Nobody read them. Wednesday, 9:30 AM, everything looked normal.

Put the two together: one lost on "no canary," one lost on "no one reviewed the deployment process"—**neither lost on the day of the week**.

## 4. The Real Exorcism: Separate "Deploy" from "Release"

Deploy is "putting code on machines"—it should be boring, frequent, dozens of times a day. Release is "letting users see new features"—it should be toggleable, groupable, and killable at any time. The former, when it breaks, at worst gets rolled back; the latter, when it breaks, just needs a switch flipped off.

When these two things are glued together, all the superstitions above come right back.

A minimal feature-flag implementation takes less code than writing a release announcement:

```ts
type Flag = {
  key: string
  enabled: boolean          // 总开关：出事了先关它，不用发版
  rollout: number | string[] // 放量比例，或内测名单
}

// FNV-1a：同一个用户永远落在同一个桶里，不会刷新一次变一次
function hash(s: string): number {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

function isOn(flag: Flag, userId: string): boolean {
  if (!flag.enabled) return false
  if (Array.isArray(flag.rollout)) return flag.rollout.includes(userId)
  return hash(userId + flag.key) % 100 < flag.rollout
}
```

With it, shipping at 17:30 is no longer a gamble: turn on 1%, watch metrics for five minutes, then 10%, 50%, 100%. If something really breaks, flip the switch—an order of magnitude faster than `git revert` + rebuild + redeploy.

As for canary, blue-green, automatic rollback, on-call schedules—they're all extensions of the same idea: **make the blast radius of every change small enough to bear, and make the remediation action for every failure small enough to execute at any time**. Do these two things, and you don't need "Read-Only Friday"—because Wednesday and Friday are no different.

## 5. Friday Deploy Self-Check Checklist

Before shipping, ask yourself four questions:

- [ ] Can this change be rolled back with one click? Does rollback require a re-release?
- [ ] If it breaks, who gets woken up? Do they know where the rollback command is?
- [ ] Is there a flag that can make it affect only 1% of users?
- [ ] If it ships at 17:30 and blows up at 18:00, who's around at 18:01?

When you can't answer the last one, what you're really afraid of isn't Friday—it's your own process.

## Final Thoughts

The jokes keep going, the superstitions keep getting worshipped—after all, taking a deep breath before `sudo` costs nothing. But be clear in your mind: **Friday is just a variable name; the real subject of every incident is always "the blast radius of a change" and "the time required to recover."**

So next time someone asks at 17:20 on a Friday "can this go out," the best answer isn't "no," it's:

> Yes. Push it up with the flag off, turn it on Monday.

—That way Friday wins, and it wins through engineering.

## References

- [Release Engineering — Google SRE Book](https://sre.google/sre-book/release-engineering/): making releases a routine action that "requires no engineer intervention"
- [Accelerate: The Science of Lean Software and DevOps — Forsgren, Humble, Kim](https://itrevolution.com/product/accelerate/): the long-term correlation between deployment frequency and change failure rate
- [CrowdStrike Channel File 291 Incident Explanation — ABC News](https://www.abc.net.au/news/2024-07-20/what-happened-crowdstrike-global-outage-explainer/104122582)
- [CrowdStrike Outage Crashes 8.5 Million Windows Devices — The Verge](https://www.theverge.com/2024/7/20/24202527/crowdstrike-microsoft-windows-bsod-outage)
- [SEC Charges Knight Capital With Violations of Market Access Rule (Release No. 34-70694)](https://www.sec.gov/news/press-release/2013-222)

Further reading: this blog also has a few posts about "the distance between incidents and people"—[Famous Bugs in History](/posts/historical-famous-bugs), [The Tragic Story of rm -rf](/posts/rm-rf-tragic-stories), and yesterday's [Classic Jokes About Requirement Changes](/posts/requirement-change-jokes) (one of its sections happens to be about decoupling with flags too).