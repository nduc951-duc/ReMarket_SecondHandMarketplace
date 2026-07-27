---
name: supabase-project
description: Maintain the ReMarket project's Supabase integration safely. Use when changing or reviewing Supabase database schemas, SQL migrations, authentication, storage buckets, Row Level Security policies, generated types, or frontend/backend Supabase client code.
---

# Supabase Project

Use this workflow for every Supabase-related change in this repository.

## Gather context

1. Read `references/project-map.md`.
2. Read only the additional reference files relevant to the task, when present:
   - `references/schema.md`
   - `references/auth.md`
   - `references/storage.md`
   - `references/rls-policies.md`
   - `references/migrations.md`
3. Inspect the actual migration and application files before making claims. Treat
   code and migrations as the source of truth when a reference is stale.

## Make changes

1. Trace all affected frontend, backend, migration, and policy paths.
2. Preserve existing naming and migration conventions.
3. Prefer a new migration over editing an already-applied migration.
4. Keep privileged operations on the backend. Never expose the service-role key
   or other secrets to frontend code, logs, fixtures, or documentation.
5. Review RLS consequences for every table, view, function, bucket, and policy
   touched by the change.
6. Update the relevant reference file when behavior, schema, or operational
   workflow changes.

## Verify

1. Run the narrowest relevant tests and static checks.
2. Validate SQL or migrations with the project's available Supabase tooling.
3. Check authentication and authorization failure paths, not only the happy path.
4. Run `graphify update .` after changing code so the project graph stays current.
5. Report any validation that could not be run.
