# Ember implementation plan

Purpose: migrate the current Vite/shadcn template into Ember, an OSS starter kit for production-ready background image generation.

Use this document as the build order. Complete each section before moving to the next.

## Section 1 — Target product

Ember must provide:

- Background image generation jobs.
- Job states: `queued`, `running`, `retrying`, `failed`, `completed`.
- Live activity timeline.
- Progress UI.
- Result gallery.
- Download image.
- Copy image URL.
- Automatic retry.
- Manual retry.
- Convex realtime job history.
- Trigger.dev long-running worker.
- GPT Image 2 provider adapter.
- Cloudflare R2 storage adapter.

Ember must not become a generic AI app starter.

## Section 2 — Current template cleanup

Replace template content with Ember content.

Do:

- Replace `README.md` entirely.
- Replace the default `src/App.tsx` app content.
- Remove Vite/shadcn template copy from docs and metadata.
- Remove unused demo assets from `public/` after checking references.
- Keep Tailwind/shadcn only if the UI uses it.
- Keep Bun, Vite, React, TypeScript, Ultracite, and `bun.lock`.

## Section 3 — Package setup

Use Bun only.

Install required packages:

```bash
bun add @tanstack/react-router @tanstack/router-devtools @convex-dev/r2 @trigger.dev/sdk openai zod
bun add -d @tanstack/router-plugin
```

Do not add `@trigger.dev/react-hooks` for v1. Convex is the frontend realtime source.

Update `package.json`:

- Add a real description.
- Add license.
- Add OSS keywords.
- Add repository, bugs, and homepage when the GitHub URL exists.
- Remove or set `private: false` before publishing.

Required scripts:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "typecheck": "tsc --noEmit",
  "check": "ultracite check",
  "fix": "ultracite fix",
  "preview": "vite preview",
  "convex:dev": "convex dev",
  "trigger:dev": "trigger dev"
}
```

## Section 4 — Environment files

Create `.env.example`.

Required variables:

```bash
# Browser-safe Convex URL
VITE_CONVEX_URL=

# Convex HTTP action base URL. Must end in .convex.site
CONVEX_SITE_URL=

# Shared secret for Trigger -> Convex callbacks
CONVEX_WORKER_SECRET=

# Trigger.dev
TRIGGER_SECRET_KEY=
TRIGGER_PROJECT_REF=

# OpenAI
OPENAI_API_KEY=

# Cloudflare R2. Set these in Convex env, not browser env.
R2_TOKEN=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=
R2_BUCKET=

# Optional public CDN base URL for stable image links
R2_PUBLIC_BASE_URL=
```

Rules:

- Do not commit `.env`.
- Do not prefix server secrets with `VITE_`.
- Only `VITE_CONVEX_URL` may be used in browser code.
- Document that R2 values must be set in Convex env.

## Section 5 — TanStack Router

Set up routing before building pages.

Update `vite.config.ts`:

```ts
plugins: [TanStackRouterVite(), react(), tailwindcss()]
```

`TanStackRouterVite()` must come before `react()`.

Create routes:

```text
src/routes/__root.tsx
src/routes/index.tsx
src/routes/jobs.tsx
src/routes/jobs.$jobId.tsx
src/routes/settings.tsx
```

Update `src/main.tsx`:

- Add TanStack Router provider.
- Add Convex provider.
- Keep theme provider only if still used.

Route responsibilities:

- `/`: create job form and recent activity.
- `/jobs`: job history.
- `/jobs/$jobId`: live job detail, progress, timeline, gallery, retry controls.
- `/settings`: setup health checklist.

## Section 6 — Convex schema

Create:

```text
convex/schema.ts
```

Tables:

```text
jobs
imageResults
activities
```

Statuses:

```ts
;"queued" | "running" | "retrying" | "failed" | "completed"
```

Activity types:

```ts
;"prompt_received" |
  "queued" |
  "started" |
  "generating" |
  "retrying" |
  "storing" |
  "ready" |
  "failed" |
  "completed"
```

Required indexes:

```text
jobs.by_created_at
jobs.by_status
jobs.by_trigger_run_id
imageResults.by_job
imageResults.by_job_and_status
imageResults.by_trigger_run_id
activities.by_job_and_created_at
activities.by_dedupe_key
```

Schema rules:

- Use explicit validators.
- Use `v.id("table")` for references.
- Avoid `v.any()` unless intentionally unstructured.
- Add indexes before writing queries that need them.

## Section 7 — Convex functions

Create:

```text
convex/jobs.ts
convex/imageResults.ts
convex/activities.ts
convex/settings.ts
convex/trigger.ts
```

Public UI functions:

```text
jobs.create
jobs.list
jobs.get
jobs.retry
imageResults.listByJob
activities.listByJob
settings.health
```

Internal worker functions:

```text
jobs.markTriggerStarted
jobs.markRunning
jobs.markCompletedIfDone
jobs.markFailed
imageResults.markRunning
imageResults.markRetrying
imageResults.markCompleted
imageResults.markFailed
activities.appendOnce
```

Function rules:

- Every Convex function must define `args` and `returns`.
- Queries must use indexes.
- Public functions must not expose secrets.
- Worker update mutations must be idempotent.
- Use `dedupeKey` for activity rows created by callbacks.
- Duplicate completion callbacks must not increment counters twice.

`jobs.create` flow:

1. Validate prompt and options.
2. Insert job.
3. Insert result rows.
4. Insert initial activity.
5. Schedule `trigger.enqueueImageJob` with `ctx.scheduler.runAfter(0, ...)`.
6. Return `jobId`.

`trigger.enqueueImageJob` flow:

1. Trigger `generate-image-job` in Trigger.dev.
2. Use idempotency key based on `jobId`.
3. Store Trigger run handle on the job.
4. Append queue handoff activity.

## Section 8 — Convex HTTP actions

Create:

```text
convex/http.ts
```

Required routes:

```text
GET  /worker/health
POST /worker/jobs/started
POST /worker/jobs/progress
POST /worker/jobs/complete
POST /worker/jobs/failed
POST /worker/images/started
POST /worker/images/retrying
POST /worker/images/complete
POST /worker/images/failed
```

Security rules for write routes:

- Require worker secret.
- Accept `Authorization: Bearer <secret>` or `X-Ember-Worker-Secret`.
- Return `401` for missing auth.
- Return `403` for invalid auth.
- Do not use permissive CORS on worker-only routes.

Validation rules:

- Catch invalid JSON.
- Validate required IDs.
- Validate status values.
- Validate numeric bounds.
- Validate allowed MIME types.
- Validate base64 payload size before decoding.

`POST /worker/images/complete` payload:

```json
{
  "jobId": "...",
  "resultId": "...",
  "triggerRunId": "run_...",
  "variantIndex": 0,
  "imageBase64": "...",
  "mimeType": "image/png",
  "fileName": "ember-job-result.png",
  "providerMetadata": { "model": "gpt-image-2" }
}
```

`POST /worker/images/complete` flow:

1. Verify worker secret.
2. Validate payload.
3. Reject unsafe payload size.
4. Decode base64.
5. Store Blob through R2 component.
6. Mark result completed.
7. Update job progress.
8. Append `Image ready` activity.
9. Return `{ "ok": true, "r2Key": "..." }`.

Limit:

- Convex HTTP actions have a 20MB request/response limit.
- Start with base64 JSON only if generated files stay under the limit.
- Later fallback: direct R2 upload plus metadata callback.

## Section 9 — Cloudflare R2

Create:

```text
convex/convex.config.ts
convex/storage.ts
```

`convex/convex.config.ts`:

```ts
import r2 from "@convex-dev/r2/convex.config.js"
import { defineApp } from "convex/server"

const app = defineApp()
app.use(r2)

export default app
```

`convex/storage.ts` must include:

- R2 client setup.
- Store generated image helper.
- Signed URL helper.
- Optional CDN URL helper using `R2_PUBLIC_BASE_URL`.

README must document:

```bash
bunx convex env set R2_TOKEN <value>
bunx convex env set R2_ACCESS_KEY_ID <value>
bunx convex env set R2_SECRET_ACCESS_KEY <value>
bunx convex env set R2_ENDPOINT <value>
bunx convex env set R2_BUCKET <value>
```

## Section 10 — Trigger.dev

Create:

```text
trigger.config.ts
trigger/generate-image-job.ts
trigger/generate-image-output.ts
trigger/lib/convex-callbacks.ts
trigger/lib/gpt-image-2.ts
trigger/lib/image-options.ts
trigger/lib/errors.ts
```

`trigger.config.ts` must configure:

- project ref;
- `dirs: ["./trigger"]`;
- runtime;
- default retries;
- max duration.

Parent task: `generate-image-job`

- Mark job started in Convex.
- Set Trigger metadata progress.
- For one image, use `triggerAndWait()`.
- For multiple images, use `batchTriggerAndWait()`.
- Check every child result with `result.ok`.
- Allow partial success.
- Mark job complete or failed in Convex.

Child task: `generate-image-output`

- Use explicit queue, e.g. `openai-image-generation`.
- Use conservative concurrency.
- Mark image started in Convex.
- Mark retries in Convex.
- Call GPT Image 2 with `n = 1`.
- Abort retries for moderation or invalid input errors.
- Decode base64 image.
- POST to `/worker/images/complete`.
- Mark failure in Convex if needed.
- Return small JSON only.

Callback helper must centralize:

- Convex site URL.
- Worker secret header.
- JSON callback requests.
- Image completion request.
- Retry behavior for transient `429` and `5xx` responses.

## Section 11 — GPT Image 2 adapter

Create adapter code in:

```text
trigger/lib/gpt-image-2.ts
trigger/lib/image-options.ts
```

Adapter requirements:

- Use `OPENAI_API_KEY`.
- Default model: `gpt-image-2`.
- Use OpenAI Image API.
- Use `n = 1` per child task.
- Validate prompt.
- Validate quality: `low`, `medium`, `high`, `auto`.
- Validate size:
  - edges are multiples of 16;
  - aspect ratio is no more than 3:1;
  - total pixels are within GPT Image 2 bounds;
  - max edge is within GPT Image 2 bounds.
- Normalize errors as retryable or non-retryable.

## Section 12 — Frontend UI

Create components:

```text
src/components/app-shell.tsx
src/components/job-form.tsx
src/components/job-status-badge.tsx
src/components/progress-steps.tsx
src/components/activity-timeline.tsx
src/components/result-gallery.tsx
src/components/result-card.tsx
src/components/copy-url-button.tsx
src/components/retry-button.tsx
src/components/setup-health.tsx
```

UI requirements:

- Prompt form validates before submit.
- Form supports count, size, quality, and format.
- Job detail page subscribes to Convex queries.
- Timeline updates live.
- Gallery updates as images complete.
- Result card supports download.
- Result card supports copy image URL.
- Retry button appears only for failed jobs/results.
- Loading, empty, and error states exist.
- Use semantic HTML.
- Label inputs.
- Do not rely on color alone for status.

## Section 13 — OSS files

Add or replace these files:

```text
README.md
LICENSE
.env.example
CONTRIBUTING.md or README contributing section
SECURITY.md or README security section
```

README must include:

- What Ember is.
- What Ember is not.
- Feature list.
- Architecture diagram.
- Tech stack.
- Prerequisites.
- Installation.
- Environment variables.
- Convex setup.
- Trigger.dev setup.
- OpenAI setup.
- Cloudflare R2 setup.
- Running locally.
- Build command.
- Deployment notes.
- Security notes.
- Troubleshooting.
- Roadmap.
- Contributing.
- License.

License:

- Add MIT by default unless a different license is chosen.

Contributing notes:

- Use Bun.
- Run checks before PRs.
- Keep scope focused on background image generation.
- Do not add auth or unrelated starter-kit features without discussion.

Security notes:

- v1 has no user auth.
- Public deployments can burn OpenAI credits.
- Never expose secrets to browser code.
- Protect Trigger -> Convex callbacks with `CONVEX_WORKER_SECRET`.
- Provide private vulnerability reporting instructions if contact info exists.

## Section 14 — Verification

Run after package/router setup:

```bash
bun install
bun run typecheck
bun run build
```

Run after Convex work:

```bash
bun run typecheck
bun run check
```

Convex checks:

- Functions have `args` and `returns`.
- Queries use indexes.
- Worker mutations are idempotent.
- HTTP actions validate request bodies.

Run after Trigger work:

```bash
bun run typecheck
bun run check
```

Trigger checks:

- Tasks are exported from `trigger/`.
- Child task queue exists.
- `batchTriggerAndWait()` results check `result.ok`.
- Callbacks include worker secret.
- Large image bytes are not returned as Trigger outputs.

Final verification:

```bash
bun run typecheck
bun run check
bun run build
```

Final manual checks:

- README contains no Vite/shadcn template copy.
- `.env.example` is complete.
- License exists.
- Package metadata is OSS-ready.
- Security warning is visible.
- Setup docs mention Convex `.convex.site` callback URL.
- Generated image URLs can be copied and downloaded.
- Failed results can be retried.
- No secrets appear in browser code.

## Section 15 — Definition of done

V1 is done when:

- User can submit a prompt from `/`.
- Convex creates job and result rows.
- Trigger.dev processes the job.
- GPT Image 2 generates one image per child task.
- Trigger sends completed images to protected Convex HTTP actions.
- Convex stores images in R2.
- Job detail page updates live through Convex.
- Gallery supports download and copy URL.
- Failed jobs/results can be retried.
- README explains setup from clone to running app.
- `bun run typecheck` passes.
- `bun run check` passes.
- `bun run build` passes.
