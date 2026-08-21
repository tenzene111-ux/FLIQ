import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCount(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) {
    const v = n / 1000;
    return `${v >= 100 ? Math.round(v) : v.toFixed(v < 10 ? 1 : 0)}K`.replace(".0K", "K");
  }
  if (n < 1_000_000_000) {
    const v = n / 1_000_000;
    return `${v.toFixed(v < 10 ? 1 : 0)}M`.replace(".0M", "M");
  }
  const v = n / 1_000_000_000;
  return `${v.toFixed(v < 10 ? 1 : 0)}B`.replace(".0B", "B");
}

export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 5) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(days / 365)}y`;
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_]+/g) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
}

export function extractMentions(text: string): string[] {
  const matches = text.match(/@[a-zA-Z0-9_.]+/g) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
