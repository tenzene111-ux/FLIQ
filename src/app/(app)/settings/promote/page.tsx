import { ComingSoonPage } from "@/components/settings/ComingSoonPage";
import { Megaphone } from "lucide-react";

export default function PromotePage() {
  return (
    <ComingSoonPage
      title="Promote Video"
      icon={Megaphone}
      description="Pay to boost a video's reach to a targeted audience. Ad promotion tools are coming to Fliq soon."
    />
  );
}
