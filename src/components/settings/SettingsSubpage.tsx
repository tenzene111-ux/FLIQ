"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";

export function SettingsSubpage({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <PageContainer className="max-w-lg mx-auto w-full safe-top">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => router.back()} className="text-white" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-lg font-bold">{title}</h1>
      </div>
      {children}
    </PageContainer>
  );
}
