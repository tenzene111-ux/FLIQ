import { SettingsSubpage } from "@/components/settings/SettingsSubpage";

export default function PrivacyPolicyPage() {
  return (
    <SettingsSubpage title="Privacy Policy">
      <div className="px-4 pb-10 flex flex-col gap-4 text-sm text-muted leading-relaxed">
        <p className="text-muted-2 text-xs">Last updated: demo build</p>
        <Section title="Information we collect">
          Account details (email, username, password hash), profile info you add, content you post, and usage data
          like views, likes, and watch time used to power your feed.
        </Section>
        <Section title="How we use it">
          To operate Fliq: authenticate you, personalize your For You feed, show you relevant creators, deliver
          notifications, and keep the platform safe.
        </Section>
        <Section title="What we never do">
          We never sell your private data to third parties or expose your password, email, or private videos through
          public APIs.
        </Section>
        <Section title="Your controls">
          You can edit or delete your profile info, make your account private, block or report users, and delete your
          account entirely — all from Settings.
        </Section>
        <Section title="Data retention">
          Deleting your account permanently removes your videos, messages, and profile data from Fliq.
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
