import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { sendEmail } from "@/libs/resend";
import { welcomeEmail, welcomeEmailSubject } from "@/emails/welcome";
import { checkRateLimit } from "@/libs/rateLimit";
import { getClientIp } from "@/libs/requestIp";
import { getRequestId, logError, logInfo } from "@/libs/logger";
import {
  markWebhookProcessed,
  releaseWebhookReservation,
  reserveWebhookEvent,
} from "@/libs/webhookStore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-08-16",
  typescript: true,
});

/**
 * Stripe webhook handler - sends welcome email on successful checkout
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logError("Stripe webhook missing secret");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const requestId = getRequestId(req.headers);
  const ip = getClientIp(req as unknown as Request);
  const rate = await checkRateLimit({
    key: `stripe-webhook:${ip}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": Math.ceil((rate.resetAt - Date.now()) / 1000).toString(), "x-request-id": requestId },
      },
    );
  }

  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  // Verify Stripe event is legitimate
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logError("Webhook signature verification failed", { requestId, error: message });
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const reserved = await reserveWebhookEvent(event.id);
        if (!reserved) {
          logInfo("Duplicate webhook ignored", { requestId, eventId: event.id });
          return NextResponse.json(
            { ok: true, duplicate: true },
            { headers: { "x-request-id": requestId } },
          );
        }

        // Only process paid sessions
        if (session.payment_status !== "paid") {
          console.log(
            `Session ${session.id} payment not completed, skipping email`,
          );
          break;
        }

        const email = session.customer_details?.email;

        if (!email) {
          console.error(`No email found for session ${session.id}`);
          break;
        }

        // Build magic link for immediate access
        const magicLink = `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id=${session.id}`;

        // Send welcome email
        try {
          await sendEmail({
            to: email,
            subject: welcomeEmailSubject,
            text: `Willkommen zum AI-Kurs! Klicke hier für Zugang: ${magicLink}`,
            html: welcomeEmail(magicLink),
          });
          await markWebhookProcessed(event.id);
        } catch (err) {
          await releaseWebhookReservation(event.id);
          throw err;
        }

        logInfo("Welcome email sent", { requestId, email, session: session.id });
        break;
      }

      default:
        // Ignore other event types
        logInfo("Unhandled event type", { requestId, event: event.type });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logError("Webhook processing error", { requestId, error: message });
    // Return 500 to allow Stripe retries on transient failures
    return NextResponse.json({ error: message }, { status: 500, headers: { "x-request-id": requestId } });
  }

  return NextResponse.json({ ok: true }, { headers: { "x-request-id": requestId } });
}
