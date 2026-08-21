import { ComingSoonPage } from "@/components/settings/ComingSoonPage";
import { Download } from "lucide-react";

export default function DownloadsPage() {
  return (
    <ComingSoonPage
      title="Downloads"
      icon={Download}
      description="Videos you download for offline viewing will be listed here. On a per-video 'Allow downloads' toggle you control, viewers can already save your posts."
    />
  );
}
