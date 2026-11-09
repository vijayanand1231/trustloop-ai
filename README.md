# TrustLoop AI — Autonomous Escrow & AI Arbitration OS

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![PayPal REST API v2](https://img.shields.io/badge/PayPal-v2_Sandbox-00457C?style=flat&logo=paypal)](https://developer.paypal.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash--Lite-8E75B2?style=flat&logo=google)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

> Autonomous, archetype-aware escrow operating system pairing Google Gemini deliverable arbitration with PayPal's two-step Authorization, Partial Capture, Void, and Refund lifecycle.

---

## 💡 Overview & Problem Statement

Over $100B in freelance and procurement contracts flow through escrow services each year. Traditional dispute arbitration suffers from critical flaws:
* **Protracted Resolution:** Manual mediation takes 14 to 45 days while escrow balances sit frozen.
* **High Intermediary Fees:** Platforms extract 10%–20% of contract value.
* **One-Size-Fits-All Logic:** Conventional escrows treat all milestones identically, failing to distinguish between independent digital assets and interdependent physical systems.

**TrustLoop AI** eliminates manual mediation by deploying Google Gemini as an autonomous quality arbiter directly integrated with PayPal's authorization lifecycle (`intent: "AUTHORIZE"` → partial `CAPTURE` / `REFUND` / `VOID`).

---

## 🏛️ Core Innovation: Archetype-Aware Arbitration

TrustLoop AI models the contract deliverable structure as a first-class policy input:

```
Contract Scope
      │
      ├───────────────────────────────────────────────┐
      ▼                                               ▼
[TURNKEY ARCHETYPE]                         [MODULAR ARCHETYPE]
Physical Hardware / IoT / Manufacturing     Software / Digital Assets / Design
      │                                               │
Downstream Default Detected                  Downstream Default Detected
      │                                               │
      ▼                                               ▼
• Full Contract Clawback                    • Localized Milestone Isolation
• Upstream disbursements refunded via API    • Upstream earnings preserved for contractor
• Remaining vault hold voided via PayPal     • Only uncaptured vault headroom is voided
• Disbursed: $0.00 USD                       • Disbursed: Preserved (e.g. $100.00 USD)
```

1. **`TURNKEY` (Hardware / Physical Manufacturing):** Interdependent deliverables. If Stage 2 (Mass Production Calibration) fails due to cracked casings or breached IP67 seals, Stage 1 prototypes retain zero standalone value to the buyer. Downstream default triggers an automated **Full Contract Clawback** (refunding prior milestone payouts and voiding remaining vault headroom).
2. **`MODULAR` (Software / SaaS / Design):** Standalone deliverables. If Stage 3 (CI/CD Deployment) fails, Stage 1 (Figma UX) and Stage 2 (REST API backend) retain independent commercial utility. Default isolates to the failed milestone—prior earnings are preserved for the contractor, and only uncaptured hold funds are released back to the buyer.

---

## 🔄 Finite State Machine & Financial Invariants

The platform is governed by a deterministic Finite State Machine (FSM):

```
[DRAFT] ──> [AUTHORIZED] ──> [IN_EVALUATION] ──> [PARTIALLY_SETTLED] ──> [COMPLETED_SETTLED] (Terminal)
                  │                  │                   │
                  │                  └─── [DISPUTED] ────┘
                  │                             │
                  └──────── (Resolve) ──────────┴─> [TERMINATED_REFUNDED] (Terminal)
```

### The Financial Invariant Equation
To guarantee accounting integrity across every permutation of partial captures, voids, and clawbacks, the ledger strictly enforces:

$$\text{Authorized Hold} = \text{Disbursed} + \text{Refunded} + \text{Remaining in Vault} + \text{Voided}$$

---

## 🔒 Security & Gateway Hardening

* **Prompt-Injection Sanitization:** Delivery notes and proof URLs are scrubbed of adversarial control tokens (`ignore previous instructions`, `you are now`, code fences) before evaluation.
* **Separated Role Messaging:** Gemini executes via native `systemInstruction` parameters rather than user-turn string interpolation.
* **Strict Schema Validation:** LLM responses are validated against typed schemas (`decision` enum, clamped `confidence` [0, 100], and autonomous `RMA-xxxxxx` pattern validation).
* **Idempotent Payment Operations:** Every PayPal mutation transmits deterministic `PayPal-Request-Id` and `X-Idempotency-Key` headers to prevent double-capture or double-refund race conditions.
* **Real Lifecycle Conformance:** Cancellation calls trigger live `POST /v2/payments/authorizations/{id}/void` requests (HTTP 204), releasing buyer credit encumbrances immediately.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js:** v18.17.0+ or v20+
* **PayPal Developer Account:** Access to [PayPal Developer Dashboard](https://developer.paypal.com/) with Sandbox credentials.
* **Google Gemini API Key:** An active key from [Google AI Studio](https://aistudio.google.com/).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/trustloop-ai.git
   cd trustloop-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   Populate `.env.local`:
   ```ini
   PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
   PAYPAL_CLIENT_SECRET=your_paypal_sandbox_secret
   PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
   LLM_API_KEY=your_gemini_api_key
   NEXT_PUBLIC_ENABLE_DEV_AUTH=true
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 🧪 Verification & Test Suites

The repository includes test harnesses to verify both PayPal API flows and the FSM state machine:

### 1. FSM Permutation Suite (22/22 Assertions)
Validates all 14 permutation states, including Turnkey clawbacks, Modular dispute isolation, manual refund invariant retention, and terminal action lockouts:
```bash
node test-fsm-permutations.mjs
```

### 2. Live Security & Adversarial Gate Test
Fires prompt injection vectors against the live Gemini quality gate and checks sandbox authorization lifecycle enforcement:
```bash
node test-fsm-scenarios.mjs
```

### 3. Full Pipeline Sandbox Audit
Runs contract decomposition, quality evaluation, PayPal Sandbox authentication, order creation, and capture refunds:
```bash
node test-full-pipeline.mjs
```

---

## 📂 Project Structure

```
trustloop-ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agent/
│   │   │   │   ├── evaluate-proof/       # Gemini deliverable inspection
│   │   │   │   └── parse-milestones/     # Contract brief decomposition
│   │   │   └── paypal/
│   │   │       ├── authorize-order/      # Order authorization
│   │   │       ├── capture-order/        # Milestone settlement capture
│   │   │       ├── client-id/            # Public Sandbox client ID provider
│   │   │       ├── create-order/         # Escrow hold creation
│   │   │       ├── refund-capture/       # Milestone clawback / refund
│   │   │       ├── void-authorization/   # Real POST /void authorization release
│   │   │       └── webhook/              # Async webhook telemetry receiver
│   │   ├── layout.tsx
│   │   └── page.tsx                      # FSM Escrow Dashboard UI
│   └── lib/
│       ├── config.ts                     # Environment configuration loader
│       ├── llm.ts                        # Gemini native caller & schema validator
│       └── paypal.ts                     # PayPal SDK v2 REST client
├── test-fsm-permutations.mjs             # Complete 14-scenario FSM test suite
├── test-fsm-scenarios.mjs                # Security & injection test script
├── test-full-pipeline.mjs                # Standalone end-to-end integration audit
├── LICENSE                               # MIT License
└── package.json
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
