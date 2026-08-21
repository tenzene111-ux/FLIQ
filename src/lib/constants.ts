export const CATEGORIES = [
  { slug: "music", label: "Music", emoji: "🎵" },
  { slug: "dance", label: "Dance", emoji: "💃" },
  { slug: "comedy", label: "Comedy", emoji: "😂" },
  { slug: "gaming", label: "Gaming", emoji: "🎮" },
  { slug: "sports", label: "Sports", emoji: "🏀" },
  { slug: "travel", label: "Travel", emoji: "✈️" },
  { slug: "food", label: "Food", emoji: "🍜" },
  { slug: "fashion", label: "Fashion", emoji: "👗" },
  { slug: "technology", label: "Technology", emoji: "💻" },
  { slug: "education", label: "Education", emoji: "📚" },
  { slug: "fitness", label: "Fitness", emoji: "💪" },
  { slug: "art", label: "Art", emoji: "🎨" },
  { slug: "lifestyle", label: "Lifestyle", emoji: "✨" },
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

export const MAX_VIDEO_DURATIONS = [15, 30, 60, 180] as const;
export const RECORD_SPEEDS = [0.3, 0.5, 1, 2, 3] as const;
