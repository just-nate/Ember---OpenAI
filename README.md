# Ember

Ember is an OSS starter kit for production-grade background image generation. It combines Convex realtime state, Trigger.dev durable workers, GPT Image 2 generation, and Cloudflare R2 image storage.

Ember is not a generic AI app starter. The v1 scope stays focused on image-generation jobs, progress, retries, storage, and result operations.

## Features

- Background image generation jobs with `queued`, `running`, `retrying`, `failed`, and `completed` states
- Live activity timeline backed by Convex subscriptions
- Step-based progress UI
- Result gallery for generated images
- Download image action
- Copy image URL action
- Automatic retries for transient worker/provider failures
- Manual retry for failed jobs and failed result items
- Protected Trigger.dev to Convex worker callbacks
- GPT Image 2 provider adapter
- Cloudflare R2 storage handoff
- Setup health page for required environment checks

## Architecture

```text
Browser
  -> React + TanStack Router
  -> Convex realtime queries/mutations
  -> Convex action enqueues Trigger.dev job
  -> Trigger.dev parent task fans out child image tasks
  -> GPT Image 2 generates one image per child task
  -> Trigger.dev posts image payload to protected Convex HTTP action
  -> Convex stores image in Cloudflare R2
  -> Convex updates job/result/activity records
  -> Browser receives live Convex updates
```

## Tech stack

- Bun
- Vite
- React
- TypeScript
- Tailwind CSS / shadcn-compatible primitives
- TanStack Router
- Convex
- Trigger.dev
- OpenAI GPT Image 2
- Cloudflare R2 via `@convex-dev/r2`
- Ultracite

## Prerequisites

- Bun
- Convex account/project
- Trigger.dev account/project
- OpenAI API key with image generation access
- Cloudflare R2 bucket and credentials

## Installation

```bash
bun install
cp .env.example .env.local
```

## Environment variables

`.env.example` lists every required variable. Only `VITE_CONVEX_URL` is browser-safe.

```bash
VITE_CONVEX_URL=
CONVEX_SITE_URL=
CONVEX_WORKER_SECRET=
TRIGGER_SECRET_KEY=
TRIGGER_PROJECT_REF=
OPENAI_API_KEY=
R2_TOKEN=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
```

`CONVEX_SITE_URL` must be the Convex HTTP actions URL and must end in `.convex.site`.

Do not commit `.env` or `.env.local`.

## Convex setup

Run Convex locally:

```bash
bun run convex:dev
```

Set worker and R2 values in Convex env, not browser env:

```bash
bunx convex env set CONVEX_WORKER_SECRET <value>
bunx convex env set R2_TOKEN <value>
bunx convex env set R2_ACCESS_KEY_ID <value>
bunx convex env set R2_SECRET_ACCESS_KEY <value>
bunx convex env set R2_ENDPOINT <value>
bunx convex env set R2_BUCKET <value>
bunx convex env set R2_PUBLIC_BASE_URL <value>
```

`R2_PUBLIC_BASE_URL` is optional. Use it when you have a stable public CDN/custom domain for copied and downloaded image URLs.

## Trigger.dev setup

Set `TRIGGER_PROJECT_REF` in `.env.local`. Set `TRIGGER_SECRET_KEY` anywhere Convex enqueues Trigger runs. Set `OPENAI_API_KEY`, `CONVEX_SITE_URL`, and `CONVEX_WORKER_SECRET` in the Trigger.dev runtime environment because worker tasks call OpenAI and post callbacks to Convex.

Use the standard Trigger scripts:

```bash
bun run trigger:login
bun run trigger:whoami
bun run trigger:dev
bun run trigger:deploy:dry
bun run trigger:deploy
```

Trigger loads tasks from `./trigger` via `trigger.config.ts`. The dev and deploy scripts load `.env.local` with `--env-file .env.local` so the project ref is consistent.

## OpenAI setup

Set `OPENAI_API_KEY` in the worker environment. The v1 adapter uses `gpt-image-2`, sends `n = 1` per child task, validates prompt/quality/size, and treats moderation or invalid-input errors as non-retryable.

## Cloudflare R2 setup

Create an R2 bucket and credentials, then set the R2 values in Convex env. Convex owns storage writes through `@convex-dev/r2`; Trigger sends generated image data to the protected Convex HTTP action.

## Running locally

Use separate terminals:

```bash
bun run dev
bun run convex:dev
bun run trigger:dev
```

Open the Vite URL, submit a prompt on `/`, and inspect live progress on `/jobs/$jobId`.

## Build and verification

```bash
bun run typecheck
bun run check
bun run build
```

## Deployment notes

- Deploy Convex and note the `.convex.site` HTTP actions URL.
- Configure Trigger.dev with the same `CONVEX_SITE_URL` and `CONVEX_WORKER_SECRET`.
- Configure OpenAI and R2 secrets only in server-side environments.
- Add an access-control layer before exposing a public demo because v1 has no user auth.

## Security notes

- v1 has no user authentication.
- Public deployments can burn OpenAI credits.
- Never expose `OPENAI_API_KEY`, `TRIGGER_SECRET_KEY`, `CONVEX_WORKER_SECRET`, or R2 secrets to browser code.
- Worker callbacks require `Authorization: Bearer <secret>` or `X-Ember-Worker-Secret`.
- Worker-only HTTP actions intentionally avoid permissive CORS.
- See [SECURITY.md](./SECURITY.md) for reporting guidance.

## Troubleshooting

- Missing `VITE_CONVEX_URL`: copy `.env.example` to `.env.local` and set the Convex deployment URL.
- Worker callback returns `401`: Trigger did not send a worker secret.
- Worker callback returns `403`: Trigger sent the wrong worker secret.
- Image completion fails with payload size errors: generated base64 JSON exceeded the Convex HTTP action safety limit.
- Copied image URL is missing: configure `R2_PUBLIC_BASE_URL` or add a signed URL/public URL strategy.

## Roadmap

- Direct R2 upload fallback for large files
- Additional image providers through provider adapters
- More storage URL strategies
- Stronger deployment templates
- Optional app-level auth after discussion

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Use Bun, run checks before PRs, and keep the project focused on background image generation.

## License

MIT. See [LICENSE](./LICENSE).
