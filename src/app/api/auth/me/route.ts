import { getCurrentUser } from "@/lib/auth";
import { jsonOk, withErrorHandling } from "@/lib/api";

export const GET = withErrorHandling(async () => {
  const user = await getCurrentUser();
  return jsonOk({ user });
});
