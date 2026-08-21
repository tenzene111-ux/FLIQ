import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomNav } from "@/components/nav/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/welcome");

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
      <BottomNav />
    </div>
  );
}
