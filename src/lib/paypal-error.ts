export class PayPalApiError extends Error {
  readonly status: number;
  readonly debugId?: string;

  constructor(message: string, status: number, debugId?: string) {
    super(message);
    this.name = "PayPalApiError";
    this.status = status;
    this.debugId = debugId;
  }
}
