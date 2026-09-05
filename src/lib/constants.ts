import {
  Music2,
  PersonStanding,
  Laugh,
  Gamepad2,
  Trophy,
  Plane,
  UtensilsCrossed,
  Shirt,
  Cpu,
  GraduationCap,
  Dumbbell,
  Palette,
  Sparkles,
} from "lucide-react";

export const CATEGORIES = [
  { slug: "music", label: "Music", icon: Music2, color: "#f43f5e" },
  { slug: "dance", label: "Dance", icon: PersonStanding, color: "#ec4899" },
  { slug: "comedy", label: "Comedy", icon: Laugh, color: "#f59e0b" },
  { slug: "gaming", label: "Gaming", icon: Gamepad2, color: "#8b5cf6" },
  { slug: "sports", label: "Sports", icon: Trophy, color: "#f97316" },
  { slug: "travel", label: "Travel", icon: Plane, color: "#3b82f6" },
  { slug: "food", label: "Food", icon: UtensilsCrossed, color: "#ef4444" },
  { slug: "fashion", label: "Fashion", icon: Shirt, color: "#d946ef" },
  { slug: "technology", label: "Technology", icon: Cpu, color: "#22d3ee" },
  { slug: "education", label: "Education", icon: GraduationCap, color: "#6366f1" },
  { slug: "fitness", label: "Fitness", icon: Dumbbell, color: "#22c55e" },
  { slug: "art", label: "Art", icon: Palette, color: "#eab308" },
  { slug: "lifestyle", label: "Lifestyle", icon: Sparkles, color: "#a78bfa" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

// Maps a category to the hashtags that represent it in the seed dataset,
// used to power Discover's category browsing without a dedicated join table.
export const CATEGORY_HASHTAGS: Record<CategorySlug, string[]> = {
  music: ["musicmonday", "goodvibes"],
  dance: ["dancemode", "fliqstar"],
  comedy: ["comedy"],
  gaming: ["gaming"],
  sports: ["fitness", "skatelife"],
  travel: ["traveldiaries"],
  food: ["foodie"],
  fashion: ["ootd"],
  technology: ["tech"],
  education: ["learnfliq"],
  fitness: ["fitness"],
  art: ["artdaily"],
  lifestyle: ["goodvibes", "citylife"],
};

export const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "violence", label: "Violence" },
  { value: "hate", label: "Hate speech" },
  { value: "sexual", label: "Sexual content" },
  { value: "dangerous", label: "Dangerous acts" },
  { value: "copyright", label: "Copyright infringement" },
  { value: "scam", label: "Scam or fraud" },
  { value: "other", label: "Other" },
] as const;

export const MAX_VIDEO_DURATIONS = [15, 30, 60, 180, 600] as const;
export const RECORD_SPEEDS = [0.3, 0.5, 1, 2, 3] as const;
