# ReMarket deployment runbook

The production-shaped demo uses three separately managed services:

- Vercel serves `Second-handMarketplace/frontend`.
- Render runs the Express API and the payment-expiry cron from `render.yaml`.
- A dedicated Supabase demo project owns Auth, Postgres, Storage, and Realtime.

Never point the reset/seed workflow or public demo credentials at a real production database.

## 1. Create the Supabase demo project

1. Create a new project used only for the portfolio demo.
2. Apply the migrations listed in the root README in order.
3. Configure the frontend URL and redirect URLs in Supabase Auth.
4. Confirm RLS is enabled on every public application table.
5. Configure a sandbox transactional SMTP provider and CAPTCHA.
6. Review Auth rate limits in the Supabase dashboard. Frontend login calls Supabase directly, so the Express limiter cannot protect that request.
7. Keep the `service_role` key only in Render. Vercel receives only the anon key.

Seed credentials are deployment secrets, not source-code defaults:

```bash
DEMO_ADMIN_PASSWORD=<at-least-12-characters>
DEMO_AGENT_PASSWORD=<at-least-12-characters>
DEMO_CUSTOMER_PASSWORD=<at-least-12-characters>
npm run seed:users
```

Rotate these values before publishing the demo and whenever the link is shared broadly.

## 2. Deploy the backend on Render

1. In Render, create a Blueprint from this repository and select `render.yaml`.
2. Fill every environment variable marked `sync: false`.
3. Set payment return/notify URLs to the final Vercel and Render URLs.
4. Keep `DEMO_READ_ONLY_ADMIN=true`. It allows portfolio visitors to inspect admin pages while blocking admin mutations and refunds.
5. Verify `GET /api/health` and `/api/docs`.
6. Verify `GET /api/ready` returns 200 after Postgres and Storage are available.
7. Verify the `remarket-payment-expiry` cron completes and exits. Its schedule is UTC.

The Blueprint deliberately does not create a destructive database reset cron. If periodic reset is needed, restore a known Supabase demo backup or run a reviewed, allow-listed reset job against the demo project only.

## 3. Deploy the frontend on Vercel

1. Import the GitHub repository.
2. Set **Root Directory** to `Second-handMarketplace/frontend`.
3. Keep framework preset **Vite**; `frontend/vercel.json` defines build/output and SPA routing.
4. Configure:

```env
VITE_SUPABASE_URL=https://<demo-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<demo-anon-key>
VITE_BACKEND_URL=https://<render-service>.onrender.com
```

5. Add the Vercel URL to `FRONTEND_ORIGIN` on Render and to Supabase Auth redirect URLs.
6. Redeploy both services and exercise register, login, product, chat, transaction, and sandbox payment flows.

## 4. Publish the portfolio assets

Capture these screenshots after the URLs are stable:

- marketplace home/search;
- product details and seller dashboard;
- buyer-seller realtime chat;
- transaction/payment history;
- read-only admin overview;
- Swagger UI.

Record a 2–3 minute video in this order: problem and stack, buyer flow, seller/chat flow, payment idempotency, admin/API/CI, architecture. Hide browser password managers, tokens, dashboard secrets, and personal email addresses.

After upload, replace the pending entries in the root README with the final frontend, API, Swagger, and video links.

## Release checklist

- CI is green on `main`.
- Separate Supabase demo project is selected.
- No `service_role`, SMTP, payment, or demo password appears in Git/Vercel.
- Supabase Auth rate limits and CAPTCHA are enabled.
- Render demo admin is read-only.
- Payment gateways and email provider are sandbox accounts.
- Health check, Swagger, realtime chat, callbacks, and expiry cron were tested.
- Demo data has a documented restore/reset owner and cadence.
