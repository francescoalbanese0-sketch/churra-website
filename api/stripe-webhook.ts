import { json } from "./_lib.js";
import { fulfill, verifyStripeSignature } from "./_voucher.js";

/**
 * Stripe → Developers → Webhooks → Add endpoint
 *   URL:    https://www.churra.ch/api/stripe-webhook
 *   Events: checkout.session.completed, checkout.session.async_payment_succeeded
 * The signing secret (whsec_…) goes into the Vercel variable STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request): Promise<Response> {
  const body = await req.text();
  if (!verifyStripeSignature(body, req.headers.get("stripe-signature"))) return json({ error: "signature" }, 400);
  let event: { type?: string; data?: { object?: { id?: string; metadata?: Record<string, string> } } };
  try {
    event = JSON.parse(body);
  } catch {
    return json({ error: "body" }, 400);
  }
  const s = event.data?.object;
  if (
    (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") &&
    s?.id &&
    s.metadata?.kind === "gutschein"
  ) {
    try {
      await fulfill(s.id);
    } catch (e) {
      console.error(e);
      return json({ error: "server" }, 500); // Stripe retries
    }
  }
  return json({ received: true });
}
