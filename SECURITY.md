# Security policy

## Supported versions

Ember is pre-1.0. Security fixes target the latest main branch unless maintainers publish release branches later.

## Reporting vulnerabilities

If GitHub private vulnerability reporting is available for this repository, use that first. If not, open a minimal public issue that says you need a private security contact, but do not include exploit details in the issue.

## Important v1 security notes

- v1 does not include user authentication.
- Public deployments can burn OpenAI credits if exposed without another access control layer.
- Never expose `OPENAI_API_KEY`, `TRIGGER_SECRET_KEY`, `CONVEX_WORKER_SECRET`, or R2 credentials to browser code.
- Only `VITE_CONVEX_URL` is intended for frontend use.
- Trigger.dev to Convex callbacks are protected with `CONVEX_WORKER_SECRET`.
- Worker-only Convex HTTP actions intentionally do not include permissive CORS.
