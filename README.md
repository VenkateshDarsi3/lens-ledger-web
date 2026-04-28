# Lens Ledger Web

This version is prepared to run as a small web app instead of a laptop-only file.

## What changed

- Added account login with email + password
- Added session-based access so your dashboard data is private
- Moved dashboard data into a SQLite-backed server instead of browser-only `localStorage`
- Kept the same booking, wedding, editor, calendar, and overview workflow
- Hero slideshow now reads from `uploads/slides` on the server, with built-in fallback images if that folder is empty

## Run locally

```bash
cd "/Users/darsivenkatesh/Documents/New project web"
python3 server.py
```

Then open:

[http://localhost:8000](http://localhost:8000)

## First-time setup

1. Open the app in your browser.
2. Create an account with your email and password.
3. Sign in and start using the dashboard.

Your data will be saved in:

`data/lens_ledger.sqlite3`

## Hero slideshow images

To use your own hero slideshow images, place them inside:

`uploads/slides`

Supported formats:

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`

## Make it accessible from anywhere

This project is now structured like a small web app, so you can deploy it to a server or VPS later.

Good options:

- Render
- Railway
- Fly.io
- your own VPS

Important:

- for public deployment, use HTTPS
- set `COOKIE_SECURE=1` in production
- keep the `data` folder on persistent storage so your bookings are not lost

## Optional environment variables

- `PORT` default: `8000`
- `HOST` default: `0.0.0.0`
- `COOKIE_SECURE` default: `0`
