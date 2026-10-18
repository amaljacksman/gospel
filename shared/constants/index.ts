export const MEDIA = {
  story: { width: 1080, height: 1920, folder: 'stories', extension: 'jpg' },
  post: { width: 1080, height: 1350, folder: 'posts', extension: 'jpg' },
  reel: { width: 1080, height: 1920, folder: 'reels', extension: 'mp4' },
} as const;
export const DEFAULT_MAX_ATTEMPTS = 5;
export const DEFAULT_GRACE_MINUTES = 30;
