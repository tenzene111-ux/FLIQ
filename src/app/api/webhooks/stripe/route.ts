import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { STARTER_BALANCE } from "@/lib/wallet";

// Stripe webhooks are the only source of truth for a completed payment — a
// client-side "success" redirect can be skipped, replayed, or spoofed, so
// coins are only ever credited here, verified against Stripe's signature,
// and guarded by the purchase's own status for idempotency (a redelivered
// webhook must not double-credit).
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    await creditPurchase(session);
  } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await prisma.coinPurchase
      .updateMany({ where: { stripeCheckoutSessionId: session.id, status: "pending" }, data: { status: "failed" } })
      .catch(() => {});
  }

  return NextResponse.json({ received: true });
}

async function creditPurchase(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  await prisma.$transaction(async (tx) => {
    const purchase = await tx.coinPurchase.findUnique({ where: { stripeCheckoutSessionId: session.id } });
    if (!purchase || purchase.status === "completed") return; // already credited — redelivered webhook

    await tx.coinPurchase.update({
      where: { id: purchase.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      },
    });

    await tx.userWallet.upsert({
      where: { userId: purchase.userId },
      create: { userId: purchase.userId, balance: STARTER_BALANCE + purchase.coinAmount },
      update: { balance: { increment: purchase.coinAmount } },
    });
  });
}
