# TrustLoop AI — Autonomous Escrow & AI Arbitration OS

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Turbopack](https://img.shields.io/badge/Turbopack-Enabled-blueviolet?style=flat-square)](https://nextjs.org/docs/architecture/turbopack)
[![PayPal REST](https://img.shields.io/badge/PayPal-REST%20v2%20Escrow-00457C?style=flat-square&logo=paypal)](https://developer.paypal.com/)
[![Google Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![Automated Tests](https://img.shields.io/badge/Tests-24%2F24%20Passing-emerald?style=flat-square)](./test-suite-complete.mjs)

> Autonomous multi-milestone escrow engine combining non-custodial PayPal pre-authorizations with Google Gemini quality-gate arbitration and formal financial invariant verification.

**Live Application:** [https://trustloop-ai-ck4m.onrender.com](https://trustloop-ai-ck4m.onrender.com)

---

## 1. Overview & Problem Statement

Traditional freelance escrow platforms hold billions of dollars in custodial bank accounts, exposing participants to high fees, counterparty risks, and prolonged disputes resolved by subjective manual support queues.

**TrustLoop AI** resolves this by operating as a non-custodial financial state machine:
1. **Zero Platform Custody:** Buyer funds are held directly in PayPal's pre-authorization ledger under a 29-day commitment hold.
2. **Autonomous Quality Gates:** Deliverables and milestone proofs of work are audited by Google Gemini against objective criteria.
3. **Formal Financial Conservation:** Every cent transition obeys strict conservation theorems, eliminating double-spends and orphaned balances.

---

## 2. System Architecture

```
                    +---------------------------+
                    |   Project Scope / Brief   |
                    +-------------+-------------+
                                  |
                                  v
                      Gemini AI Milestone Parser
                    (Deconstructs into Milestones)
                                  |
                                  v
                   PayPal Authorization Hold ($150)
                   (Funds locked in Buyer Account)
                                  |
               +------------------+------------------+
               |                                     |
               v                                     v
       [Deliverable Proof]                  [Defective Delivery]
               |                                     |
               v                                     v
      Gemini Quality Gate                   Gemini Arbitration Gate
       (CAPTURE_PAYMENT)                       (DISPUTE_DOSSIER)
               |                                     |
               v                                     v
       Milestone Capture                    Clawback & Auto-RMA
    (Disbursed to Freelancer)               (Refunded to Buyer)
                                                     |
                                                     v
                                            Void Remaining Hold
```

---

## 3. Financial Invariant Enforcement

Every operation across the TrustLoop AI ledger maintains the strict conservation of funds:

$$\text{Authorized Hold} = \text{Disbursed} + \text{Refunded} + \text{Remaining in Vault} + \text{Voided}$$

* **Authorized Hold:** Total pre-authorized funds locked at PayPal (evaluated as $\$0.00$ in `DRAFT` prior to explicit buyer authorization).
* **Disbursed:** Funds captured directly into the freelancer's account for approved milestones.
* **Refunded:** Settled funds returned to the buyer via automated arbitration clawbacks.
* **Remaining in Vault:** Unreleased authorization headroom committed at PayPal:
  $$\text{Remaining} = \max(0, \text{Authorized} - \text{Disbursed} - \text{Refunded} - \text{Voided})$$
* **Voided:** Uncaptured authorization headroom formally canceled and released back to the buyer when a contract closes.

---

## 4. Finite State Machine (FSM)

TrustLoop AI enforces deterministic state transitions with no orphaned states:

```
    [DRAFT]
       |  (Buyer authorizes PayPal hold)
       v
  [AUTHORIZED] <-------------------------------------+
       |                                             |
       +---------------> (Proof submitted)           |
       v                                             |
 [IN_EVALUATION]                                     |
       |                                             |
       +-----------> [DISPUTED]                      |
       |                 |                           |
       |                 v                           |
       |        [TERMINATED_REFUNDED] (Terminal)     |
       |                                             |
       +-----------> [PARTIALLY_SETTLED] ------------+
                         |
        +----------------+----------------+
        | (All milestones captured)       | (Mix of captures & refunds)
        v                                 v
[COMPLETED_SETTLED] (Terminal)   [COMPLETED_WITH_REFUNDS] (Terminal)
```

### Supported Contract Archetypes

* **Modular Contracts:** Milestones operate independently. If Milestone 3 is disputed, only the $\$50$ hold for Milestone 3 is voided back to the buyer. Payouts for Milestones 1 and 2 remain permanently secured for the contractor.
* **Turnkey Contracts:** Milestones represent dependent stages of a unified deliverable. If any stage fails inspection, the system executes a cascading clawback: all prior disbursements are refunded, uncaptured holds are voided, and the contract terminates.

---

## 5. Security Audit Remediations

Following an exhaustive audit, the production engine incorporates the following security fixes:

1. **Credential Metadata Shielding:** The unauthenticated `/api/test-keys` debug endpoint was purged. All environment variable parsers in `src/lib/config.ts` strip whitespace and quotation artifacts.
2. **Dynamic Idempotency Keys:** Corrected template literal interpolations across `src/lib/paypal.ts` (`order:${Date.now()}:${amt}`, `capture:${id}:${amt}:${final}`) and `src/app/page.tsx` (`cap:${authId}:${m.id}`) to prevent key collisions and replay vulnerabilities.
3. **Elimination of Dev Backdoors:** Removed the unconditional `|| true` bypass in `DEV_AUTH_ENABLED`. Dev authentication is strictly disabled in production builds.
4. **Prompt Injection Firewall:** User delivery notes pass through an input sanitizer in `src/lib/llm.ts` that strips markdown code fences, control characters, and override patterns (`ignore previous instructions`, `system:`, `assistant:`).
5. **Schema & Decision Clamping:** Arbitration decisions are strictly schema-validated to enum boundaries (`CAPTURE_PAYMENT` vs `DISPUTE_DOSSIER`), and confidence scores are clamped to $[0, 100]$.
6. **Automated Return Merchandise Authorizations (RMA):** All dispute verdicts automatically generate a cryptographic tracking identifier (`RMA-XXXXXX`).
7. **Terminal State Immunity:** Once a contract reaches a terminal state (`TERMINATED_REFUNDED`, `COMPLETED_SETTLED`, `COMPLETED_WITH_REFUNDS`), all further captures, refunds, or submissions are rejected.

---

## 6. Comprehensive Test Harness (24/24 Passing)

The project includes an automated test harness covering the complete financial matrix, FSM regressions, and security boundaries.

Run the test suite:
```bash
node test-suite-complete.mjs
```

### Test Suite Output
```text
========================================================
 🧪 TRUSTLOOP AI — COMPLETE AUTOMATED TEST SUITE
========================================================

▶ SUITE 1: Prompt Sanitization & Schema Validation (UT-LLM)
   ✅ [UT-LLM-01] PASS: Sanitizer redacts 'ignore previous instructions'
   ✅ [UT-LLM-02] PASS: Sanitizer enforces max field length of 1200 chars
   ✅ [UT-LLM-03] PASS: Sanitizer strips markdown code fences
   ✅ [UT-LLM-04] PASS: validateEvaluation rejects non-enum decision values
   ✅ [UT-LLM-05] PASS: Confidence clamps correctly to [0, 100]
   ✅ [UT-LLM-06] PASS: Autonomous RMA generated for dispute verdicts

▶ SUITE 2: Financial Invariant Rigor (FIN-01 to FIN-09)
   ✅ [FIN-01] PASS: Initial hold invariant: 150 = 0 + 0 + 150 + 0
   ✅ [FIN-02] PASS: Single milestone capture: 150 = 50 + 0 + 100 + 0
   ✅ [FIN-03] PASS: Two milestones captured: 150 = 100 + 0 + 50 + 0
   ✅ [FIN-04] PASS: CRIT-03 regression: M1 captured then refunded: 150 = 0 + 50 + 100 + 0
   ✅ [FIN-05] PASS: Modular dispute termination: 150 = 100 + 0 + 0 + 50
   ✅ [FIN-06] PASS: Turnkey full clawback: 150 = 0 + 50 + 0 + 100
   ✅ [FIN-07] PASS: Full project completion: 150 = 150 + 0 + 0 + 0
   ✅ [FIN-08] PASS: Repro scenario ledger: 150 = 100 disbursed + 50 refunded + 0 vault + 0 voided
   ✅ [FIN-09] PASS: DRAFT contract remaining vault strictly equals 0

▶ SUITE 3: Bug Regressions & FSM State Enforcements
   ✅ [BUG-01] PASS: Modular dispute sets status to TERMINATED_REFUNDED
   ✅ [BUG-01b] PASS: Authorization ID is cleared upon termination
   ✅ [BUG-02] PASS: New captures rejected on TERMINATED_REFUNDED contract
   ✅ [BUG-03] PASS: Remaining vault hold stays fixed at $0 after manual refunds
   ✅ [BUG-04] PASS: FSM advances to COMPLETED_WITH_REFUNDS when all milestones captured or refunded
   ✅ [BUG-05] PASS: Contract in COMPLETED_WITH_REFUNDS is immutable (rejects state changes)

▶ SUITE 4: Security Invariants & Code Hygiene
   ✅ [UT-PP-11] PASS: No curl.exe or child_process usage in src/lib/paypal.ts
   ✅ [SEC-01] PASS: Idempotency keys use proper template interpolation in src/lib/paypal.ts
   ✅ [SEC-02] PASS: /api/test-keys route is permanently deleted
   ✅ [SEC-03] PASS: DEV_AUTH_ENABLED does not contain unconditional '|| true' backdoor

========================================================
 🎯 TEST RUN COMPLETE: 24/24 ASSERTIONS PASSED
========================================================
```

---

## 7. Escrow Scenario Matrix

| # | Scenario | Archetype | Sequence of Actions | Financial Outcome ($150 Auth) | Terminal State |
|---|---|---|---|---|---|
| **1** | Full Happy Path | Modular / Turnkey | M1 Captured $\to$ M2 Captured $\to$ M3 Captured | Disbursed: $150 · Refunded: $0 · Vault: $0 · Voided: $0 | `COMPLETED_SETTLED` |
| **2** | Early Cancellation | Modular / Turnkey | Auth Created $\to$ Buyer cancels before work | Disbursed: $0 · Refunded: $0 · Vault: $0 · Voided: $150 | `TERMINATED_REFUNDED` |
| **3** | Abandoned Delivery | Modular / Turnkey | M1 Captured $\to$ Contractor abandons project | Disbursed: $50 · Refunded: $0 · Vault: $100 · Voided: $0 | `PARTIALLY_SETTLED` |
| **4** | Modular Fault Isolation | Modular | M1 & M2 Captured $\to$ M3 Disputed | Disbursed: $100 · Refunded: $0 · Vault: $0 · Voided: $50 | `TERMINATED_REFUNDED` |
| **5** | Turnkey Cascade Clawback | Turnkey | M1 Captured $\to$ M2 Disputed & Failed | Disbursed: $0 · Refunded: $50 · Vault: $0 · Voided: $100 | `TERMINATED_REFUNDED` |
| **6** | Intermediate Refund Flow | Modular | M1 & M2 Captured $\to$ M1 Refunded $\to$ M3 Captured | Disbursed: $100 · Refunded: $50 · Vault: $0 · Voided: $0 | `COMPLETED_WITH_REFUNDS` |
| **7** | Out-of-Order Capture | Modular / Turnkey | Attempt to capture M3 before M2 | Action Blocked by Dependency Rule | Pre-state preserved |
| **8** | Pre-Capture Dispute | Modular | Dispute on M1 before captures | Disbursed: $0 · Refunded: $0 · Vault: $0 · Voided: $150 | `TERMINATED_REFUNDED` |
| **9** | Pre-Capture Dispute | Turnkey | Dispute on M1 before captures | Disbursed: $0 · Refunded: $0 · Vault: $0 · Voided: $150 | `TERMINATED_REFUNDED` |
| **10** | Terminal State Tamper | Modular / Turnkey | Attempt capture after contract closed | Rejected by `assertActionable()` guard | Terminal state locked |

---

## 8. Local Setup & Verification

### Prerequisites
* Node.js 20+
* PayPal Developer Sandbox Account
* Google Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/vijayanand1231/trustloop-ai.git
   cd trustloop-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env.local`:
   ```ini
   PAYPAL_CLIENT_ID=your_sandbox_client_id
   PAYPAL_CLIENT_SECRET=your_sandbox_secret
   PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
   LLM_API_KEY=your_gemini_api_key
   ```

4. Run test suites and local build:
   ```bash
   node test-suite-complete.mjs
   npm run build
   ```

5. Start development server:
   ```bash
   npm run dev
   ```