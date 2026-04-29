#!/usr/bin/env python3
"""
Lens Ledger SMS Notifier  (TextBelt edition)
============================================
Run from cron on the server:

  # Every Monday at 8 AM  → weekly digest
  0 8 * * 1 python3 /root/notify.py --weekly

  # Every day at 7 PM     → day-before reminder
  0 19 * * * python3 /root/notify.py --daily

  # One-off test
  python3 /root/notify.py --test
"""

import json
import sqlite3
import sys
import urllib.request
import urllib.parse
from datetime import datetime, timedelta

# ── CONFIG ────────────────────────────────────────────────────────────────────
DB_PATH  = "/var/www/lensledger/lens-ledger-web/data/lens_ledger.sqlite3"
PHONE    = "+12175035177"

# Free test key  → "textbelt"  (1 SMS / day globally, for testing only)
# Paid key       → buy credits at textbelt.com (~$0.01 / text, no subscription)
#                  then paste your key below.
TEXTBELT_KEY = "textbelt"
# ─────────────────────────────────────────────────────────────────────────────


def send_sms(message: str) -> bool:
    """Send an SMS via TextBelt. Returns True on success."""
    data = urllib.parse.urlencode({
        "phone":   PHONE,
        "message": message,
        "key":     TEXTBELT_KEY,
    }).encode()

    req  = urllib.request.Request("https://textbelt.com/text", data=data, method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        result = json.loads(resp.read())

    if result.get("success"):
        print(f"✅ SMS sent!  Quota remaining: {result.get('quotaRemaining', '?')}")
        return True
    else:
        print(f"❌ SMS failed: {result.get('error', 'Unknown error')}")
        return False


def load_events() -> list:
    """
    Pull every event out of the SQLite JSON blob.
    Returns a list of dicts: {date, name, type, source}
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cur  = conn.cursor()
        cur.execute("SELECT state_json FROM app_states LIMIT 1")
        row = cur.fetchone()
        conn.close()
    except Exception as e:
        print(f"DB error: {e}")
        return []

    if not row or not row[0]:
        return []

    state  = json.loads(row[0])
    events = []

    # ── Regular leads ─────────────────────────────────────────────────────────
    for lead in state.get("leads", []):
        date_str = (lead.get("eventDate") or lead.get("date") or "").strip()
        if not date_str:
            continue
        try:
            event_date = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
        except ValueError:
            continue
        events.append({
            "date":  event_date,
            "name":  lead.get("clientName") or lead.get("name") or "Unknown Client",
            "type":  lead.get("eventType") or lead.get("type") or "Event",
        })

    # ── Wedding plans ─────────────────────────────────────────────────────────
    for plan in state.get("weddingPlans", []):
        client = plan.get("clientName") or plan.get("name") or "Unknown Client"
        for ev in plan.get("events", []):
            date_str = (ev.get("date") or ev.get("eventDate") or "").strip()
            if not date_str:
                continue
            try:
                event_date = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
            except ValueError:
                continue
            events.append({
                "date":  event_date,
                "name":  client,
                "type":  ev.get("type") or ev.get("eventType") or "Wedding Event",
            })

    return events


# ── WEEKLY DIGEST ─────────────────────────────────────────────────────────────
def weekly_digest():
    today      = datetime.now().date()
    week_start = today - timedelta(days=today.weekday())   # Monday
    week_end   = week_start + timedelta(days=6)            # Sunday

    events = sorted(
        [e for e in load_events() if week_start <= e["date"] <= week_end],
        key=lambda e: e["date"]
    )

    if not events:
        print("No events this week — no SMS sent.")
        return

    lines = [
        f"📅 DVS Events This Week",
        f"({week_start.strftime('%b %d')} – {week_end.strftime('%b %d')}):",
    ]
    for ev in events:
        lines.append(f"• {ev['date'].strftime('%a %b %d')} | {ev['name']} ({ev['type']})")
    lines.append("Have a great week! 📸")

    send_sms("\n".join(lines))


# ── DAILY REMINDER ────────────────────────────────────────────────────────────
def daily_reminder():
    tomorrow = datetime.now().date() + timedelta(days=1)
    events   = sorted(
        [e for e in load_events() if e["date"] == tomorrow],
        key=lambda e: e["name"]
    )

    if not events:
        print("No events tomorrow — no SMS sent.")
        return

    if len(events) == 1:
        ev  = events[0]
        msg = (
            f"🔔 Tomorrow ({tomorrow.strftime('%A, %b %d')}):\n"
            f"{ev['name']} — {ev['type']}\n"
            f"Good luck! 📷"
        )
    else:
        lines = [f"🔔 Tomorrow ({tomorrow.strftime('%A, %b %d')}) — {len(events)} events:"]
        for ev in events:
            lines.append(f"• {ev['name']} ({ev['type']})")
        lines.append("Good luck! 📷")
        msg = "\n".join(lines)

    send_sms(msg)


# ── TEST ──────────────────────────────────────────────────────────────────────
def test_sms():
    send_sms(
        f"✅ Lens Ledger notifications are working!\n"
        f"Sent: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    )


# ── ENTRY POINT ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("--weekly", "--daily", "--test"):
        print("Usage: python3 notify.py --weekly | --daily | --test")
        sys.exit(1)

    {
        "--weekly": weekly_digest,
        "--daily":  daily_reminder,
        "--test":   test_sms,
    }[sys.argv[1]]()
