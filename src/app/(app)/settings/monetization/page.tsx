import { ComingSoonPage } from "@/components/settings/ComingSoonPage";
import { Wallet } from "lucide-react";

export default function MonetizationPage() {
  return (
    <ComingSoonPage
      title="Monetization"
      icon={Wallet}
      description="Creator fund, tips, and brand partnerships are rolling out to more creators soon. You'll be notified when it's your turn."
    />
  );
}
