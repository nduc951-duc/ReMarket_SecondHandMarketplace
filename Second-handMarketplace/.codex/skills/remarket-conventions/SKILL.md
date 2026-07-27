---
name: remarket-conventions
description: Apply ReMarket-specific architecture and coding conventions. Use when adding, changing, reviewing, or refactoring frontend React code, backend Express code, API endpoints, services, stores, pages, components, models, middleware, validation, or error handling in this repository.
---

# ReMarket Conventions

Read `references/architecture.md` before changing application structure.

## Work from the existing design

1. Query Graphify for the feature or flow before opening broad parts of the tree.
2. Trace the complete path affected by the change.
3. Extend an existing module when it already owns the behavior.
4. Preserve CommonJS in the backend and ES modules in the frontend.

## Backend boundaries

- Put HTTP paths and middleware composition in `routes/`.
- Parse requests and format responses in `controllers/`.
- Put business rules, authorization decisions, and orchestration in `services/`.
- Put reusable data access in `models/` where the feature already follows that pattern.
- Attach `statusCode` to expected service errors and let controllers translate them.
- Require authentication before accepting a caller-provided user identity.
- Keep service-role Supabase access on the backend.

## Frontend boundaries

- Put route-level orchestration in `pages/`.
- Keep reusable visual behavior in `components/`.
- Put HTTP/Supabase calls in `services/`, not JSX event handlers.
- Put shared client state in the existing Zustand store or focused hooks.
- Render loading, empty, error, and success states for asynchronous features.
- Clean up subscriptions, timers, and event listeners.

## Finish

Use `$verify-remarket` after implementation. Update Graphify after code changes.
