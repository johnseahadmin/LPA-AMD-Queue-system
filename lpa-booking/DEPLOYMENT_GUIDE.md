# LPA & AMD Booking System — Deployment Guide
## No command line needed. Everything via browser GUIs.

---

## What you'll set up
1. **Supabase** — your database (free tier, no credit card)
2. **GitHub** — stores your code (free)
3. **Vercel** — publishes your app to the web (free)

Total time: ~20 minutes.

---

## STEP 1 — Create a Supabase project

1. Go to **https://supabase.com** and click **Start your project**
2. Sign up with GitHub or email
3. Click **New project**
4. Fill in:
   - **Name:** `lpa-booking` (or anything you like)
   - **Database password:** choose a strong password and save it somewhere safe
   - **Region:** Southeast Asia (Singapore)
5. Click **Create new project** — wait ~2 minutes for it to provision

### Run the database schema

6. In the left sidebar, click **SQL Editor**
7. Click **New query**
8. Open the file `supabase_schema.sql` from this project folder
9. Copy **all** the contents and paste into the SQL editor
10. Click **Run** (green button)
11. You should see: `Success. No rows returned`

### Copy your API keys

12. In the left sidebar, click **Project Settings** (gear icon at bottom)
13. Click **API**
14. You'll see two values — copy both:
    - **Project URL** → looks like `https://abcdefgh.supabase.co`
    - **anon public** key → a long string starting with `eyJ...`
15. Keep this browser tab open — you'll need these in Step 3

---

## STEP 2 — Put the code on GitHub

1. Go to **https://github.com** and sign in (or create a free account)
2. Click the **+** icon (top right) → **New repository**
3. Fill in:
   - **Repository name:** `lpa-booking`
   - Leave everything else as default
4. Click **Create repository**

### Upload the files

5. On the new (empty) repo page, click **uploading an existing file**
6. You need to upload the files preserving the folder structure. The easiest way:

   **Option A — drag and drop (easiest):**
   - Open the `lpa-booking` project folder on your computer
   - Select ALL files and folders inside it
   - Drag them into the GitHub upload area
   - GitHub will show a list of files detected

   **Option B — if drag-drop doesn't work:**
   - Upload the files one folder at a time, starting with root files
   - Then upload `src/` folder contents

7. Scroll down, leave commit message as default, click **Commit changes**

Your code is now on GitHub.

---

## STEP 3 — Deploy on Vercel

1. Go to **https://vercel.com** and click **Sign Up**
2. Choose **Continue with GitHub** — this links your accounts
3. Once signed in, click **Add New Project**
4. Find your `lpa-booking` repository in the list and click **Import**
5. Vercel will auto-detect it as a Vite project — leave all settings as-is
6. **Before clicking Deploy**, scroll down to **Environment Variables**

### Add your Supabase keys

7. Click **Add** and enter:
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** paste your Project URL from Supabase (Step 1 item 14)
8. Click **Add** again:
   - **Name:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** paste your anon public key from Supabase (Step 1 item 14)

9. Click **Deploy**

Vercel will build and deploy your app. This takes about 60 seconds.

10. When done, you'll see a **Congratulations!** screen with your live URL, something like:
    `https://lpa-booking-abc123.vercel.app`

---

## STEP 4 — First-time setup in the app

1. Open your live URL
2. Click **Facilitator** in the nav
3. Log in with PIN: `admin1234`
4. Under **Session setup**:
   - Set the date to your next session (e.g. 14 Jun 2026)
   - Confirm start/end times (default: 1:30pm – 5:30pm)
   - Edit room names and certifier names
5. Click **Save session**

Your booking page is now live and clients can book slots.

---

## STEP 5 — Share the right URLs

| Who | URL | Notes |
|-----|-----|-------|
| Clients | `your-url.vercel.app` | Opens on the booking tab by default |
| Facilitator | `your-url.vercel.app` → Facilitator tab | PIN: `admin1234` |
| Certifiers | `your-url.vercel.app` → Certifier tab | PIN: `doc1234` |
| Display screen | `your-url.vercel.app` → Display board tab | Full-screen on a TV/monitor |

---

## Changing PINs

To change the facilitator or certifier PIN:
1. Go to Supabase → **Table Editor** → **pins** table
2. Click on the row for `facilitator` or `certifier`
3. Edit the `pin_hash` value to your new PIN
4. Save — takes effect immediately, no redeployment needed

---

## Setting up each new session

Before each bi-weekly session:
1. Log into Facilitator panel
2. Update the **date** in Session setup
3. Update **room names** and **certifier names** if they've changed
4. Click **Save session**
5. Old bookings from the previous session are preserved in the database

---

## Troubleshooting

**"No upcoming session" shown on booking page**
→ Make sure you've saved a session in the Facilitator panel

**Rooms not showing on Certifier login**
→ Make sure you've added rooms and clicked Save session

**Changes not showing in real-time on Display board**
→ Check that you ran the full SQL schema including the `alter publication supabase_realtime` lines

**Vercel build fails**
→ Double-check that both environment variables are set exactly as shown (no extra spaces)
