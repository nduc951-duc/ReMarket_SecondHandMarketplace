# ReMarket architecture

## Backend

- Entry and route mounting: `backend/src/app.js`
- HTTP routes: `backend/src/routes/`
- Request/response adapters: `backend/src/controllers/`
- Business logic: `backend/src/services/`
- Reusable product data access: `backend/src/models/products/`
- Authentication and admin guards: `backend/src/middlewares/`
- Payment provider abstraction: `backend/src/contexts/` and `backend/src/strategies/`
- Supabase migrations and operational SQL: `backend/*.sql` and `backend/scripts/*.sql`

The normal dependency direction is route to controller to service/model. Do not
move business decisions into routes.

## Frontend

- Application routing: `frontend/src/App.jsx`
- Route-level screens: `frontend/src/pages/`
- Reusable UI: `frontend/src/components/`
- Remote operations: `frontend/src/services/`
- Shared state: `frontend/src/store/`
- Cross-page behavior: `frontend/src/hooks/`
- Supabase browser client: `frontend/src/lib/supabaseClient.js`

## Cross-cutting rules

- Preserve existing response shapes within a feature.
- Validate identity and ownership on the backend even when the UI hides an action.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or payment secrets to frontend code.
- Add a new SQL migration for deployed schema changes; do not silently rewrite
  historical migrations.
