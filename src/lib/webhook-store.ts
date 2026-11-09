export interface WebhookEvent {
  id: string;
  eventType: string;
  summary: string;
  resourceId: string;
  timestamp: string;
  status: "VERIFIED" | "SIMULATED";
  rawPayload?: any;
}

// Global in-memory ring buffer for the latest 15 webhook events
const globalStore = global as unknown as { __trustloop_webhooks?: WebhookEvent[] };
if (!globalStore.__trustloop_webhooks) {
  globalStore.__trustloop_webhooks = [];
}

export function recordWebhookEvent(event: WebhookEvent) {
  if (!globalStore.__trustloop_webhooks) {
    globalStore.__trustloop_webhooks = [];
  }
  globalStore.__trustloop_webhooks.unshift(event);
  if (globalStore.__trustloop_webhooks.length > 15) {
    globalStore.__trustloop_webhooks.pop();
  }
}

export function getWebhookEvents(): WebhookEvent[] {
  return globalStore.__trustloop_webhooks || [];
}
