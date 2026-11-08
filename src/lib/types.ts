export type Feedback = "exact" | "like" | "not" | null;

export interface Sample {
  id: string;
  text: string;
  postedOn: string | null;
  topic: string | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  feedback: Feedback;
  notes: string | null;
  createdAt: string;
}

export const IDEA_STATUSES = [
  { value: "idea", label: "Idea", emoji: "💭" },
  { value: "drafting", label: "Drafting", emoji: "✍️" },
  { value: "needs_work", label: "Needs work", emoji: "🔄" },
  { value: "ready", label: "Ready to post", emoji: "📅" },
  { value: "posted", label: "Posted", emoji: "✅" },
  { value: "archived", label: "Archived", emoji: "📦" },
] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number]["value"];

export const DRAFT_STATUSES = IDEA_STATUSES.filter((s) => s.value !== "idea");

export const CATEGORIES = ["Open source", "AI", "Career", "Projects", "Community", "Events", "Learning", "Personal", "Other"];
export const PRIORITIES = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface Idea {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: IdeaStatus;
  notes: string | null;
  hook: string | null;
  links: string[];
  tags: string[];
  priority: Priority;
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Draft {
  id: string;
  title: string;
  body: string;
  ideaId: string | null;
  category: string | null;
  status: IdeaStatus;
  scheduledFor: string | null;
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Measured directly from your writing samples. */
export interface VoiceStats {
  sampleCount: number;
  avgWords: number;
  avgSentenceWords: number;
  avgParagraphLines: number;
  emojiPerPost: number;
  emDashPerPost: number;
  questionEndingRate: number;
  hashtagPerPost: number;
  topWords: string[];
  openingWords: string[];
}

export interface SimilarPost {
  id: string;
  kind: "sample" | "post";
  excerpt: string;
  score: number;
}

export interface WorkspaceCounts {
  ideas: number;
  drafts: number;
}

