# LPA & AMD Certification Booking System

A full booking and session management system for LPA & AMD certification sessions. 

## Panels

- **Client** — public booking form, slot picker, group registration
- **Facilitator** — session setup, rooms/certifiers config, attendance, room assignment
- **Certifier** — per-room queue, mark done, add AMD, walk-in AMD
- **Display board** — real-time room screen for waiting area TV

## Tech stack

- React + Vite (frontend)
- Supabase (database + real-time subscriptions)
- Vercel (hosting)

## Setup

See `DEPLOYMENT_GUIDE.md` for full step-by-step instructions (no command line required).

## Default PINs

| Role | PIN |
|------|-----|
| Facilitator | `admin1234` |
| Certifier | `doc1234` |

Change PINs via the Supabase Table Editor → `pins` table.

## Environment variables

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
