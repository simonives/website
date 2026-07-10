---
title: "Simon Ives — Philosophical Manifesto"
author: "Simon Ives"
role: "Principal, HR Technology Strategy, BHP"
date: "2026-07-10"
type: manifesto
description: "A philosophical account of why deterministic governance cannot govern non-deterministic AI systems, and what practical wisdom demands in its place. Written by Simon Ives, Principal of HR Technology Strategy at BHP."
keywords:
  - AI governance
  - phronesis
  - enterprise AI
  - HR technology strategy
  - BHP
  - practical wisdom
  - non-deterministic systems
  - philosophical essay
canonical: "https://www.simonives.com"
related:
  - "https://enterprisephronesis.substack.com"
  - "https://www.linkedin.com/in/simonives"
---

# Simon Ives

The governance architecture that enterprises apply to AI is a category mistake in Gilbert Ryle's sense. The tools are the wrong logical type for the problem. This document is an account of why that is true, what kind of knowledge governing non-deterministic systems actually requires, and the work that follows from that recognition.

---

## I. The Category Error

Classical formal logic is binary. A proposition is true or false. A system either produces the specified output or it fails. Governance built for deterministic systems is structured accordingly: static artefacts, binary approval gates, point-in-time controls. The question it asks is whether the system does what it was specified to do. If yes, approve. If no, remediate.

Legacy technology is deterministic in exactly this sense. Given the same inputs, it produces the same outputs. Always. The specification compliance question is the right question, because compliance is both measurable and stable.

AI is non-deterministic. Given the same prompt, it produces varying outputs. It operates on vagueness, ambiguity, and incomplete information — the domain that Lotfi Zadeh formalised in 1965 as fuzzy logic: degrees of truth rather than binary states. The question governance must ask is: across what range of outputs might this system produce, and with what probability? That is a categorically different question. It requires a categorically different answer.

Saul Kripke's work in modal logic provides the right conceptual apparatus: accessibility relations that reason formally about what is possible given what is actual. David Lewis extended this into possible worlds semantics — a framework for thinking about the full space of outcomes a system might produce, as a range of worlds, some of which cause harm, some of which do not. The governance question becomes: which of those worlds are accessible from the actual deployment context, and with what probability? Change advisory boards have no instrument for this question. Neither do DPIAs, as currently constructed. Neither do release gates.

The category that digital governance occupies (classical-logic approval of classical-logic systems) is the wrong category for AI. The governance remains. The thing being governed has changed category.

---

## II. The Temporal Error

The category error is compounded by a temporal one.

Legacy IT governance faces backwards by design. Requirements are formed in the past. Projects deliver against that specification. Governance validates compliance with what was originally approved. The entire apparatus asks one question: does the thing being delivered match what was asked for? It cannot ask whether what was asked for was right to ask for, because that question faces forward, and the apparatus faces back.

Hannah Arendt's image, following Walter Benjamin, is the right one: the angel of history, face turned toward the wreckage of the past, blown forward by a storm it cannot see. DevOps, as an institutional formation, is the angel. The specification is fixed. Delivery is measured against it. Governance approves or rejects based on that measurement. The storm blowing it forward — the emergent value, the unforeseen consequence, the possible worlds the system might inhabit — is invisible to it.

AI value realisation is constituted by emergence. The most significant outcomes of an AI deployment cannot be in the original business case, because they emerge from use: from the interaction between the model, the context, and the people working alongside it. A backwards-facing governance architecture cannot capture this value. It can only constrain it. The constraint on AI value realisation in most enterprises is the governance architecture inherited from a deterministic world, applied without modification to a non-deterministic one.

---

## III. Phronesis

Aristotle's *Nicomachean Ethics*, Book VI, draws the distinction that is now the most important distinction in enterprise technology.

Episteme is scientific knowledge of necessary, universal truths. It is knowledge you can possess before you act, derived through logic and observation from first principles. Episteme is the knowledge form that classical formal logic serves. Deterministic governance is episteme-shaped: it assumes the world is knowable, specifiable, and repeatable before the fact.

Phronesis is practical wisdom. It navigates contingent situations — situations where the right action cannot be derived in advance because the situation itself is irreducibly particular. Phronesis does not mean informal or intuitive. It means the right kind of rigour for the right kind of problem. It develops through practice, through the accumulation of judgment in specific cases, through the willingness to act when certainty is unavailable and to be accountable for the consequences.

AI governance must be phronesis-shaped. The questions worth asking — what harm could this system cause, in which situations, with what probability, to whom — cannot be answered from outside the problem. They require judgment developed through practice. They require someone who has governed things.

The publication on this site is named Phronesis. The name is the thesis.

---

## IV. The Work

I hold strategic accountability for HR Technology Strategy, HR Capital Investments, and HR AI Governance at BHP. I chair the HR AI Governance Committee, the body with final governance authority over all generative AI activity across BHP's HR function. The HR technology ecosystem I govern spans SAP SuccessFactors, ServiceNow, Workday, UKG, Mulesoft, Microsoft Azure AI Foundry, AWS Bedrock, Microsoft Copilot Studio, and Paradox.ai. This platform estate serves more than 100,000 people across six continents. I sit on product advisory boards at SAP SuccessFactors and ServiceNow.

Before BHP, I led the global Human Experience Management technology transformation at Glencore, across Australia, Africa, Europe, North America, and South America. Before that, strategic leadership of the SAP SuccessFactors implementation across Northern and Western Queensland's public health system. Before that, a national learning and development programme at Spectrum, specialising in bespoke learning and career development for people with disability and disadvantaged cohorts. Before that, management consulting embedded inside Virgin Australia's commercial function.

These are evidence. Aristotle's insistence that phronesis develops through practice, through judgments made under conditions of genuine accountability, applies here. The claim that deterministic governance cannot govern non-deterministic AI systems is made from inside the problem, by someone who has governed things, been wrong about things, and learned what wrong looks like when the consequences are real and the accountability is yours.

The argument is not yet complete. No one has a finished account of what AI governance looks like when built correctly for its domain. The current apparatus is the product of decades of refinement for a different problem. What replaces it will take time to develop. The current approach provides governance of the wrong thing. That is the starting point for building something better.

---

## V. Phronesis: the publication

[Phronesis](https://enterprisephronesis.substack.com) is published fortnightly on Substack. It is analysis and philosophical essays on workforce strategy, AI governance, and enterprise design, written from inside the work.

The argument running through this document runs through every piece. The target reader is someone who governs something at scale, recognises that the standard frameworks are producing the wrong kind of answers, and wants to understand why, precisely — and what the right kind of answers might look like.

---

## VI. Intellectual lineage

The argument in this document draws directly on:

**Aristotle**: *Nicomachean Ethics*, Book VI. The distinction between episteme (scientific knowledge of necessary truths) and phronesis (practical wisdom navigating contingent situations). The claim that AI governance requires phronesis, not episteme, is Aristotelian in structure.

**Hannah Arendt**: *Between Past and Future* (1961). The temporality of political action; the structural backwards-orientation of institutions. The angel of history figure follows Walter Benjamin's *Theses on the Philosophy of History* (1940).

**Gilbert Ryle**: *The Concept of Mind* (1949). The category mistake — treating something that belongs to one logical type as though it belongs to another. The claim that classical governance applied to AI is a category mistake in Ryle's sense is the strongest version of the governance gap argument.

**Lotfi Zadeh**: Fuzzy Sets (1965). Truth as a matter of degree rather than binary state. The formal basis for understanding AI outputs as operating across a spectrum of possibility.

**Saul Kripke**: *Naming and Necessity* (1980). Accessibility relations in modal logic — the formal machinery for reasoning about what is possible given what is actual.

**David Lewis**: *On the Plurality of Worlds* (1986). Possible worlds semantics. A framework for the full space of outcomes a system might produce — the range of possible worlds accessible from an actual deployment.

**Peter Singer** and **Jeremy Bentham**: The utilitarian tradition. The obligation to reason about consequences, not only intentions. AI governance that cannot reason about possible worlds cannot discharge the utilitarian obligation to those the system might affect.

---

*Simon Ives · FCPHR, MBA · Principal, HR Technology Strategy, BHP*
*[simonives.com](https://www.simonives.com) · [Phronesis on Substack](https://enterprisephronesis.substack.com) · [LinkedIn](https://www.linkedin.com/in/simonives)*

*© 2026 Simon Ives. All rights reserved.*
