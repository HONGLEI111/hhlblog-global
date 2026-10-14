---
title: 'Explaining Your Job to Your Parents: Why Your Mum Still Thinks You Fix Computers'
published: 2026-10-04
description: '"Where do you work?" "You fix computers, right?" "Can you look at my phone?" — The hard part of explaining a programmer''s job to your parents is not the jargon; it is that what you deliver is invisible to them. A tapping experiment and one translation function, on turning invisible work into plain language.'
image: ''
tags: [Programmer Humour, Career, Communication, Family]
category: 'Other'
draft: false
---

You go home for the holidays. Three cups of tea into dinner, your mum finally asks the question she asks once a year:

"So what is it that you actually do?"

You take a deep breath and decide that this time you will explain it properly. Forty minutes later she nods, warmly: "Alright, I've got it. You fix computers."

## 1. The Relative Questionnaire: Twenty Years of the Same Exam

The paper is set nationally, the wording varies slightly and the question bank never changes:

| What the relative asks | What you think | What you say |
| --- | --- | --- |
| Which company are you at? | I don't have a company, I have Slack | "An internet company" |
| Do you fix computers? | The last time I installed an OS was 2009 | "…more or less" |
| Have a look at why my phone is slow | I write backend code | "Sure, let me see" |
| How long can you do this until? | I'd love to know too | "Depends on the person" |
| With AI out, are you all going to be unemployed? | I finished a module with it today | "We're fine, we're fine" |
| How much do you make a month? | — | "Enough" |

"Someone who fixes computers" has astonishing staying power. It is not a misunderstanding on your parents' part; it is the nearest occupation they can picture. Your dad has *seen* a computer repair person: they turn up with a bag, plug in a USB stick, and twenty minutes later the machine works — **there is a process, a deliverable, something visible**. What you did last week was "refactor the auth module into a shared platform capability", and the deliverable was three folders that do not exist and a document nobody reads.

The part that fails to land was never the technical difficulty. It is **visibility**.

## 2. You Don't Explain Badly — You're Cursed With Knowledge

In 1990 the Stanford psychologist Elizabeth Newton ran an experiment. She split her subjects into two groups: one tapped out a well-known song on a table (something like "Happy Birthday"), while the other listened and guessed the tune.

The tappers had the full melody in their heads, and estimated optimistically that listeners would get about half right. The actual result: **3 out of 120, or 2.5%**.

This is the curse of knowledge: once you know something, you cannot get back to not knowing it. When you tap, you hear a symphony. Your mum hears — tapping.

You explain that "I changed a scheduled job to be event-driven". In your head: an architecture diagram, the 3am page, the latency dropping from 30 seconds to 200 milliseconds. What she receives is: job, event, driven, and "oh".

So the problem is not "how do I make the technical part simpler". It is **accepting first that the other person is holding a blank sheet of paper**.

## 3. "Someone Who Fixes Computers" Is Actually a Successful Translation

Don't rush to argue with the label. In management writing, Peter Drucker coined "knowledge worker" in his 1959 book *Landmarks of Tomorrow* — and the examples he named were programmers, systems analysts and technical writers. Nearly seventy years later, a different term from the sociologist Arlene Kaplan Daniels (1987) fits better: **invisible work** — done every day by the person doing it, entirely unseen by the person looking.

Invisible work is the hardest to explain, because the raw material for the explanation was never in your hands. You think you need to explain technology. What you actually need to deliver is a **translation**.

And "someone who fixes computers" has survived twenty years precisely because it translates correctly: it maps the causal chain your mum already knows — *the computer broke → someone came → it works again* — onto the outside of your job. It is not accurate, but it is usable.

There are only four rules in a real translation guide:

**One: talk about impact, not technology.** "I refactored the auth module" becomes "I changed the locks at home; too many people had copies of the old key". "I did a performance optimisation" becomes "it used to take three seconds when you clicked, now you don't wait at all". Your parents do not care how you did it. They care what it was for.

**Two: one layer of analogy, no nesting.** "The backend is the kitchen, the frontend is the waiter" is good. "Containers are like shipping containers, orchestration is like dock scheduling, and CI/CD is like…" — three sentences in, you are teaching them port logistics. Analogies have a short shelf life. Use them and put them away.

**Three: give them something they can point at.** No explanation beats one sentence: "That thing on your phone — you tap this button, that table comes up, and I built it." **A visible artefact is the only thing that cuts through every layer of abstraction.**

**Four: allow yourself to fail to explain.** Some things simply have no analogy, and in that moment "I can't explain this one either" is far more honest than inventing a fake one — your mum will accept it anyway. She just wanted a few more minutes of talking to you.

If it really has to be code, the translation table looks roughly like this:

```ts
// Family-edition jargon translator: you pass in what you said, it returns what your mum can follow
const plainLanguage: Record<string, string> = {
  'I refactored the auth module': 'I changed the locks; the old keys no longer work',
  'I did a performance optimisation': 'It used to take three seconds, now you do not wait',
  'I added monitoring and alerts': 'I fitted a smoke alarm — it goes off when something burns',
  'I shipped a canary release toggle': 'The new dish goes to one table first; if it is bad, we take it back',
  'I fixed a concurrency bug': 'Two people kept fighting over one toilet. Fixed.',
}

function translate(whatYouSaid: string): string {
  // Translate on a hit; admit defeat on a miss — that beats inventing a fake analogy
  return plainLanguage[whatYouSaid] ?? "I honestly can't explain this one, but nothing is broken"
}

console.log(translate('I refactored the auth module')) // I changed the locks; the old keys no longer work
console.log(translate('I wrote a quorum protocol')) // I honestly can't explain this one, but nothing is broken
```

The table's real value is not how accurately it translates. It is that it forces you to run the sentence once before you open your mouth: **what does this become in the language of "fixing computers"?** If you cannot produce anything, you may not have worked out whose problem it solved either.

## In Closing

There is a reverse moment that rarely gets mentioned: when your parents talk about their own workplace — who has fallen out with whom, why that report has to be rewritten seven times, why old Zhang missed the award this year — you don't understand it either. You nod along and think: what's so hard about that?

So the next time your mum says "you just fix computers", don't rush to correct her. She is using the only map she has, trying to walk over to where you are.

Nod, say "yeah, more or less", and take a look at why her phone is slow. This time the deliverable really is visible.

## Sources

- [The Landmarks of Tomorrow — Peter F. Drucker (1959)](https://en.wikipedia.org/wiki/The_Landmarks_of_Tomorrow): first proposed "knowledge worker", naming programmers and systems analysts among others
- [Invisible Work — Arlene Kaplan Daniels, *Social Problems*, 34(5): 403–415 (1987)](https://doi.org/10.2307/800538): introduced "invisible work" for labour that is seen but not counted as work
- [Innovative Minds Don't Think Alike — The New York Times (2007-12-30)](https://www.nytimes.com/2007/12/30/business/30know.html): on Elizabeth Newton's tapping experiment (3 of 120) and the curse of knowledge
- [Office Space (1999) — Bob Slydell's quotes, IMDb](https://www.imdb.com/title/tt0151804/characters/nm0001525): "What would you say you do here?" — being unable to answer "what do you actually do" is comedy, and also the modern worker's daily life

Further reading: a few other posts here are about how work gets seen, and misread — [Tech Jargon Dictionary](/posts/tech-jargon-dictionary), [Programmers and Caffeine](/posts/programmer-and-caffeine), and [Identifying and Managing Technical Debt](/posts/technical-debt-identification-and-management).
