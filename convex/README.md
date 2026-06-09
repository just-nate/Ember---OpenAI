# Convex backend

This directory contains Ember's realtime state and storage boundary.

Convex owns:

- job metadata;
- image result metadata;
- activity timeline records;
- setup health checks;
- protected HTTP callbacks from Trigger.dev;
- Cloudflare R2 storage handoff through `@convex-dev/r2`.

Trigger.dev owns the long-running image-generation work. Convex should enqueue Trigger runs and handle callbacks, but it should not call OpenAI directly.

## Useful commands

```bash
bun run convex:dev
bunx convex env list
bunx convex typecheck
```

## Required Convex environment variables

```bash
CONVEX_WORKER_SECRET=
TRIGGER_SECRET_KEY=
R2_TOKEN=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
```

`R2_PUBLIC_BASE_URL` is optional. Without it, Ember serves image views through Convex HTTP actions that generate fresh signed R2 URLs.
