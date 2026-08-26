"use client";

const KEY = "fliq_recent_searches";
const MAX = 10;

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(term: string) {
  if (typeof window === "undefined" || !term.trim()) return;
  const existing = getRecentSearches().filter((t) => t.toLowerCase() !== term.toLowerCase());
  const next = [term, ...existing].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable (private mode etc.) — non-critical, just skip persisting
  }
}

export function removeRecentSearch(term: string) {
  if (typeof window === "undefined") return;
  const next = getRecentSearches().filter((t) => t.toLowerCase() !== term.toLowerCase());
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function clearRecentSearches() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
