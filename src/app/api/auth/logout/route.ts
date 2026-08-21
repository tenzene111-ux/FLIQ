import { clearSession } from "@/lib/auth";
import { jsonOk, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async () => {
  await clearSession();
  return jsonOk({ ok: true });
});
