import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { EmptyState } from "@/components/ui/EmptyState";
import type { LucideIcon } from "lucide-react";

export function ComingSoonPage({ title, icon, description }: { title: string; icon: LucideIcon; description: string }) {
  return (
    <SettingsSubpage title={title}>
      <EmptyState icon={icon} title={`${title} is on its way`} description={description} />
    </SettingsSubpage>
  );
}
