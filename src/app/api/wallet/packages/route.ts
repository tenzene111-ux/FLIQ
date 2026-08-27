import { jsonOk, withErrorHandling } from "@/lib/api";
import { getCoinPackages } from "@/lib/wallet";
import { isStripeConfigured } from "@/lib/stripe";

export const GET = withErrorHandling(async () => {
  const packages = await getCoinPackages();
  return jsonOk({ packages, purchasesEnabled: isStripeConfigured() });
});
