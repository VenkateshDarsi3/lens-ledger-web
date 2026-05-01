#!/usr/bin/env python3
"""
Tales by DVS — Telegram Bot
===========================
Commands:
  /today  — today's events + team
  /week   — next 7 days
  /help   — show commands

Run on VPS:
  python3 /var/www/lensledger/lens-ledger-web/telegram_bot.py

Run as a systemd service (recommended):
  See telegram_bot.service in the same folder.
"""

import json
import os
import sqlite3
import time
import urllib.request
import urllib.parse
from datetime import date, datetime, timedelta

# ── CONFIG — fill these in ────────────────────────────────────────────────────
BOT_TOKEN     = os.getenv("TELEGRAM_BOT_TOKEN", "8502969409:AAFf4LbuXRqwp4V4WST03kNeX8CXXuABuZ0")
OWNER_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "6952178626")
DB_PATH       = "/var/www/lensledger/lens-ledger-web/data/lens_ledger.sqlite3"
# ─────────────────────────────────────────────────────────────────────────────

API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"


# ── Telegram helpers ──────────────────────────────────────────────────────────

def tg_post(method: str, payload: dict) -> dict:
    url  = f"{API_BASE}/{method}"
    data = json.dumps(payload).encode()
    req  = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def send_message(chat_id: str, text: str) -> None:
    tg_post("sendMessage", {
        "chat_id":    chat_id,
        "text":       text,
        "parse_mode": "HTML",
    })


def get_updates(offset, timeout=30):
    params: dict = {"timeout": timeout, "allowed_updates": ["message"]}
    if offset is not None:
        params["offset"] = offset
    url = f"{API_BASE}/getUpdates?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=timeout + 10) as resp:
        return json.loads(resp.read())


# ── Database helpers ──────────────────────────────────────────────────────────

def load_state() -> dict:
    try:
        conn = sqlite3.connect(DB_PATH)
        row  = conn.execute("SELECT state_json FROM app_states LIMIT 1").fetchone()
        conn.close()
        return json.loads(row[0]) if row else {}
    except Exception as exc:
        print(f"[DB] {exc}")
        return {}


def all_events(state):
    """Return every scheduled event from leads + weddingPlans, sorted by date."""
    events = []

    for lead in state.get("leads", []):
        if lead.get("source") == "wedding-plan":
            continue
        raw = (lead.get("eventDate") or "").strip()[:10]
        if not raw:
            continue
        try:
            ev_date = datetime.strptime(raw, "%Y-%m-%d").date()
        except ValueError:
            continue
        team = [m.get("name", "") for m in (lead.get("teamAssignments") or []) if m.get("name")]
        events.append({
            "date":   ev_date,
            "client": lead.get("clientName", "Unknown"),
            "type":   lead.get("eventType", "Event"),
            "team":   team,
            "status": lead.get("status", ""),
        })

    for plan in state.get("weddingPlans", []):
        client = plan.get("clientName", "Unknown")
        for ev in plan.get("events", []):
            raw = (ev.get("eventDate") or ev.get("date") or "").strip()[:10]
            if not raw:
                continue
            try:
                ev_date = datetime.strptime(raw, "%Y-%m-%d").date()
            except ValueError:
                continue
            team = [m.get("name", "") for m in (ev.get("teamAssignments") or []) if m.get("name")]
            events.append({
                "date":   ev_date,
                "client": client,
                "type":   ev.get("eventName", "Wedding Event"),
                "team":   team,
                "status": "Confirmed",
            })

    return sorted(events, key=lambda e: e["date"])


# ── Commands ──────────────────────────────────────────────────────────────────

def cmd_today(chat_id: str) -> None:
    today  = date.today()
    items  = [e for e in all_events(load_state()) if e["date"] == today]

    if not items:
        send_message(chat_id,
            f"📅 <b>{today.strftime('%A, %b %d')}</b>\n\n"
            "No events today. Enjoy the day off! 📸"
        )
        return

    lines = [f"📅 <b>Today — {today.strftime('%A, %b %d')}</b>\n"]
    for ev in items:
        team = ", ".join(ev["team"]) if ev["team"] else "No team assigned"
        lines.append(f"🎯 <b>{ev['client']}</b> — {ev['type']}")
        lines.append(f"   👥 {team}\n")

    send_message(chat_id, "\n".join(lines))


def cmd_week(chat_id: str) -> None:
    today    = date.today()
    week_end = today + timedelta(days=7)
    items    = [e for e in all_events(load_state()) if today <= e["date"] <= week_end]

    if not items:
        send_message(chat_id, "📆 <b>No events in the next 7 days.</b>")
        return

    lines = [f"📆 <b>Next 7 Days</b>\n"]
    for ev in items:
        label = "Today" if ev["date"] == today else ev["date"].strftime("%a, %b %d")
        team  = ", ".join(ev["team"]) if ev["team"] else "No team assigned"
        lines.append(f"📌 <b>{label}</b> — {ev['client']} ({ev['type']})")
        lines.append(f"   👥 {team}\n")

    send_message(chat_id, "\n".join(lines))


# ── Message router ────────────────────────────────────────────────────────────

HELP_TEXT = (
    "👋 <b>Tales by DVS Bot</b>\n\n"
    "/today — Today's events\n"
    "/week  — Next 7 days\n"
    "/help  — Show this menu"
)


def handle_message(message: dict) -> None:
    chat_id = str(message.get("chat", {}).get("id", ""))
    text    = message.get("text", "").strip()

    # Security: only respond to the owner
    if chat_id != str(OWNER_CHAT_ID):
        send_message(chat_id, "🔒 This bot is private.")
        return

    if text in ("/start", "/help"):
        send_message(chat_id, HELP_TEXT)
    elif text == "/today":
        cmd_today(chat_id)
    elif text == "/week":
        cmd_week(chat_id)
    else:
        send_message(chat_id, "Use /today, /week, or /help")


# ── Polling loop ──────────────────────────────────────────────────────────────

def main() -> None:
    print(f"[DVS Bot] Starting — polling Telegram...")
    offset = None

    while True:
        try:
            result = get_updates(offset=offset)
            for update in result.get("result", []):
                offset = update["update_id"] + 1
                if "message" in update:
                    handle_message(update["message"])
        except KeyboardInterrupt:
            print("[DVS Bot] Stopped.")
            break
        except Exception as exc:
            print(f"[DVS Bot] Error: {exc}")
            time.sleep(5)


if __name__ == "__main__":
    main()
