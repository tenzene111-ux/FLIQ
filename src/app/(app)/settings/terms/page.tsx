import { SettingsSubpage } from "@/components/settings/SettingsSubpage";

export default function TermsPage() {
  return (
    <SettingsSubpage title="Terms of Service">
      <div className="px-4 pb-10 prose-fliq flex flex-col gap-4 text-sm text-muted leading-relaxed">
        <p className="text-muted-2 text-xs">Last updated: demo build</p>
        <Section title="1. Acceptance of terms">
          By creating an account or using Fliq, you agree to these Terms of Service and our Privacy Policy.
        </Section>
        <Section title="2. Your content">
          You retain ownership of videos and content you upload. By posting, you grant Fliq a license to host, display,
          and distribute that content within the app so others can view it.
        </Section>
        <Section title="3. Acceptable use">
          Don&apos;t post content that is illegal, harassing, hateful, sexually explicit involving minors, or that
          infringes on others&apos; rights. We may remove content or suspend accounts that violate these rules.
        </Section>
        <Section title="4. Safety & moderation">
          Reports are reviewed by our moderation team. Repeated or severe violations can result in suspension or
          permanent bans.
        </Section>
        <Section title="5. Termination">
          You can deactivate or delete your account at any time in Settings. We may suspend accounts that violate
          these terms.
        </Section>
        <Section title="6. Disclaimers">
          Fliq is provided &quot;as is&quot; without warranties of any kind. We are not liable for content posted by
          users.
        </Section>
      </div>
    </SettingsSubpage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-white text-sm font-semibold mb-1">{title}</h2>
      <p>{children}</p>
    </div>
  );
}
