# TrustLoop AI — Autonomous Escrow & Arbitration OS

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![Test Suite](https://img.shields.io/badge/tests-27%2F27_passed-brightgreen)](#)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.5-black)](#)
[![PayPal](https://img.shields.io/badge/PayPal-v2_REST-blue)](#)
[![Gemini](https://img.shields.io/badge/Gemini-Flash--Lite-orange)](#)

A non-custodial milestone escrow system powered by **PayPal v2 pre-authorizations** and **Google Gemini quality arbitration**, eliminating freelance/agency dispute deadlocks through mathematical zero-drift financial invariants and autonomous resolution.

## 💡 The Problem

Over **$2 Billion is lost annually** to freelance, agency, and B2B deliverable disputes. Traditional escrow platforms suffer from two systemic architectural flaws:
1. **Centralized Custodial Honeypots:** Platforms pool client funds into omnibus bank accounts, introducing high regulatory overhead and counterparty risk.
2. **The 3-Week Dispute Deadlock:** When a deliverable is defective, human customer support queues freeze accounts for 14–21 days, halting downstream project momentum.

## 🚀 The Solution: TrustLoop AI

TrustLoop transforms contracts into autonomous, self-reconciling financial state machines. 

Funds never leave PayPal's native authorization rail until deliverable milestones are verified by an AI quality gate. If a deliverable fails, Gemini mints an autonomous **Reasoning Memorandum of Arbitration (RMA)** and triggers an instant, zero-human-intervention refund or clawback.

### Core Features

* **Non-Custodial Pre-Authorization Vault:** Utilizes PayPal `intent=AUTHORIZE` to lock funds directly in the buyer's account. Zero platform custody.
* **Domain-Aware Contract Archetyping:**
  * **Turnkey (Hardware/Physical):** Strict interdependency. If a downstream stage fails (e.g., waterproof testing), it retroactively invalidates previous stages and triggers a full PayPal authorization void/clawback.
  * **Modular (Software/SaaS):** Independent sprint integrity. Completed milestones retain disbursed funds; disputed milestones are selectively refunded.
* **Gemini Flash-Lite Automated Arbitration:** Freelancers submit proof artifacts. Gemini evaluates specification compliance, issuing either a an automated PayPal capture or an autonomous refund.
* **The FSM Remedy Arc:** A robust Finite State Machine (FSM) that allows contractors to resubmit proof for refunded milestones. Upon AI re-approval, the UI re-opens the milestone for capture within the authorization's remaining headroom.
* **Live Audit Trail & RMA Event Ledger:** A real-time, terminal-style chronological event log surfacing FSM state changes, AI verdicts, and signed RMA artifacts.

---

## 🧮 The Zero-Drift Financial Invariant

TrustLoop operates on a strict, mathematically verified 5-column ledger. At any given microsecond in the contract lifecycle, the state satisfies this zero-drift identity:

$$ \text{Authorized Hold} = \text{Disbursed} + \text{Refunded} + \text{Voided} + \text{Remaining Vault} $$

Our automated test suite continuously asserts this formula across single captures, partial refunds, complete clawbacks, and terminal settlements, ensuring zero cent rounding drift.

---

## 🧪 Comprehensive Verification (27/27 Automated Assertions)

The codebase includes a rigid local test harness (`test-suite-complete.mjs`) executing 27 discrete assertions across 5 suites:
1. **Prompt Sanitization & Guardrails:** Validates payload redaction, 1,200-char limits, and rigid enum schema enforcement.
2. **Financial Invariant Rigor:** Tests 9 discrete state mutations to prove the zero-drift accounting formula.
3. **FSM State Enforcements:** Prevents double-captures, locked-state mutations, and dependency bypassing.
4. **Security & Hygiene:** Asserts missing backdoors, strict `X-Idempotency-Key` injection, and clean routes.
5. **UI & Audit Verification:** Ensures the chronological FSM ledger and RMA artifacts render correctly on state shifts.

To run the test suite:
```bash
node test-suite-complete.mjs
```

---

## 🏗️ Enterprise Production Roadmap (V2)

To scale this MVP into a production-grade institutional platform, our architecture specification includes:

1. **Immutable Event-Sourcing & Persistence:** Transitioning from stateless client orchestration to PostgreSQL with Prisma, accompanied by event-sourced replay streams to reconstruct FSM states across sessions.
2. **Dual-Layer Webhook DLQ Architecture:** Implementing background asynchronous reconciliation for `PAYMENT.AUTHORIZATION.VOIDED` and `CUSTOMER.DISPUTE.CREATED` events via HMCA-SHA256 signature verification.
3. **Byzantine Fault-Tolerant Multi-Model Quorum:** Upgrading arbitration from a single model to a 2-of-3 quorum consensus engine (Gemini Flash-Lite + Claude Sonnet + GPT-4o) for high-value escrows (>$10,000), supplemented by an escrow-bonded human appeal window.
4. **Multi-Currency Escrow & FX Locking:** Introducing support for PayPal’s 25+ global settlement currencies (EUR, GBP, JPY) using spot rate-locking at authorization creation to prevent cross-border FX drift during clawbacks.

---

## 💻 Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/trustloop-ai.git
   cd trustloop-ai
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables (`.env.local`):
   ```env
   PAYPAL_CLIENT_ID=your_paypal_client_id
   PAYPAL_CLIENT_SECRET=your_paypal_secret
   GEMINI_API_KEY=your_gemini_api_key
   ```
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```

*Built for the Agentic AI Hackathon.*