# blog-chat-proxy

The Cloudflare Worker behind the AI chat widget on **both** sites:

| Site | Hostname | Built by |
| --- | --- | --- |
| hhlblog-global | `https://www.hehonglei.com` | Cloudflare Pages |
| hhlblog | `https://www.hehonglei.cn` | EdgeOne Makers |

This directory is the **only copy**. Both sites call the same deployed worker name
(`blog-chat-proxy`), so deploying from a second copy of this code would replace
the other site's configuration and secrets without warning. That duplicate used to
live in the `HHLBlog` repo and has been deleted.

## Deploy

```bash
cd workers/chat-proxy
npx wrangler deploy \
  --var 'ALLOWED_ORIGINS:https://www.hehonglei.com,https://nextjs.hehonglei.cn,https://www.hehonglei.cn' \
  --var 'CONTACT_EMAIL:contact@hehonglei.com'
```

**Always restate every `--var`.** `wrangler.toml` keeps its `[vars]` empty on
purpose (a fork must not inherit someone's domain), and a plain `wrangler deploy`
replaces the deployed variable set rather than merging it — so a deploy that
forgets `ALLOWED_ORIGINS` leaves the worker with no allowed origins and both
sites start getting 403s.

**Secrets survive deploys; vars do not.** Set them once:

```bash
npx wrangler secret put DEEPSEEK_API_KEY      # upstream model key
npx wrangler secret put TURNSTILE_SECRET_KEY  # Turnstile secret for the widget below
```

## Turnstile

- Widget: `0x4AAAAAAFWkSCy6WNF5P5LY` ("hhlblog-global chat"), managed mode, no
  pre-clearance. Its hostname list must contain every hostname that serves the
  widget: `hehonglei.com`, `www.hehonglei.com`, `hehonglei.cn`, `www.hehonglei.cn`.
  Turnstile rejects any hostname that is not listed, and does not support wildcards.
- The site key is public and inlined at **build time** into the frontend bundle
  (`PUBLIC_TURNSTILE_SITE_KEY`). Rebuilding without it silently ships a widget that
  never requests a token — and then every question 403s.
- Tokens are single-use and expire after ~300 s; the client resets the widget after
  every send, so do not cache or replay one.
- Rotating the secret (e.g. after a leak) invalidates the old one immediately:

  ```bash
  curl -X POST "https://api.cloudflare.com/client/v4/accounts/<account-id>/challenges/widgets/0x4AAAAAAFWkSCy6WNF5P5LY/rotate_secret" \
    -H "Authorization: Bearer <api-token>" -H 'Content-Type: application/json' \
    -d '{"invalidate_immediately":true}'
  npx wrangler secret put TURNSTILE_SECRET_KEY   # paste the returned "secret"
  ```

## Verify a deploy

```bash
# 1. a request with no token is refused (403, not 200)
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://ai-api.hehonglei.com/ \
  -H 'Origin: https://www.hehonglei.cn' -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"hi"}]}'

# 2. a foreign origin is refused too
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://ai-api.hehonglei.com/ \
  -H 'Origin: https://example.com' -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"hi"}]}'
```

Both should print `403`. A real browser on either site must then get an answer —
if it 403s instead, the deployed `TURNSTILE_SECRET_KEY` does not match the widget
that issued the token.

## Escape hatch

`ALLOW_UNVERIFIED=1` (as a var) turns the Turnstile check off and leaves only the
`Origin` allowlist and the per-IP rate limit in front of the endpoint. It exists
for the window where the gate is broken and the sites must stay up; it is not a
configuration to leave on. Recovery is a normal deploy as shown above:

```bash
npx wrangler deploy \
  --var 'ALLOWED_ORIGINS:https://www.hehonglei.com,https://nextjs.hehonglei.cn,https://www.hehonglei.cn' \
  --var 'CONTACT_EMAIL:contact@hehonglei.com' \
  --var 'ALLOW_UNVERIFIED:1'
```
