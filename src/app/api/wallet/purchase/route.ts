import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

const schema = z.object({ packageId: z.string().min(1) });

export const POST = withAuth(async (req, { user }) => {
  if (!isStripeConfigured()) return jsonError("Coin purchases aren't set up yet", 503);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Missing package", 422);

  const pkg = await prisma.coinPackage.findUnique({ where: { id: parsed.data.packageId } });
  if (!pkg || !pkg.active) return jsonError("This coin package isn't available", 404);

  const origin = req.nextUrl.origin;
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: pkg.currency,
          unit_amount: pkg.priceCents,
          product_data: {
            name: `${pkg.name} — ${pkg.coinAmount.toLocaleString()} Fliq Coins`,
          },
        },
      },
    ],
    metadata: { userId: user.id, packageId: pkg.id },
    success_url: `${origin}/settings/wallet?purchase=success`,
    cancel_url: `${origin}/settings/wallet?purchase=cancelled`,
  });

  if (!session.url) return jsonError("Couldn't start checkout", 500);

  await prisma.coinPurchase.create({
    data: {
      userId: user.id,
      packageId: pkg.id,
      stripeCheckoutSessionId: session.id,
      coinAmount: pkg.coinAmount,
      priceCents: pkg.priceCents,
      currency: pkg.currency,
      status: "pending",
    },
  });

  return jsonOk({ url: session.url });
});
