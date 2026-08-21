"use client";

import { useState } from "react";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/store/toast";
import { CheckCircle2 } from "lucide-react";

export default function ReportProblemPage() {
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/support/report-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      toast("error", "Couldn't submit your report. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SettingsSubpage title="Report a Problem">
      <div className="px-4">
        {done ? (
          <div className="flex flex-col items-center text-center py-10 gap-3">
            <CheckCircle2 size={40} className="text-success" />
            <p className="text-white font-medium">Thanks for letting us know</p>
            <p className="text-muted text-sm">Our team will look into it.</p>
          </div>
        ) : (
          <>
            <p className="text-muted text-sm mb-3">Tell us what went wrong. Include as much detail as you can.</p>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={6} placeholder="Describe the problem..." />
            <Button fullWidth className="mt-4" onClick={submit} loading={loading} disabled={details.trim().length < 5}>
              Submit
            </Button>
          </>
        )}
      </div>
    </SettingsSubpage>
  );
}
