"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Shield,
  Lock,
  Bell,
  SlidersHorizontal,
  UserX,
  Globe,
  Bookmark,
  Download,
  History,
  Wrench,
  BarChart3,
  Wallet,
  Banknote,
  Megaphone,
  HelpCircle,
  Flag,
  FileText,
  ShieldCheck,
  LogOut,
  UserMinus,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/welcome");
    router.refresh();
    toast("success", "Logged out");
  }

  return (
    <PageContainer className="max-w-lg mx-auto w-full safe-top">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => router.back()} className="text-white md:hidden" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-xl font-bold">Settings</h1>
      </div>

      <SettingsGroup title="Account">
        <SettingsRow icon={User} label="Edit Profile" href="/profile/edit" />
        <SettingsRow icon={Shield} label="Account" href="/settings/account" />
        <SettingsRow icon={Lock} label="Privacy" href="/settings/privacy" />
        <SettingsRow icon={ShieldCheck} label="Security" href="/settings/security" />
        <SettingsRow icon={Bell} label="Notifications" href="/settings/notifications" />
      </SettingsGroup>

      <SettingsGroup title="Content & Activity">
        <SettingsRow icon={SlidersHorizontal} label="Content Preferences" href="/settings/content-preferences" />
        <SettingsRow icon={UserX} label="Blocked Users" href="/settings/blocked-users" />
        <SettingsRow icon={Globe} label="Language" href="/settings/language" />
        <SettingsRow icon={Bookmark} label="Saved Videos" href={user ? `/profile/${user.username}?tab=saved` : "#"} />
        <SettingsRow icon={Download} label="Downloads" href="/settings/downloads" />
        <SettingsRow icon={History} label="Watch History" href="/settings/watch-history" />
      </SettingsGroup>

      <SettingsGroup title="Creator">
        <SettingsRow icon={Wrench} label="Creator Tools" href="/settings/creator-tools" />
        <SettingsRow icon={BarChart3} label="Analytics" href="/analytics" />
        <SettingsRow icon={Wallet} label="Monetization" href="/settings/monetization" />
        <SettingsRow icon={Banknote} label="Payouts" href="/settings/payouts" />
        <SettingsRow icon={Megaphone} label="Promote Video" href="/settings/promote" />
      </SettingsGroup>

      <SettingsGroup title="Support">
        <SettingsRow icon={HelpCircle} label="Help Center" href="/settings/help" />
        <SettingsRow icon={Flag} label="Report a Problem" href="/settings/report-problem" />
        <SettingsRow icon={FileText} label="Terms of Service" href="/settings/terms" />
        <SettingsRow icon={ShieldCheck} label="Privacy Policy" href="/settings/privacy-policy" />
      </SettingsGroup>

      <div className="px-4 mt-6 mb-10 flex flex-col gap-1">
        <button onClick={handleLogout} className="flex items-center gap-3 py-3 text-danger text-sm font-semibold">
          <LogOut size={18} /> Log Out
        </button>
        <Link href="/settings/deactivate" className="flex items-center gap-3 py-3 text-danger text-sm font-semibold">
          <UserMinus size={18} /> Deactivate Account
        </Link>
        <Link href="/settings/delete-account" className="flex items-center gap-3 py-3 text-danger text-sm font-semibold">
          <Trash2 size={18} /> Delete Account
        </Link>
      </div>
    </PageContainer>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="px-4 text-xs font-semibold text-muted-2 uppercase tracking-wide mb-1.5">{title}</p>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function SettingsRow({ icon: Icon, label, href }: { icon: typeof User; label: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3.5 px-4 py-3 hover:bg-white/5">
      <Icon size={19} className="text-muted-2 shrink-0" />
      <span className="text-white text-sm flex-1">{label}</span>
      <ChevronRight size={16} className="text-muted-2" />
    </Link>
  );
}
