# Manual publishing API

Publish already-generated media for missing dates without using an AI assistant:

```text
POST https://gospel-instagram-publisher.amal-c-babu457.workers.dev/api/jobs/backfill
Authorization: Bearer <ADMIN_API_KEY>
Content-Type: application/json
```

From a trusted project terminal, load the ignored local configuration and preview a range:

```bash
set -a
source .env
set +a

curl --fail-with-body --silent --show-error \
  'https://gospel-instagram-publisher.amal-c-babu457.workers.dev/api/jobs/backfill' \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H 'Content-Type: application/json' \
  --data '{"from":"2026-10-18","to":"2026-10-19","preview":true}'
```

Remove `"preview":true` to publish missing items immediately. This bypasses their original publication times. Dates are inclusive, must end today or earlier in Asia/Kolkata, and are limited to three dates per call. By default all enabled Stories, Posts, and Reels are included. To select only images, add `"types":["post"]`; the allowed values are `story`, `post`, and `reel`.

The response reports each item and the count queued:

- `queued` and `id`: submitted to Cloudflare Queue; not yet proof of Instagram delivery.
- `would_queue`: preview only; no database changes or queue messages.
- `skipped`: an existing job is preserved, including previously published or in-progress jobs.
- `disabled`: that content type is not enabled for the date.
- `missing_media`: generate/upload that file before calling again.
- `queue_error`: queue submission failed; inspect jobs before retrying.

HTTP 200 means the request was processed; HTTP 207 reports partial results with missing media or queue errors. Check the individual results. Existing failed/permanently failed jobs are skipped with a `retryUrl` rather than resubmitted. Requests that overlap another run are protected by the database's date/type uniqueness and conditional job claim.

Check a returned job:

```bash
curl --fail-with-body --silent --show-error \
  'https://gospel-instagram-publisher.amal-c-babu457.workers.dev/api/jobs/7' \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

`status=published` confirms delivery. Buffer's post reference is in `instagram_container_id`; the Instagram URL, when available, is in `instagram_media_id`.

Retry a failed job only after checking its error and resolving the cause:

```bash
curl --fail-with-body --silent --show-error -X POST \
  'https://gospel-instagram-publisher.amal-c-babu457.workers.dev/api/jobs/7/retry' \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

The backfill API requires the existing content JSON and media in R2. It does not generate media or republish completed jobs. Worker dry-run configuration still applies. An uncertain Buffer creation (`buffer:creating`) needs reconciliation in Buffer before a retry can proceed. These calls use normal Cloudflare/Buffer API quotas; they do not invoke an AI model or consume model tokens.
