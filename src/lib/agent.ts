import { ApiError, isRecord } from "@/lib/http";

export type Milestone = {
  id: string;
  title: string;
  amount: number;
  criteria: string[];
};

export type MilestonePlan = {
  title: string;
  totalAmount: number;
  currency: "USD";
  milestones: Milestone[];
};

export type SuggestedAction = "CAPTURE_PAYMENT" | "REQUEST_REVISION";

export type ProofEvaluation = {
  verified: boolean;
  confidence: number;
  reasoning: string;
  suggestedAction: SuggestedAction;
};

export type EvaluateProofInput = {
  milestoneTitle: string;
  criteria: string[];
  submissionText: string;
  proofUrl: string;
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function llmApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key ? key : null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function moneyFromUnknown(value: unknown): number | null {
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/[$,]/g, "")) : NaN;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return roundMoney(amount);
}

function extractAmounts(prompt: string): number[] {
  const matches = prompt.matchAll(/(?:usd\s*)?\$\s*(\d{1,7}(?:,\d{3})*(?:\.\d{1,2})?)|(\d{1,7}(?:,\d{3})*(?:\.\d{1,2})?)\s*usd/gi);
  const amounts: number[] = [];
  for (const match of matches) {
    const raw = (match[1] ?? match[2] ?? "").replace(/,/g, "");
    const amount = Number(raw);
    if (Number.isFinite(amount) && amount > 0) amounts.push(roundMoney(amount));
  }
  return amounts;
}

function cleanLine(line: string): string {
  return line.replace(/^#{1,6}\s*/, "").replace(/^[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
}

function briefParts(prompt: string): string[] {
  return prompt
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function mockMilestones(prompt: string): MilestonePlan {
  const parts = briefParts(prompt);
  const title = (cleanLine(parts[0] ?? "").replace(/\s+\$[\d,.]+.*$/, "") || "Client agreement").slice(0, 140);
  const priced = parts
    .map((part) => ({ part: cleanLine(part), amount: extractAmounts(part)[0] ?? null }))
    .filter((item) => item.amount !== null);
  const criteriaPool = parts
    .slice(1)
    .map(cleanLine)
    .filter((part) => part.length > 8 && extractAmounts(part).length === 0);
  const sharedCriteria = (criteriaPool.length ? criteriaPool : ["Deliverable matches the written brief", "Proof is available for client review"]).slice(0, 6);

  let drafts: Array<{ title: string; amount: number; criteria: string[] }>;

  if (priced.length >= 2) {
    drafts = priced.slice(0, 6).map((item, index) => ({
      title: item.part.replace(/\s*(?:\$|usd).*/i, "").trim() || `Milestone ${index + 1}`,
      amount: item.amount ?? 0,
      criteria: sharedCriteria,
    }));
  } else {
    const amounts = extractAmounts(prompt);
    const milestoneAmounts =
      amounts.length >= 2
        ? amounts.slice(0, 6)
        : amounts.length === 1
          ? [roundMoney(amounts[0] / 2), roundMoney(amounts[0] - roundMoney(amounts[0] / 2))]
          : [500, 500];
    drafts = milestoneAmounts.map((amount, index) => ({
      title: index === 0 ? "First delivery" : index === milestoneAmounts.length - 1 ? "Final acceptance" : `Milestone ${index + 1}`,
      amount,
      criteria: sharedCriteria,
    }));
  }

  const milestones = drafts.map((draft, index) => ({
    id: `m${index + 1}`,
    title: draft.title.slice(0, 140),
    amount: draft.amount,
    criteria: draft.criteria.slice(0, 6),
  }));
  const totalAmount = roundMoney(milestones.reduce((sum, milestone) => sum + milestone.amount, 0));

  return {
    title,
    totalAmount,
    currency: "USD",
    milestones,
  };
}

function significantWords(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3);
}

function mockEvaluation(input: EvaluateProofInput): ProofEvaluation {
  const submission = input.submissionText.trim();
  const proof = input.proofUrl.trim();
  const haystack = `${submission} ${proof}`.toLowerCase();

  if (!submission) {
    return {
      verified: false,
      confidence: 0.92,
      reasoning: "No submission text was provided, so the milestone criteria cannot be checked.",
      suggestedAction: "REQUEST_REVISION",
    };
  }

  const scored = input.criteria.map((criterion) => {
    const words = significantWords(criterion);
    if (words.length === 0) return true;
    const hits = words.filter((word) => haystack.includes(word)).length;
    return hits / words.length >= 0.4;
  });
  const ratio = scored.length ? scored.filter(Boolean).length / scored.length : 0;
  const hasProof = /^https?:\/\/\S+$/i.test(proof);
  const verified = ratio >= 0.6 && submission.length >= 20 && hasProof;
  const confidence = Math.min(0.95, Math.round((ratio * 0.65 + (hasProof ? 0.2 : 0.05) + Math.min(submission.length, 240) / 240 * 0.1) * 100) / 100);

  const missed = input.criteria.filter((_, index) => !scored[index]);
  const reasoning = verified
    ? `The submission addresses the milestone criteria${hasProof ? " and includes a proof link" : ""}.`
    : missed.length
      ? `The submission does not clearly cover: ${missed.join("; ")}.${hasProof ? "" : " A public http(s) proof link is also required."}`
      : "The submission is too thin to verify this milestone.";

  return {
    verified,
    confidence,
    reasoning,
    suggestedAction: verified ? "CAPTURE_PAYMENT" : "REQUEST_REVISION",
  };
}

async function completeJson(system: string, user: string): Promise<unknown> {
  const apiKey = llmApiKey();
  if (!apiKey) {
    throw new ApiError("OPENAI_API_KEY is not configured.", 500);
  }

  let response: Response;
  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    throw new ApiError(`Milestone model request failed: ${message}`, 502);
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const message = isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === "string"
      ? payload.error.message
      : `Milestone model request failed (${response.status}).`;
    throw new ApiError(message, 502);
  }

  const content = isRecord(payload) && Array.isArray(payload.choices)
    ? payload.choices
        .map((choice) => (isRecord(choice) && isRecord(choice.message) && typeof choice.message.content === "string" ? choice.message.content : ""))
        .find((text) => text.trim().length > 0)
    : undefined;

  if (!content) {
    throw new ApiError("Milestone model returned an empty response.", 502);
  }

  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new ApiError("Milestone model did not return valid JSON.", 502);
  }
}

function normalizePlan(value: unknown): MilestonePlan {
  if (!isRecord(value)) {
    throw new ApiError("Milestone model returned an unexpected shape.", 502);
  }

  const title = typeof value.title === "string" && value.title.trim() ? value.title.trim().slice(0, 180) : "Untitled agreement";
  const source = Array.isArray(value.milestones) ? value.milestones : [];
  const milestones = source.slice(0, 8).map((item, index) => {
    if (!isRecord(item)) {
      throw new ApiError("Milestone model returned an invalid milestone.", 502);
    }
    const amount = moneyFromUnknown(item.amount);
    if (amount === null) {
      throw new ApiError("Milestone model returned a milestone without a positive amount.", 502);
    }
    const criteria = Array.isArray(item.criteria)
      ? item.criteria
          .filter((criterion): criterion is string => typeof criterion === "string" && criterion.trim().length > 0)
          .map((criterion) => criterion.trim().slice(0, 280))
          .slice(0, 8)
      : [];

    return {
      id: `m${index + 1}`,
      title: typeof item.title === "string" && item.title.trim() ? item.title.trim().slice(0, 180) : `Milestone ${index + 1}`,
      amount,
      criteria: criteria.length ? criteria : ["Deliverable matches the agreement and can be reviewed."],
    };
  });

  if (milestones.length === 0) {
    throw new ApiError("Milestone model did not return any milestones.", 502);
  }

  return {
    title,
    totalAmount: roundMoney(milestones.reduce((sum, milestone) => sum + milestone.amount, 0)),
    currency: "USD",
    milestones,
  };
}

function normalizeEvaluation(value: unknown): ProofEvaluation {
  if (!isRecord(value)) {
    throw new ApiError("Verification model returned an unexpected shape.", 502);
  }

  const action = value.suggestedAction === "CAPTURE_PAYMENT" || value.suggestedAction === "REQUEST_REVISION"
    ? value.suggestedAction
    : value.verified === true
      ? "CAPTURE_PAYMENT"
      : "REQUEST_REVISION";
  const verified = action === "CAPTURE_PAYMENT";
  let confidence = typeof value.confidence === "number" ? value.confidence : Number(value.confidence);
  if (!Number.isFinite(confidence)) confidence = verified ? 0.75 : 0.4;
  if (confidence > 1 && confidence <= 100) confidence = confidence / 100;
  confidence = Math.min(1, Math.max(0, Math.round(confidence * 100) / 100));

  const reasoning = typeof value.reasoning === "string" && value.reasoning.trim()
    ? value.reasoning.trim().slice(0, 2000)
    : verified
      ? "The submission satisfies the milestone criteria."
      : "The submission does not satisfy the milestone criteria.";

  return {
    verified,
    confidence,
    reasoning,
    suggestedAction: action,
  };
}

const MILESTONE_SYSTEM = [
  "You convert freelance agreements, task briefs, and invoice summaries into escrow milestones.",
  "Return only JSON with this shape:",
  '{"title": string, "totalAmount": number, "currency": "USD", "milestones": [{"id": "m1", "title": string, "amount": number, "criteria": string[]}]}',
  "Use USD amounts as numbers. Split the work into 2 or more milestones when the brief has phases.",
  "Each milestone needs concrete acceptance criteria. Milestone amounts must sum to totalAmount.",
  "Ids must be m1, m2, and so on.",
].join(" ");

const EVALUATION_SYSTEM = [
  "You verify whether a freelancer submission satisfies a milestone before escrow capture.",
  "Return only JSON:",
  '{"verified": boolean, "confidence": number, "reasoning": string, "suggestedAction": "CAPTURE_PAYMENT" | "REQUEST_REVISION"}',
  "confidence is a number from 0 to 1.",
  "Use CAPTURE_PAYMENT only when the submission and proof satisfy every criterion.",
  "Otherwise use REQUEST_REVISION. verified must agree with suggestedAction.",
].join(" ");

function providerUnavailable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("credit") ||
    message.includes("quota") ||
    message.includes("billing") ||
    message.includes("api key") ||
    message.includes("authentication") ||
    message.includes("insufficient")
  );
}

async function withModelFallback<T>(mock: () => T, requestModel: () => Promise<T>): Promise<T> {
  if (!llmApiKey()) {
    return mock();
  }

  try {
    return await requestModel();
  } catch (error) {
    if (!providerUnavailable(error)) throw error;
    console.warn("OpenAI is unavailable for this request. Using the structured milestone fallback.");
    return mock();
  }
}

export async function parseAgreementMilestones(prompt: string): Promise<MilestonePlan> {
  const brief = prompt.trim();
  if (!brief) {
    throw new ApiError("prompt is required.", 400);
  }
  if (brief.length > 12_000) {
    throw new ApiError("prompt is too long.", 400);
  }

  return withModelFallback(
    () => mockMilestones(brief),
    async () => normalizePlan(await completeJson(MILESTONE_SYSTEM, brief)),
  );
}

export async function evaluateMilestoneProof(input: EvaluateProofInput): Promise<ProofEvaluation> {
  if (!input.submissionText.trim()) {
    return {
      verified: false,
      confidence: 0.95,
      reasoning: "No submission text was provided, so the milestone criteria cannot be checked.",
      suggestedAction: "REQUEST_REVISION",
    };
  }

  return withModelFallback(
    () => mockEvaluation(input),
    async () =>
      normalizeEvaluation(
        await completeJson(
          EVALUATION_SYSTEM,
          JSON.stringify({
            milestoneTitle: input.milestoneTitle,
            criteria: input.criteria,
            submissionText: input.submissionText,
            proofUrl: input.proofUrl,
          }),
        ),
      ),
  );
}
