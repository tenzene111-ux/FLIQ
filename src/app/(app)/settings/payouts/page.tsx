import { ComingSoonPage } from "@/components/settings/ComingSoonPage";
import { Banknote } from "lucide-react";

export default function PayoutsPage() {
  return (
    <ComingSoonPage
      title="Payouts"
      icon={Banknote}
      description="Once monetization is enabled for your account, manage bank details and payout schedules here."
    />
  );
}
