---
title: 'Andrew Yao on the First Principles of AI: The Power and Limits of Artificial Intelligence'
published: 2026-08-04
description: 'Turing Award winner Andrew Yao examines the boundaries of AI''s capabilities from the perspective of computation theory at the WAIC Thinkers Forum: what it can and cannot do, and how quantum AI could become the next paradigm for scientific exploration.'
image: ''
tags: [AI, Artificial Intelligence, Andrew Yao, WAIC, Quantum AI, AI for Science, Large Language Models]
category: 'AI'
draft: false
---
## 1. Introduction

On July 19, 2026, at the Thinkers Forum of the World Artificial Intelligence Conference (WAIC) in Shanghai, Turing Award laureate, Academician of the Chinese Academy of Sciences, and Dean of the Institute for Interdisciplinary Information Sciences and the School of Artificial Intelligence at Tsinghua University, **Andrew Yao**, delivered a speech that went "against the tide."

At a time when virtually everyone in the AI industry is talking about what AI can do, he chose a different angle — "**The First Principles of AI: The Power and Limitations of Artificial Intelligence**." Starting from computation theory, mathematics, and logic, he calmly and profoundly dissected the true boundaries of AI.

This speech was extremely information-dense. Yao did not talk about model parameters, benchmarks, or product deployment, but instead returned to the most fundamental questions: **What exactly is AI? What can it do? What can it never do?**

This article organizes the core content of the speech into the following sections.

---

## 2. The Essence of AI: Turing Machine + Data

Yao stated at the outset: to understand the boundaries of AI's capabilities, one must first understand the **essence** of AI.

Modern AI relies heavily on the "machine learning" framework: given a task and a model template determined by parameters θ, there are only two core questions — whether there exists a suitable θ that can accomplish the task (the **representation problem**), and whether it can be found within reasonable time and space costs (the **learning problem**).

What distinguishes it from traditional computer science is that machine learning adds "learning from data" to the algorithm's arsenal — and this is precisely the core reason for AI's tremendous progress in recent years.

But Yao reminds us to return to first principles:

> **The underlying essence of AI is simply a Turing machine equipped with data.**

This definition may seem plain, but it directly determines the upper limit of AI's capabilities. Problems that a Turing machine cannot solve — such as the famous "halting problem" — AI likewise cannot solve. **No matter how large the data or how powerful the compute, it cannot break through the fundamental laws of computation theory.**

---

## 3. The Four Insurmountable Boundaries of AI

Starting from first principles, Yao systematically articulated four fundamental limitations of AI. These are not technical bottlenecks of the "current stage," but **permanent boundaries** determined by mathematics and logic.

### Boundary One: It Cannot Create Truly New Ideas

Einstein's theory of relativity, Turing's computability theory, Gödel's incompleteness theorems, the fundamental framework of quantum mechanics — these breakthroughs from 0 to 1 all required stepping outside existing paradigms.

Large models excel at optimizing and combining within existing paradigms, but cannot create entirely new ones. Because all of its capabilities essentially come from compressing and distilling humanity's existing knowledge. Yao sharply pointed out:

> **It can tell you everything humanity already knows, but it cannot tell you a "secret that no one in the world knows yet."**

### Boundary Two: It Cannot Solve Uncomputable Problems

Ninety years ago, Turing proved a stunning conclusion: **the vast majority of problems in the world are uncomputable.**

The halting problem is just the most famous example. No matter how powerful AI becomes, it is still a computational model and must obey the fundamental laws of computation theory. In Yao's words:

> **The boundary of mathematics is the boundary of AI.**

This is profoundly significant at the philosophical level: human intelligence contains something that "transcends algorithms," and AI cannot reach that domain.

### Boundary Three: It Cannot Give You What Is Not in the Training Data

This boundary is related to the first but has a subtle distinction. AI can perform astonishing integration, reasoning, and re-expression within existing knowledge, but it cannot conjure content **genuinely beyond humanity's existing knowledge system** out of thin air.

Yao emphasized that this is not an engineering problem — not something that "a bit more data, a bit bigger model" can break through. It is an **epistemological limitation**.

### Boundary Four: It Cannot Make True Value Judgments

AI can tell you the optimal path to achieve a goal, but it cannot tell you **which goal you should pursue**.

It can calculate efficiency, optimize parameters, predict outcomes, but "what is good," "what is worth doing," "what is just" — these questions have no training data that can cover them. Value judgments require **subjectivity**, and AI has no subjectivity.

| Four Boundaries | Core Reason | Breakable? |
|---------|---------|-----------|
| Cannot create new ideas | Capabilities come from compression of existing knowledge | ❌ Permanent boundary |
| Cannot solve uncomputable problems | Constrained by fundamental laws of computation theory | ❌ Permanent boundary |
| Cannot exceed training data | Epistemological limitation | ❌ Permanent boundary |
| Cannot make value judgments | Lacks subjectivity | ❌ Permanent boundary |

---

## 4. What AI Can Do: Three Levels

After delineating the boundaries, Yao also clearly mapped out AI's capability landscape. He divided AI's capabilities into three levels:

| Level | Capability Description | Current Status |
|------|---------|---------|
| **Level One: Imitating Humans** | Language understanding, knowledge Q&A, translation, writing, simple reasoning | Has reached or even surpassed average human level |
| **Level Two: Surpassing Humans** | Photographic memory, ultra-high-bandwidth parallel processing, absolute patience and meticulousness, free from bias and emotional interference | Already achieved in multiple domains |
| **Level Three: What Humans Cannot Do** | Solving uncomputable problems, creating truly new ideas | AI also cannot do these |

Levels One and Two have already created enormous value. But understanding the existence of Level Three helps us calibrate our expectations of AI — it is neither omnipotent nor useless.

Yao particularly noted that the traits in Level Two where AI surpasses humans — tirelessness, lack of emotionality, parallel processing — are precisely where its most practical value lies. **Handing grunt work, computation, and optimization to AI is itself a revolution.**

---

## 5. Two Examples AI Cannot Crack

To make the abstract boundaries concrete, Yao gave two examples proving that AI truly has no way forward in certain domains.

### 5.1 Cryptographic Security Under Chosen-Plaintext Attack

Taking the ElGamal public-key encryption system as an example — based on specific mathematical assumptions (the intractability of the discrete logarithm problem), this cryptographic system can be **mathematically proven** to resist attacks from all classical computers, including AI.

This is not "no attack method has been found yet," but rather "if an attack succeeded, it would mean overturning certain foundational mathematical assumptions." What AI encounters here is not an engineering problem, but a mathematical theorem.

### 5.2 Quantum Key Distribution (QKD)

Quantum key distribution leverages the fundamental principles of quantum mechanics — any eavesdropping behavior will inevitably disturb the quantum state, and thus be detected by both communicating parties.

Yao particularly mentioned that China is a world leader in this field: in 2016, it launched the world's first quantum science experiment satellite, "Micius," and has already built a quantum key distribution network covering over **10,000 kilometers** nationwide.

> **In principle, not even God can crack it — unless you overturn quantum mechanics itself.**

What these two examples share is that security does not depend on "the attacker's limited capability," but on **physical laws and mathematical theorems**. AI is powerless in these domains. Understanding this is precisely the foundation for building secure AI systems.

---

## 6. The Next Level of AI: From AI for Science to Science for AI

After delineating the boundaries, Yao turned his gaze to the future. He believes that the most exciting direction for AI in the next 3 to 5 years is **AI for Science** — empowering scientific research with AI.

### 6.1 AI Empowering Astronomy

Yao shared an achievement from a Tsinghua University team: using a neural network called **Asterisk AI** to process early-universe data transmitted back by the James Webb Space Telescope (JWST). Through precise reconstruction of galaxy morphology, the team successfully **pushed humanity's observable timeline back by 100 million years** — approaching a state just 100 million years after the Big Bang.

### 6.2 AI Driving Theoretical Breakthroughs

At a more hardcore theoretical level, two recent examples shook the academic community:

- The **Gemini DeepThink** model solved the "cosmic string problem" that had plagued the physics community for **40 years**
- **OpenAI's latest model** disproved Erdős's "unit distance problem" conjecture proposed 80 years ago — most surprisingly, the proof used esoteric **cyclotomic number theory** techniques that, in the eyes of pure mathematicians, "should not be something AI could think of"

These breakthroughs hint at one thing: AI is not just an engineering tool — it is becoming a **catalyst for scientific discovery**. It can discover connections that human mathematicians have not yet noticed, and can handle data dimensions that humans cannot process simultaneously.

---

## 7. Quantum AI: A New Paradigm Is Emerging

The most exciting part of the speech was Yao's proposal of "the next level of AI."

Current AI is built on the classical Turing machine. But what if we **switch the carrier of learning from a Turing machine to a quantum machine**? Yao posed a core question:

> **Can we, under a more general computational model, accomplish things that even current AI cannot do?**

### 7.1 AI Empowering Quantum Computing

One breakthrough that has already occurred comes from Google. In 2025, Google's **Willow quantum chip** (approximately 100 physical qubits), with the help of the **AlphaQubit** neural network decoder, **reduced the error rate of quantum error correction below the critical threshold for the first time**.

This is a milestone in the field of quantum computing. Without AI's assistance, relying solely on traditional error correction algorithms, this threshold could never be breached. The combination of AI and quantum computing produced a 1+1 > 2 effect.

### 7.2 The Promise of Quantum-Enhanced AI

Conversely, quantum computing will also empower AI. Quantum computers can simulate the quantum behavior of molecules and materials from first principles — a task that classical computers in principle cannot perform efficiently.

Yao's prediction is:

> **In the next 5 to 10 years, quantum AI will make tremendous progress. The novelty of AI will eventually fade, and quantum AI will take the baton, keeping the flame of scientific exploration burning.**

He further painted a vision: quantum AI will achieve breakthrough progress in fields such as **new materials development** and **drug discovery**, realizing the dream of Einstein's generation of scientists to "understand the world from first principles."

---

## 8. A Stirring Warning: Humans Are Becoming More Like AI

There was a passage in the speech that may be the most widely circulated quote from the entire forum. At a time when everyone is worried about AI becoming too much like humans, Yao offered a reverse warning:

> **"Many people worry that AI will become smarter than humans and then rule humanity. I think that worry is premature. Before that day arrives, the greater danger we must first face is this: humans will become more and more like AI."**

This passage is worth pondering. When humans begin to abandon independent thinking, abandon value judgments, abandon the courage to explore, and hand all questions over to AI to answer — the real danger is not AI surpassing humans, but humans themselves descending to AI's level.

Yao's implication is: **AI's boundaries are not a cage, but a mirror.** It reflects what "only humans can do," and also reflects what "humans should not give up."

---

## 9. Six Future Directions Worth Watching

In the concluding section of the speech, Yao listed six future directions he is optimistic about:

1. **AI for Science** — AI empowering scientific discovery, from astronomy to biology to materials
2. **Quantum AI** — Bidirectional empowerment between quantum computing and AI
3. **Reliable Large Model Systems** — Building verifiable, trustworthy AI infrastructure
4. **Mathematics for AI** — Using mathematics to provide theoretical foundations and boundary analysis for AI
5. **AI Safety** — Ensuring safety and controllability alongside capability growth
6. **AI for AI** — Using AI to improve AI itself, and deeply understanding the nature of intelligence

These six directions are not independent, but form a closed loop: AI for Science expands capability boundaries, Science for AI provides theoretical foundations, Mathematics for AI characterizes capability limits, AI Safety ensures controllability, and AI for AI drives self-evolution.

---
## 10. Conclusion

Andrew Yao closed his talk with a single sentence—

> **"AI is not here to replace humans, but to liberate them."**

Hand over the grunt work, computation, and optimization to AI. Leave the creation of new ideas, the exploration of the unknown, and the making of value judgments—things AI can never do—to humans themselves.

At a time when the industry is collectively caught up in the frenzy of chasing ever-higher valuations, this talk by Andrew Yao offers a rare perspective: **seeing AI's limitations clearly is precisely the precondition for humans to make good use of AI.**

Only when you know what cannot be done do you know what is worth doing.

---

> **References**
> - [Yao Qizhi: The First Principles of AI—The Power and Limitations of Artificial Intelligence (Aisixiang)](https://www.aisixiang.com/data/179875.html)
> - [WAIC Special | Yao Qizhi's 10,000-Word Long-Form Speech (Sohu)](https://www.sohu.com/a/1052558614_377096)
> - [Live from WAIC—Will AI Fade from the Headlines? Yao Qizhi Says Quantum AI Will Take Its Place (Tencent News)](https://news.qq.com/rain/a/20260720A09CNQ00)
> - [Live from the Forum | The 2026 World Artificial Intelligence Conference "The First Principles of AI" Thinkers Forum Successfully Held (JUFAIR)](https://www.jufair.com/information/334727.html)
> - [What Exactly Are the First Principles of AI? (Yan'an News Network)](https://www.yanews.cn/guonei/2026/07-23/z1zqOEPk.html)