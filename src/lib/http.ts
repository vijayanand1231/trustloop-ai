import { NextResponse } from "next/server";
import { PayPalApiError } from "@/lib/paypal-error";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) {
    throw new ApiError("Request body is required.", 400);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("Request body must be valid JSON.", 400);
  }
}

export function json<T>(body: T, status = 200): NextResponse<T> {
  return NextResponse.json(body, {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return json({ error: error.message }, error.status);
  }

  if (error instanceof PayPalApiError) {
    const status = error.status >= 400 && error.status < 500 ? error.status : 502;
    return json(
      {
        error: error.message,
        ...(error.debugId ? { debugId: error.debugId } : {}),
      },
      status,
    );
  }

  console.error(error);
  return json({ error: "Unexpected server error." }, 500);
}
