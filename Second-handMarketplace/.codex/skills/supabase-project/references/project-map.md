# Project map

Use this file as the entry point for project-specific Supabase documentation.

## Reference files

- `schema.md`: tables, relationships, enums, functions, and triggers
- `auth.md`: authentication flows and user lifecycle
- `storage.md`: buckets, object paths, and access rules
- `rls-policies.md`: Row Level Security policies and their intent
- `migrations.md`: migration workflow and deployment notes

Create or update each reference only when its subject is documented. Never store
API keys, service-role keys, production credentials, or other secrets here.

## Sources of truth

- Database changes: Supabase migration files
- Backend integration: `backend/src/`
- Frontend client configuration: `frontend/src/lib/supabaseClient.js`
