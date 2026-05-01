# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Lens Ledger Web** — a private admin dashboard for **Tales by DVS**, a wedding photography & videography studio. The app has two surfaces:

1. **Public website** (`/`) — hero slideshow, inquiry form, public assistant chatbot, portfolio links, package info, reviews
2. **Admin dashboard** (`/index.html`) — login-protected, single-page app for managing the full business workflow

The project is live on a VPS as a systemd service called `lensledger`. GitHub remote: `https://github.com/VenkateshDarsi3/lens-ledger-web`

---

## Running Locally

```bash
cd "/Users/darsivenkatesh/Documents/Claude/Projects/DVS"
python3 server.py
# Open http://localhost:8000
```

No build step. No npm. No dependencies to install beyond Python stdlib + optional `reportlab` (for PDF quote generation) and `Pillow` (for image processing in PDF assets).

**Deploy on server after pushing:**
```bash
git pull origin main && systemctl restart lensledger
```

**Fix stale git lock files if commit fails:**
```bash
rm -f /Users/darsivenkatesh/Documents/Claude/Projects/DVS/.git/index.lock
rm -f /Users/darsivenkatesh/Documents/Claude/Projects/DVS/.git/HEAD.lock
```

---

## Architecture

### Backend — `server.py`

A single-file Python HTTP server using `http.server.ThreadingHTTPServer` (no framework). All routing is manual inside `LensLedgerHandler` which extends `SimpleHTTPRequestHandler`.

**Key patterns:**
- `do_GET`, `do_POST`, `do_PUT` dispatch to `handle_*` methods by checking `parsed.path`
- Static files (CSS, JS, assets) are served automatically by the parent `SimpleHTTPRequestHandler` via `super().do_GET()`
- Authentication uses **session tokens** stored in SQLite, passed as an `HttpOnly` cookie (`lens_ledger_session`, 14-day expiry)
- `require_user()` helper is called at the top of every protected handler — returns `None` and sends 401 if unauthenticated

**API surface:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/session` | Check current session |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/forgot-password` | Send reset email |
| GET/POST | `/api/auth/reset-password` | Reset password flow |
| GET | `/api/state` | Load full app state (JSON blob) |
| PUT | `/api/state` | Save full app state (JSON blob) |
| GET | `/api/slides` | Hero slideshow image list |
| POST | `/api/public/enquiry` | Public inquiry form submission |
| GET/POST | `/api/public/assistant` | Public chatbot |
| GET/POST | `/api/public/reviews` | Public review submission / listing |
| GET | `/api/admin/reviews` | Admin review moderation |
| PUT | `/api/admin/reviews/{id}/approve` | Approve review |
| PUT | `/api/admin/reviews/{id}/reject` | Reject review |
| POST | `/api/admin/generate-quote` | Generate branded PDF quote (returns raw bytes) |

**State storage model:** All business data lives in a single JSON blob (`app_states` table, one row per user). The entire state is loaded on login and saved on every mutation via `PUT /api/state`. Structure:
```json
{
  "inquiries": [],
  "leads": [],
  "weddingPlans": [],
  "shootShareJobs": [],
  "editorJobs": [],
  "bankAccounts": []
}
```

**SQLite tables:** `users`, `sessions`, `app_states`, `password_reset_tokens`, `notification_logs`, `reviews`

**SMS notifications:** `notify.py` is a standalone cron script (not imported by server.py). Reads the SQLite DB directly. Uses TextBelt API. Configured for the VPS at `/var/www/lensledger/lens-ledger-web/`.

**In-process SMS:** `server.py` also has a background thread (`run_sms_reminder_loop`) that fires day-before event reminders and new-enquiry alerts if `TEXTBELT_KEY` and `ADMIN_PHONE` env vars are set.

**PDF generation:** `generate_quote_pdf(client_name, events, package, price)` uses ReportLab to produce a 6-page branded PDF. Returns raw `bytes`. Assets are in `assets/quote/`. Requires `reportlab` and `Pillow` (`pip install reportlab pillow`). If ReportLab is not installed, `REPORTLAB_OK = False` and the endpoint returns a 501.

**Environment variables:**
- `PORT` (default `8000`), `HOST` (default `0.0.0.0`)
- `COOKIE_SECURE=1` — set in production for Secure cookie flag
- `APP_TIMEZONE` (default `America/Los_Angeles`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — for password reset emails
- `TEXTBELT_KEY`, `ADMIN_PHONE` — for in-process SMS reminders
- `PUBLIC_ENQUIRY_EMAIL` — which account receives public enquiry form submissions

**Signup is disabled** (line 880 in server.py returns 403). To create a new account, temporarily re-enable `handle_signup` or insert directly into the DB.

---

### Frontend — `index.html` + `script.js` + `styles.css`

Pure vanilla JS, no framework or bundler. The admin dashboard is a single HTML file with tab-based navigation.

**Tabs (data-tab values):**
- `inquiries` — raw inquiry log
- `pipeline` — Event Details; maps to `state.leads`
- `weddings` — multi-event wedding plans; maps to `state.weddingPlans`
- `shoot-share` — shoot & share jobs; maps to `state.shootShareJobs`
- `schedule` — chronological event view
- `calendar` — month-view calendar with global tooltip (`#calGlobalTooltip`, fixed-position, driven by JS mouseenter/mouseleave to avoid overflow:hidden clipping)
- `editor` — editor job tracker; maps to `state.editorJobs`
- `overview` — financial summary, team due by member, monthly charts
- `reviews` — review moderation

**State management:** `state` is a JS object kept in memory. On load it's fetched from `GET /api/state`. On every mutation the full state is synced back via `PUT /api/state` (debounced). There is no localStorage usage.

**Key functions in script.js:**
- `renderAll()` — re-renders every tab; called after any state mutation
- `buildTeamDueByMember()` — aggregates unpaid team assignments across ALL leads (any status) and all weddingPlan events; `lead.source === "wedding-plan"` entries are skipped in the leads loop because they're handled in the weddingPlans loop
- `renderCalendarView()` — builds the month grid; uses the global `#calGlobalTooltip` div for hover tooltips
- `renderTeamDueBreakdown()` — renders the Overview "Team Due by Member" section

**Lead statuses:** `Enquiry → Follow-up → Confirmed → Completed → Closed`

**lead.source values:** `"manual"` (created in admin), `"public"` (from the inquiry form), `"wedding-plan"` (auto-created mirror of a wedding plan, not shown independently in pipeline)

---

## Assets

```
assets/
  logo-black.png / logo-white.png   — Tales by DVS logos
  quote/
    logo.png                        — PDF quote logo (800x450)
    cover_left/center/right.jpg     — page 1 triptych photos
    cover_bg.jpg                    — page 1 full-bleed bg (2480x3508)
    page2_bg.jpg                    — page 2 full-bleed (moonlit dancer)
    page3_watermark.jpg             — page 3 B&W faded bride (brightness 3.5x)
    page4_bg.jpg                    — page 4 very faded portrait (brightness 4.0x)
    page5_bottom.jpg                — page 5 bottom strip
    page6_bg.jpg                    — page 6 holi explosion
    thumb_p2_1/2/3.jpg             — page 2 thumbnail strip
    thumb_p5_1/2/3.jpg             — page 5 thumbnail strip
uploads/
  slides/                           — hero slideshow images (gitignored)
data/
  lens_ledger.sqlite3               — database (gitignored)
```

---

## PDF Quote — Key Implementation Notes

- `generate_quote_pdf()` is in `server.py` (after line ~1428), returns `bytes` not a file path
- Uses ReportLab canvas API with A4 page size (595 × 842 pts)
- Fonts: Lato TTF registered from `/usr/share/fonts/truetype/lato/` with fallback to built-in `Times-Roman` / `Times-Bold` / `Times-Italic`
- `photo_fill(fname, cx, cy, cw, ch)` — center-crop fill using PIL + ReportLab `clipPath`
- `brush_header(label, cx, y, width)` — gold rounded rect column header
- `ornament(cx, y, width)` — thin gold hairline + centered diamond separator
- **Page 2 event table key:** event data uses key `"event"` (not `"name"`) for the event name field
- To test PDF generation standalone (avoids binary stdout issue):
  ```python
  # /tmp/pdf_test.py
  import sys, importlib.util
  spec = importlib.util.spec_from_file_location("server", "/path/to/server.py")
  mod = importlib.util.module_from_spec(spec)
  globs = {"PROJECT_ROOT": Path("/path/to/DVS"), "rl_canvas": rl_canvas}
  exec(open("/path/to/server.py").read(), globs)
  pdf_bytes = globs["generate_quote_pdf"]("Client Name", events, "Gold", "55000")
  with open("/tmp/test.pdf", "wb") as f:
      f.write(pdf_bytes)
  ```

---

## Telegram Bot

- **Bot username:** @TalesbydVS
- **Service:** `telegram_bot.service` (systemd, `Restart=always`)
- **Token storage:** `/etc/telegram_bot.env` — never commit this file; it is NOT in git
- **Commands:** `/today` (today's events + team), `/week` (next 7 days), `/help`
- **Security:** bot only responds to `OWNER_CHAT_ID` (Venky's Telegram user ID, hardcoded default `6952178626`)
- **Deploy:** token is set via `EnvironmentFile=/etc/telegram_bot.env` in the service file
- **IMPORTANT:** Never hardcode the token in `telegram_bot.py` — the public GitHub repo will trigger automatic token revocation by Telegram

---

## Business Context

- **Owner:** Venky (darsivenkatesh.darsi@gmail.com)
- **Studio:** Tales by DVS — wedding photography & videography
- **Portfolio:** https://saikrishnagunti.smugmug.com/
- **Packages:** Silver, Gold, Platinum (+ Custom)
- **Team members** are tracked per-event with individual pay amounts and payment status
- **Editor jobs** are tracked separately from leads; editors are paid in USD or INR
- **Currency:** USD primary; INR used for editor payments
