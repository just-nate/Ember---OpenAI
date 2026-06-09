# Ember development guide

Ember is an open-source starter kit for production-grade background image generation. It combines Trigger.dev for durable background work, Convex for realtime state, Cloudflare R2 for storage, GPT Image 2 as the first image provider, and TanStack Router for the frontend.

The goal is a focused image-generation operations starter, not a generic AI app template.

## Core product scope

Build toward these v1 capabilities:

- Image generation job queue with `queued`, `running`, `retrying`, `failed`, and `completed` states.
- Live activity timeline, for example:
  - `Prompt received`
  - `Generating image`
  - `Retrying attempt 2/3`
  - `Image ready`
- Step-based or percentage-based progress UI.
- Result gallery for generated images.
- Download image action.
- Copy image URL action.
- Automatic retries for transient failures.
- Manual retry for failed jobs or failed result items.
- Storage adapter starting with Cloudflare R2.
- Provider adapter starting with GPT Image 2.
- Convex realtime sync for job updates, history, and activity feed.
- Trigger.dev worker for long-running generation and retry orchestration.

## Package management

Use Bun for package management and scripts.

Use:

```bash
bun install
bun add <package>
bun add -d <package>
bun remove <package>
bun run dev
bun run build
bun run typecheck
bun run check
bun run fix
```

Avoid `npm`, `yarn`, and `pnpm` unless explicitly requested.

When dependencies change, keep `bun.lock` updated.

## Architecture responsibilities

### Convex

Convex is the realtime application state layer.

Use Convex for:

- job records;
- image result records;
- activity timeline records;
- setup health checks;
- R2 storage handoff;
- realtime UI queries.

Do not use Convex actions as the long-running image generation worker. Trigger.dev owns that responsibility.

### Trigger.dev

Trigger.dev is the durable background execution layer.

Use Trigger.dev for:

- long-running GPT Image 2 calls;
- retries;
- queue concurrency;
- parent/child fan-out;
- worker observability and run metadata.

### Cloudflare R2

R2 is the first storage backend.

Store permanent R2 object keys in Convex. Generate signed URLs in Convex queries or use a custom R2 CDN domain for stable public URLs.

### GPT Image 2

GPT Image 2 is the first provider backend.

Use the OpenAI Image API for v1 prompt-to-image generation. For multiple requested outputs, create one Trigger child task per output and call OpenAI with `n = 1`.

## Convex standards

### Schema

- Define explicit schemas in `convex/schema.ts`.
- Use `v.union(v.literal(...))` for statuses and enums.
- Use `v.id("table")` for document references.
- Add indexes for every filtered query pattern.
- Use descriptive index names, such as:
  - `by_job`
  - `by_job_and_status`
  - `by_trigger_run_id`
  - `by_job_and_created_at`
- Avoid `v.any()` unless the data is intentionally unstructured.

### Functions

- Use object syntax with `args`, `returns`, and `handler`.
- Always define return validators.
- Use queries for reactive reads.
- Use mutations for transactional writes.
- Use actions for external services or scheduling worker calls.
- Use internal mutations for worker-owned updates.
- Make worker mutations idempotent so retries do not duplicate data.
- Use `ConvexError` for user-facing errors.
- Do not call external APIs inside queries or mutations.
- Do not run `npx convex deploy` unless explicitly requested.

### HTTP actions

HTTP actions are required for Trigger.dev worker callbacks into Convex.

Rules:

- Define routes in `convex/http.ts`.
- Protect server-to-server routes with a shared secret:
  - `Authorization: Bearer <CONVEX_WORKER_SECRET>`; or
  - `X-Ember-Worker-Secret: <secret>`.
- Return `401` when auth is missing.
- Return `403` when auth is invalid.
- Manually validate HTTP request bodies; HTTP actions do not have Convex argument validators.
- Keep request and response payloads within Convex HTTP limits.
- Do not add permissive CORS to worker-only endpoints.
- Add proper CORS and `OPTIONS` handling only for browser-facing endpoints.
- HTTP actions should call internal mutations for database writes.
- Trigger.dev should retry transient HTTP callback failures.

### R2 handoff

Trigger.dev cannot directly use the Convex R2 component context. The correct flow is:

```text
Trigger child task
  -> generate image with GPT Image 2
  -> call secure Convex HTTP action
  -> Convex stores image with @convex-dev/r2
  -> Convex updates job/result/activity records
```

## Trigger.dev standards

### Setup

- Use `@trigger.dev/sdk`.
- Configure `trigger.config.ts` with `dirs: ["./trigger"]`.
- Export tasks from files in the `trigger/` directory.
- Use `TRIGGER_SECRET_KEY` from the environment.
- Keep Trigger payloads and outputs small. Do not pass large image bytes through Trigger payloads or outputs when a storage handoff is available.

### Tasks

- Use `task()` or `schemaTask()`.
- Use stable task IDs, such as:
  - `generate-image-job`
  - `generate-image-output`
- Use parent/child tasks:
  - parent task coordinates the job;
  - child task generates one image result.
- For multiple images, use `batchTriggerAndWait()`.
- Do not use `Promise.all()` with `triggerAndWait()` or wait calls.
- Always check `result.ok` before reading `result.output`.
- Child tasks do not inherit parent queues. Define an explicit queue for image-generation child tasks.

### Queues and retries

- Add an explicit OpenAI image queue, for example `openai-image-generation`.
- Keep default concurrency conservative to protect cost and rate limits.
- Retry transient failures such as 429 and 5xx.
- Use `AbortTaskRunError` for user-correctable failures that should not retry, such as moderation blocks or invalid image settings.
- Use idempotency keys based on `jobId` and `resultId`.
- Use Trigger metadata for dashboard observability. Use Convex as the UI source of truth.

### Worker callbacks

Trigger tasks should call secure Convex HTTP actions when:

- a job starts;
- an image result starts;
- a retry starts;
- an image completes;
- an image fails;
- a job completes or fails.

Callback handlers must be idempotent because Trigger may retry them.

## GPT Image 2 standards

- Validate image size before sending requests.
- Supported quality values: `low`, `medium`, `high`, `auto`.
- `gpt-image-2` does not support transparent backgrounds.
- Do not retry moderation or user-input errors without changing the input.
- Store generated files in R2 and store only keys/metadata in Convex.

## TanStack Router standards

Use TanStack Router for the app routes.

Planned routes:

- `/` — create a new generation job and show recent activity.
- `/jobs` — job history.
- `/jobs/$jobId` — live job detail, timeline, progress, gallery, retry.
- `/settings` — setup health checks.

Keep route components focused and avoid placing the whole application inside one component.

## Code quality standards

Write code that is easy to read, maintain, and debug.

- Prefer clear names over clever names.
- Keep functions small and focused.
- Use early returns to reduce nesting.
- Extract constants for magic strings and numbers.
- Prefer precise types. Avoid broad `any`.
- Use `unknown` for truly unknown external data, then narrow it.
- Validate external inputs at boundaries.
- Keep provider logic separate from UI logic.
- Keep storage logic separate from provider logic.
- Keep side effects at clear boundaries: Convex actions, Convex HTTP actions, and Trigger tasks.
- Avoid duplicating business logic between Convex and Trigger.
- Do not swallow errors silently.
- Return safe user-facing error messages while logging useful developer context.

## Comments and documentation

- Add plain-language comments for non-obvious decisions, retry behavior, idempotency, security checks, and data handoffs.
- Do not over-comment obvious syntax.
- Comments should explain why the code exists, not restate what the code already says.
- Keep comments professional and concise.

Example:

```ts
// Keep this mutation idempotent because Trigger may retry the callback after a network failure.
```

## Accessibility and UX

- Use semantic HTML.
- Use real buttons for actions and links for navigation.
- Label form inputs.
- Provide loading, empty, and error states.
- Use meaningful alt text for generated images when possible.
- Keep keyboard interactions usable.
- Do not rely on color alone to communicate status.

## Status vocabulary

Use these statuses consistently unless a change is deliberate and documented:

```ts
type JobStatus = "queued" | "running" | "retrying" | "failed" | "completed"
type ImageResultStatus =
  | "queued"
  | "running"
  | "retrying"
  | "failed"
  | "completed"
```

Use these activity types consistently:

```ts
type ActivityType =
  | "prompt_received"
  | "queued"
  | "started"
  | "generating"
  | "retrying"
  | "storing"
  | "ready"
  | "failed"
  | "completed"
```

## Verification checklist

Before calling code work complete, run the relevant checks:

```bash
bun run typecheck
bun run check
bun run build
```

Also verify:

- Convex functions have `args` and `returns`.
- Queries use indexes.
- Worker update mutations are idempotent.
- Trigger tasks check child results with `result.ok`.
- Secrets remain server-only.
- UI states cover loading, empty, and error cases.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
