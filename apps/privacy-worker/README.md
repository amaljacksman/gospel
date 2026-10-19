# Privacy policy Worker

Public policy for Gospel of Jesus Automation:

- Privacy policy: https://gospel-privacy.networkt.in/
- Data deletion instructions: https://gospel-privacy.networkt.in/data-deletion

The custom domain is attached directly to this Worker; it is separate from the R2 media domain. No secrets or publishing bindings are required. The page contains no JavaScript, forms, trackers, or app cookies. Privacy and deletion requests currently use the project's GitHub contact route to request a private channel; update the contact section when a public support email is supplied. Keep policy statements aligned with the app's actual behavior, including manual record deletion and retention.

Deploy from the repository root:

```bash
nvm use
npx wrangler deploy --config apps/privacy-worker/wrangler.jsonc
```

In Meta's app settings use the first URL for Privacy Policy URL and the second as the Data Deletion Instructions URL. The deletion URL provides instructions; it is not a signed-request deletion callback.
