import type { ContentType } from '../../../shared/types/content.js';
export interface PublishInput {
  type: ContentType;
  mediaUrl: string;
  caption?: string;
  containerId?: string | null;
  onContainerCreated?: (id: string) => Promise<void>;
}
export interface PublishResult {
  containerId: string;
  mediaId: string;
}
export interface TokenProvider {
  getToken(): Promise<string>;
}
export interface InstagramPublisher {
  publishPost(input: PublishInput): Promise<PublishResult>;
  publishReel(input: PublishInput): Promise<PublishResult>;
  publishStory(input: PublishInput): Promise<PublishResult>;
}
export class InstagramError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: number,
  ) {
    super(message);
  }
}
interface GraphError {
  error?: { message?: string; code?: number };
}
interface IdResponse {
  id?: string;
}
export class GraphInstagramPublisher implements InstagramPublisher {
  constructor(
    private readonly accountId: string,
    private readonly version: string,
    private readonly tokens: TokenProvider,
    private readonly fetcher: typeof fetch = (...args) => globalThis.fetch(...args),
  ) {}
  publishPost(i: PublishInput) {
    return this.publish(i);
  }
  publishReel(i: PublishInput) {
    return this.publish(i);
  }
  publishStory(i: PublishInput) {
    return this.publish(i);
  }
  private async request(path: string, params: URLSearchParams): Promise<IdResponse> {
    const token = await this.tokens.getToken();
    const response = await this.fetcher(`https://graph.facebook.com/${this.version}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const json = (await response.json()) as IdResponse & GraphError;
    if (!response.ok || !json.id)
      throw new InstagramError(
        json.error?.message ?? `Instagram HTTP ${response.status}`,
        response.status,
        json.error?.code,
      );
    return json;
  }
  private async publish(input: PublishInput): Promise<PublishResult> {
    let containerId = input.containerId ?? undefined;
    if (!containerId) {
      const q = new URLSearchParams();
      if (input.type === 'post' || input.type === 'story') {
        q.set('image_url', input.mediaUrl);
        if (input.type === 'story') q.set('media_type', 'STORIES');
      } else {
        q.set('video_url', input.mediaUrl);
        q.set('media_type', 'REELS');
      }
      if (input.caption && input.type !== 'story') q.set('caption', input.caption);
      containerId = (await this.request(`${this.accountId}/media`, q)).id!;
      await input.onContainerCreated?.(containerId);
    }
    await this.waitUntilReady(containerId);
    const mediaId = (
      await this.request(
        `${this.accountId}/media_publish`,
        new URLSearchParams({ creation_id: containerId }),
      )
    ).id!;
    return { containerId, mediaId };
  }
  private async waitUntilReady(id: string): Promise<void> {
    for (let n = 0; n < 12; n++) {
      const token = await this.tokens.getToken();
      const r = await this.fetcher(
        `https://graph.facebook.com/${this.version}/${id}?fields=status_code`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const j = (await r.json()) as {
        status_code?: string;
        error?: { message?: string; code?: number };
      };
      if (!r.ok)
        throw new InstagramError(
          j.error?.message ?? 'Container status failed',
          r.status,
          j.error?.code,
        );
      if (j.status_code === 'FINISHED') return;
      if (j.status_code === 'ERROR' || j.status_code === 'EXPIRED')
        throw new InstagramError(`Container ${j.status_code}`, 400);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    throw new InstagramError('Media is still processing', 503);
  }
}
export function parseGraphError(value: unknown): { message: string; code?: number } {
  if (typeof value === 'object' && value !== null && 'error' in value) {
    const e = (value as GraphError).error;
    return {
      message: e?.message ?? 'Instagram error',
      ...(e?.code === undefined ? {} : { code: e.code }),
    };
  }
  return { message: 'Instagram error' };
}
