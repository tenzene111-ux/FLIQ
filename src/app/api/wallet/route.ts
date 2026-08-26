import { withAuth, jsonOk } from "@/lib/api";
import { getOrCreateWallet } from "@/lib/wallet";

export const GET = withAuth(async (_req, { user }) => {
  const wallet = await getOrCreateWallet(user.id);
  return jsonOk({ balance: wallet.balance });
});
