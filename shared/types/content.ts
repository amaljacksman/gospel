export const STORY_TEMPLATES = [
  'minimal-cross',
  'verse-center',
  'morning-light',
  'prayer',
  'question',
  'psalm',
  'jesus-says',
  'night-prayer',
] as const;
export const POST_TEMPLATES = [
  'minimal-verse',
  'motivation',
  'prayer-card',
  'quote-card',
  'sunday-gospel',
] as const;
export const REEL_TEMPLATES = [
  'verse-center',
  'minimal-cross',
  'morning-light',
  'prayer',
  'night-prayer',
] as const;
export const AUDIO_KEYS = [
  'peaceful_01',
  'peaceful_02',
  'peaceful_03',
  'hopeful_01',
  'prayer_01',
  'night_01',
  'peaceful_04',
  'peaceful_05',
  'peaceful_06',
  'peaceful_07',
  'peaceful_08',
  'peaceful_09',
  'peaceful_10',
  'peaceful_11',
  'peaceful_12',
  'peaceful_13',
  'peaceful_14',
  'peaceful_15',
  'peaceful_16',
  'peaceful_17',
] as const;
export type ContentType = 'story' | 'post' | 'reel';
export type JobStatus =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'permanently_failed';
export interface Verse {
  reference: string;
  text: string;
}
export interface EnabledBase {
  enabled: boolean;
  publishTime: string;
}
export interface StoryContent extends EnabledBase {
  template: (typeof STORY_TEMPLATES)[number];
  headline: string;
  footer: string;
}
export interface PostContent extends EnabledBase {
  template: (typeof POST_TEMPLATES)[number];
  caption: string;
  hashtags: string[];
}
export interface ReelContent extends EnabledBase {
  template: (typeof REEL_TEMPLATES)[number];
  headline: string;
  ending: string;
  durationSeconds: number;
  audio: (typeof AUDIO_KEYS)[number];
}
export interface DailyContent {
  date: string;
  theme: string;
  verse: Verse;
  story?: StoryContent;
  post?: PostContent;
  reel?: ReelContent;
}
export interface YearContent {
  year: number;
  timezone: string;
  content: DailyContent[];
}
export interface QueueJob {
  jobId: number;
}
export interface PublishingJob {
  id: number;
  content_date: string;
  content_type: ContentType;
  scheduled_at: string;
  status: JobStatus;
  r2_key: string;
  caption: string | null;
  instagram_container_id: string | null;
  instagram_media_id: string | null;
  attempt_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}
