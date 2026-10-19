import {
  InstagramError,
  type InstagramPublisher,
  type PublishInput,
  type PublishResult,
} from './instagram.js';

interface BufferPost {
  id: string;
  status: string;
  channelId: string;
  externalLink?: string | null;
  error?: { message: string } | null;
}
const FIELDS = 'id status channelId externalLink error { message }';
const CREATE = `mutation Publish($input: CreatePostInput!) {
  createPost(input: $input) {
    __typename
    ... on PostActionSuccess { post { ${FIELDS} } }
    ... on MutationError { message }
  }
}`;
const STATUS = `query Status($input: PostInput!) { post(input: $input) { ${FIELDS} } }`;

export class BufferInstagramPublisher implements InstagramPublisher {
  constructor(
    private readonly apiKey: string,
    private readonly channelId: string,
    private readonly fetcher: typeof fetch = (...args) => globalThis.fetch(...args),
  ) {}
  publishPost(input: PublishInput) {
    return this.publish(input);
  }
  publishReel(input: PublishInput) {
    return this.publish(input);
  }
  publishStory(input: PublishInput) {
    return this.publish(input);
  }

  private async query<T>(query: string, variables: object): Promise<T> {
    if (!this.apiKey || !this.channelId)
      throw new InstagramError('Buffer credentials are missing', 400);
    const response = await this.fetcher('https://api.buffer.com', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new InstagramError(`Buffer HTTP ${response.status}`, response.status);
    const result = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (result.errors?.length)
      throw new InstagramError(`Buffer: ${result.errors.map((e) => e.message).join('; ')}`, 400);
    if (!result.data) throw new InstagramError('Buffer returned no data', 502);
    return result.data;
  }

  private async publish(input: PublishInput): Promise<PublishResult> {
    let reference = input.containerId;
    if (reference === 'buffer:creating')
      throw new InstagramError(
        'Buffer submission outcome unknown. Check Buffer before reconciling this job; automatic recreation is blocked to avoid duplicates.',
        400,
      );
    if (reference && !reference.startsWith('buffer:'))
      throw new InstagramError(
        'Existing Meta container cannot be reused by Buffer. Reconcile this job before changing provider.',
        400,
      );
    let post: BufferPost;
    if (reference) {
      post = (await this.query<{ post: BufferPost }>(STATUS, { input: { id: reference.slice(7) } }))
        .post;
    } else {
      // Persist before sending. An uncertain create response must never cause a
      // second create on queue redelivery or manual retry.
      await input.onContainerCreated?.('buffer:creating');
      let created: { createPost: { __typename: string; post?: BufferPost; message?: string } };
      try {
        created = await this.query(CREATE, {
          input: {
            channelId: this.channelId,
            text: input.caption ?? '',
            schedulingType: 'automatic',
            mode: 'shareNow',
            needsApproval: false,
            saveToDraft: false,
            assets: [
              input.type === 'reel'
                ? { video: { url: input.mediaUrl } }
                : { image: { url: input.mediaUrl } },
            ],
            metadata: {
              instagram: { type: input.type, shouldShareToFeed: input.type !== 'story' },
            },
          },
        });
      } catch (error) {
        if (
          error instanceof InstagramError &&
          error.status !== undefined &&
          error.status >= 400 &&
          error.status < 500
        ) {
          await input.onContainerCreated?.('');
          throw error;
        }
        throw new InstagramError(
          'Buffer create response was not confirmed. Check Buffer before reconciling this job; automatic recreation is blocked to avoid duplicates.',
          400,
        );
      }
      if (!created.createPost.post) {
        await input.onContainerCreated?.('');
        throw new InstagramError(
          `Buffer: ${created.createPost.message ?? created.createPost.__typename}`,
          400,
        );
      }
      post = created.createPost.post;
      reference = `buffer:${post.id}`;
      await input.onContainerCreated?.(reference);
    }
    if (!post || post.channelId !== this.channelId)
      throw new InstagramError('Buffer post channel mismatch', 400);
    if (post.status === 'sent')
      return {
        containerId: `buffer:${post.id}`,
        mediaId: post.externalLink || `buffer:${post.id}`,
      };
    if (post.status === 'error')
      throw new InstagramError(
        `Buffer publishing failed: ${post.error?.message ?? 'Check Buffer for details'}`,
        400,
      );
    if (post.status === 'draft' || post.status === 'needs_approval')
      throw new InstagramError(`Buffer post requires action: ${post.status}`, 400);
    throw new InstagramError(
      `Buffer post ${post.id} is ${post.status}; waiting for delivery confirmation`,
      503,
    );
  }
}
