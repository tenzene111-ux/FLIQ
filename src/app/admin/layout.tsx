import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { FliqLogo } from "@/components/ui/FliqLogo";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/home");

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-border px-3 py-5 sticky top-0 h-screen">
        <Link href="/admin" className="px-3 mb-2">
          <FliqLogo />
        </Link>
        <span className="px-3 mb-6 text-[10px] font-bold uppercase tracking-widest text-fliq-magenta">Admin</span>
        <AdminNav />
        <Link href="/home" className="mt-auto px-3 py-2.5 text-sm text-muted hover:text-white">
          ← Back to Fliq
        </Link>
      </aside>
      <div className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border">
          <FliqLogo markSize={22} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-fliq-magenta">Admin</span>
        </div>
        <div className="md:hidden border-b border-border">
          <AdminNav horizontal />
        </div>
        {children}
      </div>
    </div>
  );
}
