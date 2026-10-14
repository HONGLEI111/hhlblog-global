---
title: 'Fun with Version Numbering: From 1.0 to 114.0'
published: 2026-09-12
description: Semantic versioning was supposed to be three numbers, yet TeX converged to pi, Firefox jumped five major versions in a year, and Chrome quietly zeroed out its underlying numbers to 0.0.0—a look at the absurd drama of version numbers.
image: ''
tags: [version numbers, semantic versioning, programmer humor]
category: Other
draft: false
---
Let's start with a bug that almost everyone has written at some point:

```js
console.log('1.10.0' > '1.9.0'); // false
```

String comparison proceeds character by character. The first character is `1` in both, and the second character `.` and `.` are also the same, so it compares the third position: `'1' < '9'`, and it's judged as less than. The accumulated results of ten minor version iterations are effortlessly wiped out by a single lexicographic comparison. The reason this line of code is funny is that it exposes a truth: **version numbers were originally meant for machines to read, but we've always treated them like human language.**

## 1. The Utopia of Three Numbers

[Semantic Versioning](https://semver.org/) makes a very clean promise: `MAJOR.MINOR.PATCH`. Breaking compatibility bumps MAJOR, adding features bumps MINOR, fixing bugs bumps PATCH. The rules are clear enough to write into a contract. The only problem is that nobody actually follows them. In reality, MAJOR bumps are often decided by the marketing department rather than by `git log` — "We're shipping 2.0 next quarter" — and then the commit log contains a button border-radius adjustment.

Hence the industry maxim: **1.0 is the version you're ashamed to show people; 2.0 is the version you don't dare show people.**

## 2. TeX: Converging Toward Pi

Among all versioning schemes, the most romantic belongs to Donald Knuth. Starting from 3.0, TeX appends one more digit to the decimal with each bug fix, making the version number approach π infinitely: 3.14 → 3.141 → 3.1415… The current official version is `3.141592653`. Its sister program METAFONT converges toward the natural constant e. Knuth put it plainly: the number itself is a declaration — the program is only **approaching** completion, not arriving at it. He also stipulated in his will that the "final change" to the version will take place after his death, at which point TeX's version number will be frozen at π, from then on "completely bug-free by definition." Incidentally, the bounty he set for bugs is $2.56 (one hexadecimal dollar), doubling each year, capped at $327.68.

## 3. Firefox: Five Major Versions in One Year

2011 was year one of version number inflation. Mozilla switched to rapid releases, and that year Firefox's trajectory was: Firefox 4 in April, 5 on June 21, 6 on August 16, 7 on September 27, 8 on November 8, 9 on December 20. Meanwhile Chrome had already reached 16, while Firefox had only just climbed ashore from 3.6. Critics said this was a pure "numbers game" to keep users from thinking a small version number meant being behind; supporters argued that each release could indeed be incompatible with the previous one, so bumping MAJOR was technically defensible.

Whichever side is right, it demonstrates one thing: **once a version number is treated as a marketing metric, it decouples from the actual changes in the code.**

## 4. Chrome: Erasing the Numbers to 0.0.0

The best confirmation of the above statement comes precisely from Chrome, which back then forced Firefox to chase version numbers. To combat browser fingerprinting, Chrome rolled out UA reduction, keeping only the major version in the User-Agent version number, zeroing out minor, build, and patch. So what you see is an absurd combination like `Chrome/114.0.0.0`.

Full circle: version numbers were first used for showing off, then treated as fingerprints, and finally deliberately redacted. The numbers are still there; the information is gone.

## 5. Why Windows 9 Isn't Called Windows 9

The most widely circulated explanation is that a prefix check caused the trouble. A large number of old programs identify 95/98 like this:

```c
if (version.StartsWith("Windows 9")) { /* 95 or 98 */ }
```

So once the new system is called "Windows 9," it would fall into this branch, be treated as a fifteen-year-old relic, and compatibility mode would go haywire on the spot. So Microsoft skipped 9 and went straight to Windows 10.

The story is quite complete up to this point, but it **has not been officially confirmed by Microsoft**. Opponents point out that Windows version numbers were never strings, but rather major/minor version pairs in structures like `OSVERSIONINFO` — Windows 95 was 4.0, 98 was 4.1, ME was 4.9. Internally there was no "9" at all. So this anecdote is more likely an after-the-fact urban legend, and the real reason is probably that the marketing department felt 8's reputation was too poor and needed some distance.

This is, in fact, the funniest part of this whole piece: **a story about "an incorrect version check" may itself be an incorrect version check.**

## 6. Those Still Insisting on Speaking Human

- **Ubuntu** uses `YY.MM`: `24.04` means April 2024, no explanation needed.
- **Node.js** uses odd/even to distinguish stability: odd-numbered versions are current releases, even-numbered versions enter LTS.
- **The Linux kernel** simply admits it gave up: Linus said the number 3.0 "means nothing."

So next time you're about to ship 2.0, take a moment to think clearly: did the API actually break, or do you just want the download page to look a bit more lively?

## References

- [Semantic Versioning 2.0.0 Specification](https://semver.org/)
- [TeX is probably bug free but also very conservative — LWN.net](https://lwn.net/Articles/726429/)
- [Why has Firefox jumped so many major version numbers? — Mozilla Support](https://support.mozilla.org/en-US/questions/885485)
- [User-Agent Client Hints — Chrome for Developers](https://developer.chrome.com/docs/privacy-security/user-agent-client-hints)
- [Why "Windows 10" wasn't chosen because of developers checking "Windows 9" — GitHub Gist](https://gist.github.com/sixlettervariables/5571cecb5a9d04b41d03)