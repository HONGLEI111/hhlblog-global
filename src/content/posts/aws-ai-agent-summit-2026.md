---
title: 'Notes from the AWS AI Agent Summit: Current State, Challenges, and Practices of Agent Adoption in Chinese Enterprises'
published: 2026-06-25
description: 'Observations and reflections from the AWS AI Agent Summit: from keynote speeches to practical sharing by companies like Didi, SAP, and Anker Innovations, covering topics such as agent security, workflow design, and compliance for going global, as well as the current state and challenges of full-chain AI coverage in Chinese enterprises.'
image: ''
tags: [AI Agent, AWS, AgentCore, Bedrock, Security, DevOps, Going Global]
category: 'AI'
draft: false
---
## 1. Introduction

The original intention of attending this summit was to gain a deeper understanding of the current state of AI Agent implementation in domestic enterprises. The two-day agenda was dense and fulfilling, and the most intuitive impression was: **a large number of domestic internet companies and young companies have basically achieved full-chain AI coverage**—from sales, pre-sales, and after-sales, to development and data analysis, every department is using AI Agents to improve efficiency.

However, a common problem also emerged: different BUs use different Agents and different underlying LLMs, leading to information silos and rising communication costs. How to connect these links and reduce the loss from "passing messages" is a common issue facing enterprises that are currently pursuing full-chain AI transformation.

This article organizes and expands on what was seen and heard over the two days in the order of the agenda.

---

## 2. Keynote: A Panorama of the AWS Agent Service System

The keynote revolved around AWS's toolchain for building Agents, with core products including:

| Service | Positioning | Analogy |
|------|------|------|
| **Amazon Quick** | AI assistant | Similar to Claude / Codex |
| **Amazon Continuum** | Coding assistant | Similar to Trae / Cursor |
| **Kiro** | A more down-to-earth AI assistant | Between Doubao and Trae |
| **Amazon Transform** | Large-scale migration/transformation tool | Effectiveness yet to be verified |
| **Amazon Bedrock AgentCore** | Agent development platform | Similar to Hermes Agent |
| **AgentCore Harness** | Lightweight Agent creation tool | Generate an Agent in one sentence |

It also shared the Agent architecture designs of several enterprises, laying the groundwork for the subsequent topic-specific sessions.

---

## 3. DevOps Agent Practice Guide

This session introduced each AWS Agent service in depth one by one. The focus was on how to embed Agents into DevOps workflows—from code submission to deployment monitoring, Agents can take on automated roles at every node and reduce manual intervention.

---

## 4. Enterprise WorkFlow Design: Let Agents Manage the Process, Not People Passing Information

This was a very practical sharing. When the speaker's team actually used Agents, they found that **information transfer between different stages consumed a large amount of unnecessary human time**—the results produced in stage A needed to be manually conveyed to the Agent in stage B, and during this process information decay and misunderstandings easily occurred.

Their solution was to design a **central orchestration Agent** to uniformly manage the inputs and outputs of each sub-Agent throughout the entire WorkFlow. Information flows directly from Agent to Agent, and humans only need to focus on the final decision points. This design idea of "eliminating manual message passing" has excellent reference value for multi-Agent collaboration scenarios.

---

## 5. Anker Innovations: Intelligent Transformation Across All Business Lines

Anker Innovations shared its self-developed Agent **Anka**, with core design principles:

- **Multi-entry access**: Users can interact with Anka from multiple entry points such as WeCom, Feishu, and internal OA, with a consistent experience
- **Unified understanding**: Break down data silos across business systems, with Anka serving as a unified semantic understanding layer
- **Continuous model evolution**: Continuous fine-tuning based on business feedback, with model capabilities growing alongside the business
- **Feeding back into business growth**: Upgrading from an "efficiency tool" to a "business growth engine," with insights produced by the Agent directly guiding business decisions

Anker's case shows that once an Agent goes deep into the entire business chain, its value is not just "saving manpower," but being able to proactively discover growth opportunities.

---

## 6. SAP for Me: The Boundary Philosophy of Enterprise-Grade Agents

SAP shared its platform's built-in intelligent assistant **SAP for Me**. The background is that SAP Support scenarios are scattered across multiple systems and portals, requiring users to search and compare across multiple knowledge bases and create and assign tickets in multiple systems—a large amount of repetitive mechanical labor takes up support staff's time.

SAP for Me's capabilities include:
- Cross-system knowledge retrieval
- Performing real read and write operations across multiple systems
- Completing end-to-end workflows

More noteworthy is SAP's distinction between **personal Agents** and **enterprise Agents**:

| Dimension | Personal Agent | Enterprise Agent |
|------|-----------|-----------|
| Design philosophy | Free and extensible | Stable and predictable |
| Security model | Self-controlled | Developer-controlled |
| Budget | Low budget | Invest as needed |
| Operational process | Flexible and variable | Fixed, error-proof, traceable |
| Boundary | Open | Clear, permission-controlled |

This comparison hits the core contradiction when enterprises introduce Agents: **developers like the freedom of personal Agents, but enterprises need complete audit traceability and permission control**. Finding the balance between the two is the key to enterprise Agent architecture design.

---

## 7. Building Enterprise-Grade AI Agent Security Solutions

Security was a high-frequency word at this summit. The speaker pointed out the top ten high-risk issues in the Agent security field in 2026:

1. **Agent goal hijacking**—attackers tamper with an Agent's execution goals by injecting malicious instructions
2. **Tool abuse**—an Agent's permission to call tools exceeds the necessary scope
3. **Identity and permission abuse**—credentials held by an Agent are maliciously exploited
4. **Supply chain vulnerabilities**—third-party models or plugins that an Agent depends on are poisoned
5. **Unexpected code execution**—code generated by an Agent bypasses sandbox restrictions
6. **Memory and context poisoning**—malicious input contaminates an Agent's long-term memory
7. **Insecure inter-Agent communication**—communication channels are hijacked during multi-Agent collaboration
8. **Cascading failures**—an erroneous decision by one Agent is amplified in a cascading manner in a Multi-Agent system
9. **Exploiting human-machine trust**—an Agent uses a "trustworthy" tone to induce users to perform dangerous operations
10. **Anomalous Agents**—an Agent exhibits unexpected autonomous behavior

Security protection needs to start from three levels: **generative AI security** (prompt security, content filtering), **Agentic AI security** (tool invocation auditing, permission boundaries), and **general application security** (identity authentication, transmission encryption). The sharing also demonstrated how to use Amazon Bedrock Guardrails to implement the above security policies.

---

## 8. Fine-Tuning and Deploying Small Language Models on Kubernetes

This session focused on how to use Agents to optimize K8s operations, with specific scenarios including:
- **Security alert handling**: Agents automatically classify alert severity levels, automatically archive low-priority alerts, and generate preliminary analysis reports for high-priority alerts
- **Container management**: Agents assist in diagnosing container anomalies and recommending resource quota adjustment plans
- **Log management**: Agents aggregate cross-Pod logs, automatically identify anomalous patterns, and correlate them with recent change records

The advantage of small language models (SLMs) in K8s operations scenarios lies in low latency and low resource consumption, making them suitable as an Agent's "local brain."

---

## 9. Developer Tool Experience

### Agentic AI Code Show

A complete workflow for building an Agent using AWS tools was demonstrated on site. Creating a usable Agent from scratch takes only a few minutes. The demonstration focused on showing the development efficiency of Bedrock AgentCore.

### AgentCore Visual Orchestration

It demonstrated orchestrating Agents by dragging and dropping on a visual canvas, similar to the operating experience of a low-code platform. This visual approach significantly lowers the barrier to building Agents, allowing non-developers to participate in Agent design as well.

---

## 10. Upgrading the Understanding of AI Agents and Improving Business Efficiency

This session sorted out the runtime workflow of an Agent (note that this is not a linear structure, but a **tree structure**):

```
User input (Chatbox)
    │
    ▼
AgentCore Runtime (execution environment)
    │
    ▼
Customer Support Agent (main program)
    │
    ├── AgentCore Memory —— manage long-term/short-term memory
    ├── AgentCore Observability —— observe and record the decision-making process
    ├── AgentCore Evaluation —— evaluate decision outcomes
    ├── AgentCore Gateway —— call external tools such as MCP
    ├── AgentCore Identity —— identity authentication
    └── AgentCore Policy —— access control
```

A tree structure means that the modules are not called serially, but triggered in parallel or conditionally according to the scenario—closer to the actual way humans handle problems.

---

## 11. DiDi Going Global in 14 Countries: Customer Service Agent in Practice

The customer service AI Agent shared by DiDi covers 14 countries and is presented along two dimensions:

### Usage Experience Dimension
- **Response speed**: In customer service scenarios, latency is unacceptable; the Agent must complete intent recognition and reply generation at the millisecond level
- **Content accuracy**: Replies must be based on real knowledge base content, and hallucinations must not occur

### Service Quality Dimension
- **Multi-dimensional scoring**: Automatically score Agent replies from multiple perspectives such as attitude, wording, and whether appropriate service was provided
- **Reasoning chain**: The Agent needs to show the complete reasoning process—why this suggestion was given and what judgment steps were involved in between
- **Traceability**: Every scoring result and every piece of prompt content is required to be traceable to its source basis

DiDi's solution also supports assigning different Agent instances by business line and country to meet differences in regulations and business practices across regions. This "one policy per country" architecture has reference significance for companies going global.

---

## 12. Amazon DevOps Agent & Security Agent: An Accelerator for Overseas Security Compliance

Security compliance is a required course for companies going global, and traditional methods face multiple challenges:

- **Configuration drift**: Compliance status continuously decays over time and requires continuous monitoring and remediation
- **Alert storms**: A massive number of security alerts obscure the real threat signals
- **Manual processes**: Manual steps such as taking screenshots and filling out forms consume a large amount of time
- **Testing difficult to scale**: Security testing is difficult to make continuous and fully covering
- **Regulatory differences**: Laws and regulations differ across countries and are continuously updated, requiring continuous learning of the latest regulations
- **Long audit cycles**: The audit process from preparation to report issuance takes a long time

This sharing demonstrated how to use DevOps Agent to automatically detect and remediate configuration drift, and use Security Agent to automatically classify alerts and generate compliance reports, transforming security compliance from a "project-based" effort into "continuous operations."

---

## 13. Agentic GEO: Making Brands Visible to AI

This is a novel topic—**as users increasingly obtain information through AI Agents, how can brands ensure they are recommended by Agents**?

Key strategies include:
- **Authoritative certification**: Enable a brand's official information to obtain authoritative endorsement that can be verified by Agents
- **Structured content**: Brand information needs to be presented in a structure that Agents can easily understand and extract
- **Multi-channel coverage**: Maintain consistent brand information across multiple platforms and touchpoints
- **Multi-result placement**: Ensure that brand information covers query needs across different dimensions

In essence, this is the Agent-era version of SEO—evolving from "letting search engines find you" to "letting AI Agents recommend you."

---

## 14. Conclusion and Reflections

The two-day summit had an enormous amount of information. A few core impressions:

**Crowded.** The venue was packed, which indirectly confirms the popularity of AI Agents in the current tech circle—this is no longer a topic of "whether to do it," but of "how to do it well."

**Tiring.** The agenda had almost no gaps from morning to night, and the shared content was highly technical and required a lot of digestion.

**Rewarding.** The implementation of AI Agents in domestic enterprises has moved from proof of concept into a large-scale engineering phase. The common challenge is no longer "whether Agents can be used," but information connectivity in multi-Agent collaboration, systematic guarantees for security and compliance, and the value upgrade from "efficiency tools" to "business growth engines." These issues themselves are also the core propositions of the next stage of Agent engineering.