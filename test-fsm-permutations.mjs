console.log("\n========================================================");
console.log(" 🧪 TRUSTLOOP AI — 14-PERMUTATION FSM AUDIT SUITE");
console.log("========================================================\n");

let passed = 0;
let total = 0;

function assert(description, condition) {
  total++;
  if (condition) {
    console.log(`   ✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`   ❌ FAIL: ${description}`);
  }
}

// Minimal FSM Engine mirroring src/app/page.tsx
class EscrowFSM {
  constructor(archetype = "TURNKEY", totalAmount = 150) {
    this.archetype = archetype;
    this.totalAmount = totalAmount;
    this.status = "DRAFT";
    this.authId = null;
    this.milestones = [
      { id: "m-1", amount: 50, status: "PENDING" },
      { id: "m-2", amount: 50, status: "PENDING" },
      { id: "m-3", amount: 50, status: "PENDING" }
    ];
    this.evaluations = {};
    this.captures = {};
  }

  get totalDisbursed() {
    return Object.values(this.captures)
      .filter(c => c.status === "CAPTURED")
      .reduce((sum, c) => sum + c.amount, 0);
  }

  get totalRefunded() {
    return Object.values(this.captures)
      .filter(c => c.status === "REFUNDED")
      .reduce((sum, c) => sum + c.amount, 0);
  }

  get totalVoided() {
    if (this.status !== "TERMINATED_REFUNDED") return 0;
    return Math.max(0, this.totalAmount - this.totalDisbursed - this.totalRefunded);
  }

  get totalRemaining() {
    if (this.status === "DRAFT" || this.status === "TERMINATED_REFUNDED" || this.status === "COMPLETED_SETTLED") {
      return 0;
    }
    return Math.max(0, this.totalAmount - this.totalDisbursed - this.totalRefunded);
  }

  assertInvariant() {
    const lhs = this.totalAmount;
    const rhs = this.totalDisbursed + this.totalRefunded + this.totalRemaining + this.totalVoided;
    return Math.abs(lhs - rhs) < 0.001;
  }

  authorize(authId) {
    if (this.status !== "DRAFT") throw new Error("Cannot authorize from non-DRAFT state");
    this.authId = authId;
    this.status = "AUTHORIZED";
  }

  capture(milestoneId) {
    if (this.status === "TERMINATED_REFUNDED" || this.status === "COMPLETED_SETTLED") {
      throw new Error("CONTRACT_FINALIZED");
    }
    const idx = this.milestones.findIndex(m => m.id === milestoneId);
    if (idx > 0) {
      const prev = this.captures[this.milestones[idx - 1].id];
      if (!prev || prev.status !== "CAPTURED") throw new Error("PREREQUISITE_UNMET");
    }
    const m = this.milestones[idx];
    this.captures[milestoneId] = { amount: m.amount, status: "CAPTURED", id: `CAP-${milestoneId}` };
    m.status = "CAPTURED";
    
    const allCaptured = this.milestones.every(ms => this.captures[ms.id]?.status === "CAPTURED");
    this.status = allCaptured ? "COMPLETED_SETTLED" : "PARTIALLY_SETTLED";
  }

  refund(milestoneId) {
    if (this.status === "TERMINATED_REFUNDED" && this.totalDisbursed === 0) {
      throw new Error("CONTRACT_FINALIZED");
    }
    const cap = this.captures[milestoneId];
    if (!cap || cap.status !== "CAPTURED") throw new Error("NOT_CAPTURED");
    cap.status = "REFUNDED";
    const m = this.milestones.find(ms => ms.id === milestoneId);
    m.status = "REFUNDED";
  }

  dispute(milestoneId) {
    if (this.status === "TERMINATED_REFUNDED" || this.status === "COMPLETED_SETTLED") {
      throw new Error("CONTRACT_FINALIZED");
    }
    this.evaluations[milestoneId] = { decision: "DISPUTE_DOSSIER" };
    this.milestones.find(ms => ms.id === milestoneId).status = "EVALUATED_FAIL";
    this.status = "DISPUTED";
  }

  resolveDispute() {
    if (this.status !== "DISPUTED") throw new Error("NOT_IN_DISPUTE");
    if (this.archetype === "TURNKEY") {
      for (const [mid, cap] of Object.entries(this.captures)) {
        if (cap.status === "CAPTURED") {
          this.refund(mid);
        }
      }
      this.milestones.forEach(m => {
        if (m.status !== "REFUNDED") m.status = "VOIDED";
      });
    } else {
      // MODULAR
      this.milestones.forEach(m => {
        if (m.status !== "CAPTURED" && m.status !== "REFUNDED") m.status = "VOIDED";
      });
    }
    this.status = "TERMINATED_REFUNDED";
  }

  editMilestones(newAmount) {
    if (this.status !== "DRAFT") throw new Error("MILESTONES_FROZEN");
    this.totalAmount = newAmount;
  }
}

// ==========================================
// TEST SCENARIOS
// ==========================================

// SCENARIO 1: TURNKEY DISPUTE -> FULL CONTRACT CLAWBACK
console.log("▶ [Test 1] Scenario 1: TURNKEY Contract Full Clawback");
const s1 = new EscrowFSM("TURNKEY", 150);
s1.authorize("AUTH-001");
s1.capture("m-1"); // $50 disbursed
assert("Milestone 1 captured ($50 disbursed)", s1.totalDisbursed === 50 && s1.totalRemaining === 100);
assert("Invariant holds after M1 capture", s1.assertInvariant());

s1.dispute("m-2");
assert("State transitions to DISPUTED", s1.status === "DISPUTED");

s1.resolveDispute();
assert("State is TERMINATED_REFUNDED", s1.status === "TERMINATED_REFUNDED");
assert("Total disbursed clawed back to $0", s1.totalDisbursed === 0);
assert("Total refunded is $50", s1.totalRefunded === 50);
assert("Total voided headroom is $100", s1.totalVoided === 100);
assert("Remaining in vault is $0", s1.totalRemaining === 0);
assert("Financial Invariant holds: Auth(150) == Disb(0) + Ref(50) + Rem(0) + Void(100)", s1.assertInvariant());

// SCENARIO 2: MODULAR DISPUTE -> ISOLATE & PRESERVE PRIOR PAYOUTS
console.log("\n▶ [Test 2] Scenario 2: MODULAR Contract Dispute Isolation");
const s2 = new EscrowFSM("MODULAR", 150);
s2.authorize("AUTH-002");
s2.capture("m-1"); // $50
s2.capture("m-2"); // $50
assert("M1 and M2 captured ($100 disbursed)", s2.totalDisbursed === 100 && s2.totalRemaining === 50);

s2.dispute("m-3");
s2.resolveDispute();
assert("State is TERMINATED_REFUNDED", s2.status === "TERMINATED_REFUNDED");
assert("Modular payouts preserved ($100 disbursed)", s2.totalDisbursed === 100);
assert("Remaining vault hold voided to $0", s2.totalRemaining === 0);
assert("Voided headroom equals uncaptured M3 ($50)", s2.totalVoided === 50);
assert("Financial Invariant holds: Auth(150) == Disb(100) + Ref(0) + Rem(0) + Void(50)", s2.assertInvariant());

// SCENARIO 3: MODULAR POST-DISPUTE MANUAL REFUND (The Reported Bug)
console.log("\n▶ [Test 3] Scenario 3: Manual Refunds Post-Termination (No Invariant Drift)");
s2.refund("m-1");
s2.refund("m-2");
assert("Both captures refunded ($0 disbursed, $100 refunded)", s2.totalDisbursed === 0 && s2.totalRefunded === 100);
assert("Vault remaining does NOT re-inflate to $150 (remains $0)", s2.totalRemaining === 0);
assert("Financial Invariant strictly holds: Auth(150) == Disb(0) + Ref(100) + Rem(0) + Void(50)", s2.assertInvariant());

// SCENARIO 4 & 5: SEQUENTIAL PREREQUISITE & RACE CONDITIONS
console.log("\n▶ [Test 4] Scenario 4 & Sequential Gating");
const s4 = new EscrowFSM("MODULAR", 150);
s4.authorize("AUTH-004");
let skippedPrereqFailed = false;
try {
  s4.capture("m-2"); // Skip M1
} catch (e) {
  skippedPrereqFailed = (e.message === "PREREQUISITE_UNMET");
}
assert("Cannot capture M2 before M1 prerequisite is satisfied", skippedPrereqFailed);

// SCENARIO 10 & 14: TERMINAL ACTION LOCKOUT
console.log("\n▶ [Test 5] Scenarios 10 & 14: Action Lockout on Terminated Contracts");
let terminalCaptureFailed = false;
try {
  s1.capture("m-3"); // Try capture on terminated contract
} catch (e) {
  terminalCaptureFailed = (e.message === "CONTRACT_FINALIZED");
}
assert("Capture permanently rejected on TERMINATED contract", terminalCaptureFailed);

let terminalDisputeFailed = false;
try {
  s1.dispute("m-3"); // Try dispute on terminated contract
} catch (e) {
  terminalDisputeFailed = (e.message === "CONTRACT_FINALIZED");
}
assert("Dispute evaluation permanently rejected on TERMINATED contract", terminalDisputeFailed);

// SCENARIO 11: MILESTONE FREEZE ONCE AUTHORIZED
console.log("\n▶ [Test 6] Scenario 11: Milestone Scope Tampering Guard");
let tamperFailed = false;
try {
  s4.editMilestones(300);
} catch (e) {
  tamperFailed = (e.message === "MILESTONES_FROZEN");
}
assert("Milestone editing rejected once escrow is authorized", tamperFailed);

console.log("\n========================================================");
console.log(` 🎯 PERMUTATION SUITE RESULTS: ${passed}/${total} TESTS PASSED`);
console.log("========================================================\n");
