# TrustLoop AI — Master Test Plan & Quality Assurance Matrix

> Comprehensive QA specification for the TrustLoop AI autonomous escrow and arbitration operating system.

---

## 1. Test Environment Matrix

| Environment | Purpose | PayPal Gateway | LLM Engine | Dev-Auth Bypass |
|---|---|---|---|---|
| **LOCAL-DEV** | Workstation development | PayPal Sandbox | Gemini 2.5 Flash-Lite / Regex fallback | Enabled (`NEXT_PUBLIC_ENABLE_DEV_AUTH=true`) |
| **CI / CD** | Automated commit testing | Mocked HTTP fixtures | Mocked LLM JSON fixtures | Disabled |
| **STAGING** | Hackathon live evaluation URL | PayPal Sandbox Live | Gemini Live API | Disabled |
| **PRODUCTION** | Enterprise mainnet deployment | PayPal Live Gateway | Gemini Enterprise Live | Disabled (hard-blocked) |

---

## 2. Unit Test Suite (UT-PP & UT-LLM)

### 2.1 PayPal Gateway Library (`src/lib/paypal.ts`)
* **UT-PP-01 (OAuth Token Caching):** Subsequent calls to `getPayPalAccessToken()` reuse in-memory token within 60s of expiry without re-fetching.
* **UT-PP-02 (Concurrent Token Deduping):** Simultaneous requests share a single pending OAuth promise.
* **UT-PP-03 (Error Parsing):** Upstream PayPal HTTP 401/422 responses surface structured error objects.
* **UT-PP-04 (Order Creation Intent):** `createEscrowOrder` sends `intent: "AUTHORIZE"` and deterministic idempotency headers.
* **UT-PP-05 (Partial Capture Flag):** `captureAuthorizedPayment` sends `final_capture: false` for intermediate stages.
* **UT-PP-08 (Real Authorization Voiding):** `voidAuthorization` sends `POST /v2/payments/authorizations/{id}/void` and handles HTTP 204 No Content.
* **UT-PP-10 (Idempotency Keying):** Identical actions emit deterministic `PayPal-Request-Id` tokens.
* **UT-PP-11 (Cross-Platform Execution):** Zero references to `curl.exe` or OS-specific child processes.

### 2.2 LLM Arbitration Library (`src/lib/llm.ts`)
* **UT-LLM-01 (Prompt Injection Sanitization):** Scrubbing patterns like `"ignore previous instructions"` or `"you are now"` into `[REDACTED]`.
* **UT-LLM-02 (Buffer Truncation):** Input fields exceeding 1,200 characters are safely capped.
* **UT-LLM-03 (Code-Fence Stripping):** Strips markdown fences from untrusted submissions.
* **UT-LLM-04 (Enum Enforcement):** Rejects invalid decisions (e.g. `"MAYBE"`, `"APPROVE"`), throwing schema errors.
* **UT-LLM-05 (Confidence Clamping):** Calibrates confidence scores strictly to the range `[0, 100]`.
* **UT-LLM-06 (Autonomous RMA Generation):** Automatically generates `RMA-XXXXXX` patterns on disputed verdicts.
* **UT-LLM-08 (System/User Role Separation):** Passes instructions via native `systemInstruction` parameter.

---

## 3. Finite State Machine (FSM) & Financial Invariant Tests

```
[DRAFT] ──> [AUTHORIZED] ──> [IN_EVALUATION] ──> [PARTIALLY_SETTLED] ──> [COMPLETED_SETTLED] (Terminal)
                  │                  │                   │
                  │                  └─── [DISPUTED] ────┘
                  │                             │
                  └──────── (Resolve) ──────────┴─> [TERMINATED_REFUNDED] (Terminal)
```

### 3.1 Financial Invariant Equation
Every state mutation must satisfy:
$$\text{Authorized Hold} = \text{Disbursed} + \text{Refunded} + \text{Remaining in Vault} + \text{Voided}$$

* **FIN-01:** Authorized $150 → `Disbursed=0, Refunded=0, Remaining=150, Voided=0` ($150 = 150).
* **FIN-02:** Capture M1 ($50) → `Disbursed=50, Refunded=0, Remaining=100, Voided=0` ($150 = 150).
* **FIN-03:** Capture M1 & M2 ($100) → `Disbursed=100, Refunded=0, Remaining=50, Voided=0` ($150 = 150).
* **FIN-04 (CRIT-03 Regression):** Refund M1 → `Disbursed=0, Refunded=50, Remaining=100, Voided=0` ($150 = 150). Available vault does not falsely re-inflate.
* **FIN-05 (MODULAR Dispute Void):** Capture M1 & M2, Dispute M3, Void → `Disbursed=100, Refunded=0, Remaining=0, Voided=50` ($150 = 150).
* **FIN-06 (TURNKEY Clawback):** Capture M1, Dispute M2, Clawback → `Disbursed=0, Refunded=50, Remaining=0, Voided=100` ($150 = 150).

---

## 4. Regression & Edge-Case Suite

| Test ID | Scenario | Pass Condition |
|---|---|---|
| **BUG-01** | Modular M3 Dispute Void (CRIT-01) | Calls `voidAuthorization()`, locks M3 with `Voided` badge, transitions to `TERMINATED_REFUNDED`, locks all buttons. |
| **BUG-02** | Post-Termination Click Attempt | `assertActionable()` alerts "Contract finalized" and blocks state mutation. |
| **BUG-03** | Post-Termination Manual Refund | Financial invariant strictly accounts for refunded amounts; vault remaining stays $0.00. |
| **EDGE-01** | Rapid Double-Click Capture | Client-side `inflightRef` set debounces concurrent submissions. |
| **EDGE-04** | Scope Tampering Once Authorized | Step 1 textarea and extraction buttons are disabled once `contractStatus !== "DRAFT"`. |
| **SEC-01** | Adversarial Jailbreak Payload | Prompt sanitization neutralizes injection; quality gate returns `DISPUTE_DOSSIER` on defective goods. |

---

## 5. End-to-End Choreography Scripts

### Script A: Turnkey Hardware Contract (Interdependent Physical Asset)
1. Load Hardware Preset ($150 total: Prototype, Calibration, Final Delivery).
2. Gemini classifies archetype as **`TURNKEY`** (Policy: Downstream default triggers full clawback).
3. Buyer authorizes $150 hold.
4. Milestone 1 passes inspection → Captured ($50 disbursed).
5. Milestone 2 fails inspection (breached IP67 seals, shattered casing) → Gemini issues **`DISPUTE_DOSSIER`** with `RMA-839214`.
6. Click **Void Hold & Full Turnkey Clawback** → System refunds M1's $50 payout and voids the remaining $100 hold via PayPal API. Status locks in **`TERMINATED_REFUNDED`** ($0 disbursed, $50 refunded, $100 voided).

### Script B: Modular Software Contract (Standalone Digital Asset)
1. Load Software Preset ($150 total: Figma UX, Backend API, CI/CD Deployment).
2. Gemini classifies archetype as **`MODULAR`** (Policy: Standalone value preserved for completed stages).
3. Buyer authorizes $150 hold.
4. Milestone 1 captured (50disbursed)andMilestone2captured(50 disbursed).
5. Milestone 3 fails deployment testing → Gemini issues **`DISPUTE_DOSSIER`**.
6. Click **Void Remaining Vault Hold** → Contractor keeps $100 for completed stages; remaining $50 hold is voided to buyer. Status locks in **`TERMINATED_REFUNDED`** ($100 disbursed, $0 refunded, $50 voided).
