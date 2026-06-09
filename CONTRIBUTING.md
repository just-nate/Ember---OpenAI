# Contributing

Thanks for helping improve Ember.

## Scope

Ember is focused on production-grade background image generation operations. Keep contributions aligned with jobs, realtime state, worker orchestration, provider adapters, storage adapters, result galleries, retries, and setup health.

Please open a discussion before adding unrelated starter-kit features such as auth, chat, generic agent tooling, CRM flows, or broad dashboard modules.

## Development

Use Bun for package management and scripts:

```bash
bun install
bun add <package>
bun add -d <package>
bun run dev
bun run typecheck
bun run check
bun run build
```

Do not use npm, yarn, or pnpm unless maintainers explicitly ask for it.

## Pull request checklist

Before opening a PR, run:

```bash
bun run typecheck
bun run check
bun run build
```

Also verify that:

- Convex functions include `args` and `returns` validators.
- Queries use indexes for filtered reads.
- Trigger task outputs stay small.
- Worker callbacks include the shared worker secret.
- Browser code only reads `VITE_` variables.
- UI changes keep semantic HTML, labels, loading states, empty states, and keyboard usability.
