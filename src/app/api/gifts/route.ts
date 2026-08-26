import { jsonOk, withErrorHandling } from "@/lib/api";
import { getGiftCatalog } from "@/lib/wallet";

export const GET = withErrorHandling(async () => {
  const gifts = await getGiftCatalog();
  return jsonOk({ gifts });
});
