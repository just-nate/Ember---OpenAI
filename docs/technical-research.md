# Ember technical research notes

Ember is a production-ready background image generation starter kit with live progress, retries, storage, and result tracking.

## What the docs and skills say

### Trigger.dev

Sources checked:

- https://trigger.dev/docs/tasks/overview
- https://trigger.dev/docs/triggering
- https://trigger.dev/docs/queue-concurrency
- https://trigger.dev/docs/errors-retrying
- https://trigger.dev/docs/idempotency
- https://trigger.dev/docs/runs/metadata
- https://trigger.dev/docs/realtime/overview
- https://trigger.dev/docs/realtime/react-hooks/subscribe
- https://trigger.dev/docs/guides/use-cases/media-generation
- `/home/jn/.agents/skills/trigger-setup/SKILL.md`
- `/home/jn/.agents/skills/trigger-config/SKILL.md`
- `/home/jn/.agents/skills/trigger-tasks/SKILL.md`
- `/home/jn/.agents/skills/trigger-realtime/SKILL.md`

Key findings:

- Trigger.dev tasks are built for long-running AI/media jobs with automatic retries and no normal request timeout pressure.
- Tasks must use `@trigger.dev/sdk`, be exported from files in the `trigger/` directory, and be registered by `trigger.config.ts`.
- Each task run enters a queue first. Default concurrency is mostly unbounded until the environment limit, so image generation needs an explicit queue to protect OpenAI rate limits and user cost.
- Tasks retry when they throw. Default retry count is 3 attempts, but each task can set `retry.maxAttempts`, backoff, jitter, and timeout caps.
- `AbortTaskRunError` is the right escape hatch for user-correctable failures that should not retry, like moderation blocks or invalid size settings.
- Parent/child tasks are a first-class pattern:
  - `triggerAndWait()` for one child.
  - `batchTriggerAndWait()` for many children of the same task.
  - `batch.triggerAndWait()` / `batch.triggerByTaskAndWait()` for multiple task types.
- Docs and skills warn not to run many `triggerAndWait()` calls in `Promise.all`; use batch APIs and child-task queue limits instead.
- Child tasks do not inherit the parent queue. The image child task needs its own explicit queue.
- Every result returned by `triggerAndWait()` / `batchTriggerAndWait()` must be checked with `result.ok` before reading `result.output`.
- Trigger metadata supports live progress and activity data up to 256KB. Child tasks can update parent/root metadata, which is useful for fan-out progress in the Trigger dashboard.
- Trigger Realtime React hooks exist, but they require scoped public access tokens. For Ember v1, Convex should be the user-facing realtime source; Trigger metadata should still be used for Trigger dashboard observability.
- Trigger payloads should stay small. Do not send generated image bytes as Trigger payload/output when avoidable; send them to Convex/R2 and return small keys/IDs.
- `trigger.config.ts` should define the project, task dirs, runtime, default retries, and optional machine defaults.

### Convex

Sources checked:

- https://docs.convex.dev/functions
- https://docs.convex.dev/functions/actions
- https://docs.convex.dev/functions/http-actions
- https://docs.convex.dev/realtime
- https://docs.convex.dev/components/using
- https://www.convex.dev/components/cloudflare-r2
- https://github.com/get-convex/r2
- `/home/jn/.agents/skills/convex-best-practices/SKILL.md`
- `/home/jn/.agents/skills/convex-functions/SKILL.md`
- `/home/jn/.agents/skills/convex-http-actions/SKILL.md`
- `/home/jn/.agents/skills/convex-schema-validator/SKILL.md`
- `/home/jn/.agents/skills/convex-file-storage/SKILL.md`

Key findings:

- Convex queries are automatically realtime. If the UI subscribes to `jobs.list`, `jobs.get`, `activities.list`, or `results.list`, React updates when the database changes.
- Convex actions can call external services, but Convex docs recommend clients call a mutation first, then that mutation schedules an action. That keeps user intent durable in the database before external work starts.
- Convex actions are not a replacement for long-running generation because actions time out. Trigger.dev should own the long-running OpenAI work; Convex should own state, history, storage, and realtime UI.
- Convex HTTP actions expose custom routes at `https://<deployment>.convex.site` and receive standard Fetch API `Request` objects.
- HTTP actions can call `ctx.runQuery`, `ctx.runMutation`, and `ctx.runAction`, but they do not have function argument validators. We must parse and validate the request body ourselves.
- HTTP actions are not automatically retried by Convex. Trigger.dev should retry HTTP calls to Convex when appropriate.
- HTTP actions have a 20MB request/response size limit. This matters for generated images, especially high-resolution PNGs.
- HTTP actions run in the Convex runtime, not Node.js. If a route needs Node-only code, it should call an internal Node action.
- Browser-facing HTTP actions need CORS and `OPTIONS` handlers. Server-to-server Trigger → Convex endpoints do not need permissive CORS.
- Convex Components run in their own sandbox and are installed in `convex/convex.config.ts` with `app.use(...)`.
- The `@convex-dev/r2` component can store and serve files from Cloudflare R2.
- R2 component setup needs `R2_TOKEN`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, and `R2_BUCKET` in Convex env.
- R2 component upload/storage APIs:
  - `r2.store(ctx, blob, options)` uploads a Blob/Buffer/Uint8Array from an action-like Convex context, syncs metadata, and returns a key.
  - `r2.getUrl(key, { expiresIn })` returns a signed URL, defaulting to short-lived URLs.
  - For permanent copyable URLs, use an R2 custom domain and build a CDN URL from the key.
- Convex schema/functions should follow these rules:
  - explicit schema in `convex/schema.ts`;
  - return validators on all functions;
  - indexes for every filtered query;
  - public functions only for UI-safe reads/mutations;
  - internal mutations for worker updates;
  - idempotent mutations so retries do not duplicate activity/result rows.

### OpenAI GPT Image 2

Sources checked:

- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.openai.com/api/docs/models/gpt-image-2
- https://github.com/openai/openai-cookbook/blob/2ccacf27/examples/multimodal/image-gen-models-prompting-guide.ipynb

Key findings:

- `gpt-image-2` is the recommended default for new production image generation/editing workflows.
- The Image API is the best fit for Ember v1 because Ember starts with direct prompt-to-image and result tracking, not conversational multi-turn editing.
- The `n` parameter can generate multiple images in one OpenAI request. For Ember, we should still model each requested output as a separate result record so progress, retries, and downloads stay clean.
- Recommended Ember v1 behavior: use one OpenAI image per child task (`n = 1`) and fan out with Trigger `batchTriggerAndWait()` for multiple outputs.
- Popular `gpt-image-2` sizes include `1024x1024`, `1536x1024`, `1024x1536`, `2048x2048`, `2048x1152`, `3840x2160`, and `2160x3840`.
- Size constraints: both edges multiples of 16, max edge up to 3840px, aspect ratio no greater than 3:1, and total pixels between 655,360 and 8,294,400.
- Quality options are `low`, `medium`, `high`, and `auto`. Start with `low` for fast drafts and high-volume batches; use `medium`/`high` for final assets, dense text, brand-sensitive work, or detailed layouts.
- `gpt-image-2` does not support transparent backgrounds. If users need transparency later, use a downstream background-removal adapter.
- The API returns base64 image data by default. The worker should decode it, store it, then save a stable R2 key and metadata in Convex.
- OpenAI says retry transient failures like 429 and 5xx, but do not blindly retry user-correctable image errors like moderation blocks.
- Prompting guide patterns to encode in examples:
  - Use structured prompts: goal → scene/background → subject → visual details → constraints.
  - Put exact in-image text in quotes and say it must appear once, verbatim.
  - For edits, say what changes and what must remain unchanged.
  - For multi-image inputs, reference images by index and role.
  - Prefer small iterations over overloaded prompts.

## Corrected v1 architecture

```text
React + TanStack Router UI
        |
        | submit prompt
        v
Convex mutation: create job + result rows + activity row
        |
        | schedules quick action
        v
Convex action: trigger Trigger.dev parent task
        |
        | jobId payload, idempotency key, small JSON only
        v
Trigger parent task: generate-image-job
        |
        | one output: triggerAndWait child
        | many outputs: batchTriggerAndWait child runs
        v
Trigger child task(s): generate-image-output
        |
        | call GPT Image 2, decode base64, keep bytes out of Trigger payload/output
        v
Convex HTTP action: POST /worker/images/complete
        |
        | verify server-to-server secret
        | parse image payload under 20MB
        | store via @convex-dev/r2
        | call internal mutation to update result/job/activity
        v
Convex DB + R2 object key
        |
        | reactive queries
        v
Live UI: progress, timeline, gallery, retry button
```

Important correction: Trigger tasks cannot directly use Convex `ctx` or the Convex R2 component context. Trigger must call back into Convex through a secure HTTP action or Convex client. For Ember v1, the explicit HTTP action path is clearer and easier for OSS users to reason about.

## HTTP actions plan

### Server-to-server endpoints

These endpoints are called by Trigger.dev, not by the browser.

```text
POST /worker/jobs/started
POST /worker/jobs/progress
POST /worker/images/started
POST /worker/images/retrying
POST /worker/images/complete
POST /worker/images/failed
POST /worker/jobs/complete
POST /worker/jobs/failed
GET  /worker/health
```

All write endpoints must:

- require `Authorization: Bearer ${CONVEX_WORKER_SECRET}` or `X-Ember-Worker-Secret`;
- return `401` for missing secret and `403` for wrong secret;
- parse JSON or binary bodies safely;
- validate required fields manually because HTTP actions do not have Convex args validators;
- call internal mutations for database writes;
- be idempotent so Trigger retries cannot duplicate results or activity rows;
- return small JSON responses like `{ "ok": true }`.

### Image completion endpoint

For v1 simplicity:

```text
POST /worker/images/complete
Content-Type: application/json
Authorization: Bearer <CONVEX_WORKER_SECRET>

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

The endpoint should:

1. verify the worker secret;
2. validate `jobId`, `resultId`, `imageBase64`, and `mimeType`;
3. reject payloads above the safe size limit before decoding;
4. decode base64 into a Blob;
5. store the Blob through the R2 component;
6. call one internal mutation that:
   - marks the result completed;
   - stores `r2Key` and file metadata;
   - increments job `completedCount`;
   - recalculates `progressPercent`;
   - appends an `Image ready` activity entry;
   - marks job completed when all results are terminal.

### Size limit fallback

Convex HTTP actions have a 20MB request/response limit. If high-quality or high-resolution output may exceed that limit, add a second storage flow:

```text
Trigger child task
  -> asks Convex for a one-time upload URL / reserved R2 key
  -> uploads image bytes directly to R2
  -> calls Convex HTTP action with key + metadata only
```

Recommended v1 default: cap generated images to common HD sizes and use `png`/`webp` settings that stay under 20MB. Add the direct-upload flow later if needed.

## Data model direction

### `jobs`

- `prompt`
- `status`: `queued | running | retrying | failed | completed`
- `provider`: initially `openai:gpt-image-2`
- `storage`: initially `cloudflare-r2`
- `requestedCount`
- `completedCount`
- `failedCount`
- `progressPercent`
- `currentStep`
- `triggerRunId?`
- `triggerBatchId?`
- `lastErrorCode?`
- `lastErrorMessage?`
- `createdAt`, `updatedAt`, `completedAt?`, `failedAt?`
- indexes: `by_created_at`, `by_status`, `by_trigger_run_id`

### `imageResults`

- `jobId`
- `status`: `queued | running | retrying | failed | completed`
- `variantIndex`
- `prompt`
- `size`
- `quality`
- `format`
- `r2Key?`
- `contentType?`
- `fileSize?`
- `publicUrl?` when using an R2 custom domain
- `triggerRunId?`
- `errorCode?`, `errorMessage?`
- `attemptCount`
- `createdAt`, `updatedAt`, `completedAt?`, `failedAt?`
- indexes: `by_job`, `by_job_and_status`, `by_trigger_run_id`

### `activities`

- `jobId`
- `resultId?`
- `type`: `prompt_received | queued | started | generating | retrying | storing | ready | failed | completed`
- `message`
- `dedupeKey?`
- `createdAt`
- `metadata?`
- indexes: `by_job_and_created_at`, `by_dedupe_key`

### `settings` or setup-health query data

No secrets should be stored in public Convex tables. Setup checks should only expose booleans:

- `hasOpenAIKey`
- `hasTriggerSecretKey`
- `hasWorkerSecret`
- `hasR2Config`
- `hasR2CustomDomain`

## Function boundary plan

### Public Convex functions for UI

- `jobs.create` — public mutation that captures prompt and schedules trigger action.
- `jobs.list` — reactive query for job history.
- `jobs.get` — reactive query for one job.
- `imageResults.listByJob` — reactive query, returns signed or CDN URLs.
- `activities.listByJob` — reactive query for timeline.
- `jobs.retry` — public mutation to retry a failed job/result.
- `settings.health` — public query/action showing safe setup booleans only.

### Internal Convex functions for worker updates

- `jobs.markTriggerStarted`
- `jobs.markRunning`
- `jobs.markCompletedIfDone`
- `jobs.markFailed`
- `imageResults.markRunning`
- `imageResults.markRetrying`
- `imageResults.markCompleted`
- `imageResults.markFailed`
- `activities.appendOnce`

### Convex action for triggering Trigger.dev

- `trigger.enqueueImageJob`
  - scheduled by `jobs.create` mutation;
  - calls `tasks.trigger<typeof generateImageJob>("generate-image-job", payload, options)`;
  - uses idempotency key based on `jobId`;
  - stores Trigger run handle on the job.

## Trigger task plan

### `trigger.config.ts`

- `dirs: ["./trigger"]`
- runtime: Node/Bun depending on project setup
- default retries enabled for deployed environments
- sensible `maxDuration`
- no heavy build extensions needed for v1 unless image post-processing is added later

### Parent task: `generate-image-job`

Responsibilities:

- mark job running through Convex HTTP action;
- append `Prompt received` / `Generating image` activity;
- if one output, call `generate-image-output.triggerAndWait()`;
- if multiple outputs, call `generate-image-output.batchTriggerAndWait()`;
- check every result with `result.ok`;
- update parent metadata with progress and child run IDs;
- continue when some child runs fail so the UI can show partial success;
- call Convex job completion/failure endpoint at the end.

### Child task: `generate-image-output`

Responsibilities:

- explicit queue, e.g. `queue({ name: "openai-image-generation", concurrencyLimit: 2 })`;
- retry transient failures with exponential backoff;
- mark result running/retrying through Convex HTTP actions;
- call GPT Image 2 with `n = 1`;
- abort retries for moderation/user-correctable errors;
- decode returned base64;
- POST image to Convex HTTP action for R2 storage and DB update;
- return only small JSON: `{ resultId, r2Key, status }`.

## Adapter boundaries

### Provider adapter

Initial adapter: `GptImage2Provider`.

Future adapters: Replicate, Fal, Gemini, Stability.

```ts
interface ImageProviderAdapter {
  generate(input: ImageGenerationInput): Promise<GeneratedImage[]>
}
```

Implementation note: in v1 each child task should request one image, so `GeneratedImage[]` will usually contain one item. Keep the array shape so future providers/batch APIs fit without redesigning the interface.

### Storage adapter

Initial adapter: Convex HTTP action + `@convex-dev/r2`.

Future adapters: direct S3, UploadThing, local filesystem.

```ts
interface ImageStorageAdapter {
  store(input: StoreImageInput): Promise<StoredImage>
  getUrl(key: string): Promise<string>
}
```

Implementation note: storage is physically implemented in Convex for v1 because Convex owns the R2 component context and job state.

## Retry strategy

- Trigger task retries handle transient worker/OpenAI/storage failures.
- Trigger should retry the Convex HTTP callback for transient `429` and `5xx` responses.
- Convex internal mutations must be idempotent:
  - if a result is already completed with an `r2Key`, return success;
  - if an activity with the same `dedupeKey` exists, do not insert another;
  - counters should be derived or carefully updated once.
- Child task retry metadata should update:
  - `Retrying attempt 2/3`
  - status `retrying`
  - attempt counter on the result row.
- Do not retry moderation/user-input errors automatically. Mark the job or result failed with a safe, user-readable message.
- Manual retry creates a new Trigger run for the failed result or job and appends an activity entry instead of mutating history away.
- Use Trigger idempotency keys based on `jobId` and `resultId` so parent retries do not duplicate children.

## UI routing direction with TanStack Router

- `/` — create a new generation job and show latest activity.
- `/jobs` — job history.
- `/jobs/$jobId` — live job detail, timeline, progress, result gallery, manual retry.
- `/settings` — local OSS setup health: Convex URL, Trigger env present, R2 configured, OpenAI key present.

## Important product decisions

- Ember is not an “AI app starter.” It is a focused image-generation operations starter.
- Convex should be the user-facing realtime source of truth.
- Trigger.dev should be the durable worker/orchestrator.
- HTTP actions are part of the core architecture for worker callbacks and storage handoff.
- R2 keys should be stored permanently. URLs may be signed/temporary unless a custom R2 CDN domain is configured.
- No auth for v1 means this is best positioned as a self-hosted/single-operator OSS project. Secrets must never touch the browser.
- Even without user auth, server-to-server worker endpoints must be protected by a shared secret.
- Without auth, public deployments can burn OpenAI credits. The README should warn users and we should consider simple rate limiting or a local-only default before public demo mode.

## Implementation order

1. Add TanStack Router shell and routes.
2. Add Convex schema for jobs, image results, activities, and safe setup health.
3. Add Convex public queries/mutations for job creation, history, detail, timeline, and retry.
4. Add Convex internal mutations for worker updates.
5. Add Convex HTTP actions for Trigger worker callbacks.
6. Add Convex R2 component setup and storage logic behind `/worker/images/complete`.
7. Add Trigger.dev config and parent/child image generation tasks.
8. Add GPT Image 2 provider adapter.
9. Wire Convex create-job mutation to schedule Trigger run.
10. Build live job detail UI from Convex queries.
11. Add manual retry.
12. Write README setup: OpenAI, Trigger.dev, Convex, Cloudflare R2, worker shared secret, and HTTP callback URL.
