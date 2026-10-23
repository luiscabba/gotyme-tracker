# GoTyme Tracker

Personal onboarding, attendance and work tracker for Luis's GoTyme job.

- **App:** Next.js (App Router) PWA, deployed on Vercel.
- **Data:** Supabase project `gotyme-tracker` (Postgres with row level security limited to the owner's email, Storage bucket `files`, Realtime).
- **Agents:** Claude scheduled tasks ("GoTyme email watch" hourly, "GoTyme morning summary" daily) read Gmail, Calendar and Drive and write to the database.
- **Widget:** `/api/widget?t=<widget_token>` returns the next step and counts as JSON. A Scriptable script is generated on the Settings page.

## Environment

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Tables

`settings`, `items` (requirements with action steps, `start_by`, `waiting_on`), `tasks`, `attendance`, `payslips`, `activity`, `agent_state`.
