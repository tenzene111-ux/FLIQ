"use client";

import { useEffect, useState } from "react";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { Check } from "lucide-react";
import { toast } from "@/store/toast";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" },
];

export default function LanguageSettingsPage() {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setLanguage(d.settings.language))
      .catch(() => {});
  }, []);

  async function select(code: string) {
    setLanguage(code);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: code }),
    }).catch(() => {});
    toast("success", "Language updated");
  }

  return (
    <SettingsSubpage title="Language">
      <div className="px-4 flex flex-col">
        {LANGUAGES.map((l) => (
          <button key={l.code} onClick={() => select(l.code)} className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-white text-sm">{l.label}</span>
            {language === l.code && <Check size={17} className="text-fliq-cyan" />}
          </button>
        ))}
      </div>
    </SettingsSubpage>
  );
}
