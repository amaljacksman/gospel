import { expect, it, vi } from 'vitest';
import { BufferInstagramPublisher } from '../apps/publisher-worker/src/buffer.js';
const reply = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 });
const post = {
  id: 'b1',
  channelId: 'channel',
  status: 'sent',
  externalLink: 'https://www.instagram.com/p/test/',
};
for (const type of ['post', 'story', 'reel'] as const) {
  it(`sends automatic ${type} with the correct asset and saves its provider reference`, async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(reply({ createPost: { __typename: 'PostActionSuccess', post } }));
    const onContainerCreated = vi.fn();
    const api = new BufferInstagramPublisher('key', 'channel', fetcher);
    const result = await api.publishPost({
      type,
      mediaUrl: 'https://media.example/test',
      caption: 'Scripture',
      onContainerCreated,
    });
    const request = JSON.parse(fetcher.mock.calls[0]![1].body as string);
    expect(request.variables.input).toMatchObject({
      mode: 'shareNow',
      schedulingType: 'automatic',
      text: 'Scripture',
      metadata: { instagram: { type } },
    });
    expect(request.variables.input.assets).toEqual([
      type === 'reel'
        ? { video: { url: 'https://media.example/test' } }
        : { image: { url: 'https://media.example/test' } },
    ]);
    expect(onContainerCreated.mock.calls.map((c) => c[0])).toEqual([
      'buffer:creating',
      'buffer:b1',
    ]);
    expect(result.mediaId).toBe(post.externalLink);
  });
}
it('does not mark an accepted but undelivered post as published', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(reply({ createPost: { post: { ...post, status: 'sending' } } }));
  const save = vi.fn();
  await expect(
    new BufferInstagramPublisher('key', 'channel', fetcher).publishPost({
      type: 'post',
      mediaUrl: 'https://example.com/a.jpg',
      onContainerCreated: save,
    }),
  ).rejects.toMatchObject({ status: 503 });
  expect(save).toHaveBeenLastCalledWith('buffer:b1');
});
it('resumes a pending post through a read-only status query without recreating it', async () => {
  const fetcher = vi.fn().mockResolvedValue(reply({ post }));
  await new BufferInstagramPublisher('key', 'channel', fetcher).publishPost({
    type: 'post',
    mediaUrl: 'https://example.com/a.jpg',
    containerId: 'buffer:b1',
  });
  const payload = JSON.parse(fetcher.mock.calls[0]![1].body as string);
  expect(payload.query).toContain('query Status');
  expect(payload.variables.input).toEqual({ id: 'b1' });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('blocks duplicate creation after an ambiguous network failure', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('timeout'));
  const save = vi.fn();
  const api = new BufferInstagramPublisher('key', 'channel', fetcher);
  await expect(
    api.publishPost({
      type: 'post',
      mediaUrl: 'https://example.com/a.jpg',
      onContainerCreated: save,
    }),
  ).rejects.toMatchObject({ status: 400 });
  expect(save.mock.calls.map((c) => c[0])).toEqual(['buffer:creating']);
  await expect(
    api.publishPost({
      type: 'post',
      mediaUrl: 'https://example.com/a.jpg',
      containerId: 'buffer:creating',
    }),
  ).rejects.toThrow('outcome unknown');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('clears submission marker for a definitive validation rejection', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      reply({ createPost: { __typename: 'PostInvalidInputError', message: 'Invalid media' } }),
    );
  const save = vi.fn();
  await expect(
    new BufferInstagramPublisher('key', 'channel', fetcher).publishPost({
      type: 'post',
      mediaUrl: 'https://example.com/a.jpg',
      onContainerCreated: save,
    }),
  ).rejects.toThrow('Invalid media');
  expect(save).toHaveBeenLastCalledWith('');
});
it('surfaces a Buffer delivery error without creating another post', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      reply({ post: { ...post, status: 'error', error: { message: 'Reconnect Instagram' } } }),
    );
  await expect(
    new BufferInstagramPublisher('key', 'channel', fetcher).publishPost({
      type: 'post',
      mediaUrl: 'https://example.com/a.jpg',
      containerId: 'buffer:b1',
    }),
  ).rejects.toThrow('Reconnect Instagram');
});
it('refuses to treat a Meta container as a Buffer post', async () => {
  const fetcher = vi.fn();
  await expect(
    new BufferInstagramPublisher('key', 'channel', fetcher).publishPost({
      type: 'post',
      mediaUrl: 'https://example.com/a.jpg',
      containerId: '12345',
    }),
  ).rejects.toThrow('Meta container');
  expect(fetcher).not.toHaveBeenCalled();
});
