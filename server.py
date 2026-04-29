from __future__ import annotations

import base64
import hashlib
import hmac
import io
import json
import mimetypes
import os
import secrets
import smtplib
import sqlite3
import threading
import time
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote, unquote, urlencode, urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.colors import HexColor
    from reportlab.lib.utils import ImageReader
    REPORTLAB_OK = True
except ImportError:
    REPORTLAB_OK = False


PROJECT_ROOT = Path(__file__).resolve().parent
DATA_DIR = PROJECT_ROOT / "data"
UPLOADS_DIR = PROJECT_ROOT / "uploads" / "slides"
DB_PATH = DATA_DIR / "lens_ledger.sqlite3"
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
SESSION_COOKIE = "lens_ledger_session"
SESSION_DAYS = 14
RESET_TOKEN_HOURS = 2
SMS_REMINDER_WINDOW_DAYS = 7
DEFAULT_SLIDES = [
    {"url": "/assets/feature-couple.jpg", "position": "center center"},
    {"url": "/assets/hero-wedding.jpg", "position": "center 38%"},
    {"url": "/assets/feature-color.jpg", "position": "center center"},
    {"url": "/assets/calendar-ceremony.jpg", "position": "center 48%"},
    {"url": "/assets/calendar-portrait.jpg", "position": "center 38%"},
    {"url": "/assets/wall-paper.jpg", "position": "center 46%"},
]
EMPTY_STATE = {
    "inquiries": [],
    "leads": [],
    "weddingPlans": [],
    "shootShareJobs": [],
    "editorJobs": [],
    "bankAccounts": [],
}
PUBLIC_PACKAGE_INFO = {
    "Silver": "Wedding teaser, wedding trailer, and full-length event videos.",
    "Gold": "Everything in Silver plus a pre-wedding photoshoot.",
    "Platinum": "Wedding teaser, exclusive event trailers, highlight reels, and a pre-wedding photoshoot.",
}
PUBLIC_PORTFOLIO_MATCHES = [
    {
        "title": "Weddings",
        "url": "https://saikrishnagunti.smugmug.com/",
        "reason": "Best for wedding storytelling, engagement looks, couple portraits, and cinematic outdoor coverage.",
        "keywords": {"wedding", "engagement", "couple", "outdoor", "cinematic", "portrait", "prewedding", "pre-wedding"},
    },
    {
        "title": "Event Pictures",
        "url": "https://saikrishnagunti.smugmug.com/DVSUSA",
        "reason": "Best for baby showers, gender reveals, birthdays, house warmings, and family celebrations.",
        "keywords": {"baby", "shower", "gender", "reveal", "birthday", "house", "warming", "family", "event"},
    },
]
PUBLIC_FOLLOW_UPS = {
    "Wedding": [
        "Which package are you interested in: Silver, Gold, Platinum, or custom?",
        "How many hours of wedding coverage do you expect?",
        "Do you also want pre-wedding coverage or only the wedding day?",
    ],
    "Engagement": [
        "Do you want an outdoor shoot, studio look, or both?",
        "Would you like photography only, videography only, or both?",
        "How many hours of coverage are you planning for the engagement session?",
    ],
    "Baby Shower": [
        "How many guests are you expecting?",
        "Do you want photography only or both photo and video coverage?",
        "How long would you like us to cover the event?",
    ],
    "Gender Reveal": [
        "Is the reveal indoors, outdoors, or at a venue?",
        "Do you want us to focus only on the reveal or the full event too?",
        "How many hours of coverage are you expecting?",
    ],
    "House Warming": [
        "Is this a pooja-only ceremony or a full family event as well?",
        "How many guests are expected?",
        "Do you want photography only or both photography and videography?",
    ],
    "Birthday": [
        "Is it a kids birthday, adult birthday, or family celebration?",
        "How many hours of coverage do you need?",
        "Would you like both candid moments and formal family photos?",
    ],
    "Other": [
        "What kind of event are you planning?",
        "How many guests are you expecting?",
        "Do you want photography, videography, or both?",
    ],
}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def app_timezone() -> ZoneInfo:
    try:
        return ZoneInfo(os.getenv("APP_TIMEZONE", "America/Los_Angeles"))
    except Exception:
        return ZoneInfo("UTC")


def now_local() -> datetime:
    return datetime.now(app_timezone())


def isoformat(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat()


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value)


def ensure_database() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT NOT NULL UNIQUE,
              password_hash TEXT NOT NULL,
              created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS app_states (
              user_id INTEGER PRIMARY KEY,
              state_json TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
              token TEXT PRIMARY KEY,
              user_id INTEGER NOT NULL,
              expires_at TEXT NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
              token TEXT PRIMARY KEY,
              user_id INTEGER NOT NULL,
              expires_at TEXT NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS notification_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              notification_key TEXT NOT NULL UNIQUE,
              notification_type TEXT NOT NULL,
              sent_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS reviews (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              event_type TEXT NOT NULL,
              rating INTEGER NOT NULL DEFAULT 5,
              review_text TEXT NOT NULL,
              approved INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL
            )
            """
        )
        connection.commit()


def db_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def read_json_body(handler: "LensLedgerHandler") -> dict:
    length = int(handler.headers.get("Content-Length", "0"))
    if length <= 0:
        return {}

    raw_body = handler.rfile.read(length)
    if not raw_body:
        return {}

    try:
        return json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError as error:
        raise ValueError("Invalid JSON body.") from error


def empty_state() -> dict:
    return json.loads(json.dumps(EMPTY_STATE))


def clean_text(value, max_length: int = 240) -> str:
    return str(value or "").strip()[:max_length]


def get_public_enquiry_owner(connection: sqlite3.Connection) -> sqlite3.Row | None:
    owner_email = os.getenv("PUBLIC_ENQUIRY_EMAIL", "").strip().lower()
    if owner_email:
        row = connection.execute("SELECT id, email FROM users WHERE email = ?", (owner_email,)).fetchone()
        if row is not None:
            return row

    return connection.execute(
        "SELECT id, email FROM users ORDER BY created_at ASC, id ASC LIMIT 1"
    ).fetchone()


def build_public_enquiry(payload: dict) -> dict:
    client_name = clean_text(payload.get("clientName"), 120)
    contact = clean_text(payload.get("contact"), 160)
    event_type = clean_text(payload.get("eventType"), 80) or "Event enquiry"
    custom_event_type = clean_text(payload.get("customEventType"), 80)
    if event_type == "Other" and custom_event_type:
        event_type = custom_event_type
    notes = clean_text(payload.get("notes"), 1200)
    qualification_answers = payload.get("qualificationAnswers") or []
    website_note = "Public website enquiry."
    qualification_lines = []
    if isinstance(qualification_answers, list):
        for item in qualification_answers:
            if not isinstance(item, dict):
                continue
            question = clean_text(item.get("question"), 180)
            answer = clean_text(item.get("answer"), 240)
            if question and answer:
                qualification_lines.append(f"{question}: {answer}")

    note_parts = [website_note]
    if notes:
        note_parts.append(notes)
    if qualification_lines:
        note_parts.append("AI qualification: " + " | ".join(qualification_lines))
    combined_notes = " ".join(note_parts).strip()[:2200]

    return {
        "id": secrets.token_urlsafe(16),
        "clientName": client_name,
        "contact": contact,
        "eventType": event_type,
        "serviceType": clean_text(payload.get("serviceType"), 40) or "Both",
        "eventDate": clean_text(payload.get("eventDate"), 20),
        "eventTime": clean_text(payload.get("eventTime"), 20),
        "location": clean_text(payload.get("location"), 240),
        "pricePerHour": 0,
        "amount": 0,
        "bookedHours": 0,
        "actualHours": None,
        "advanceGiven": 0,
        "pendingAmount": 0,
        "deliverables": "",
        "teamAssignments": [],
        "status": "Enquiry",
        "notes": combined_notes,
        "source": "website",
        "createdFrom": "public-enquiry",
        "createdAt": isoformat(now_utc()),
    }


def format_display_date(value: str) -> str:
    parsed = parse_public_date(value)
    if not parsed:
        return "Date not set"
    return datetime.fromisoformat(parsed).strftime("%b %d, %Y")


def sms_alert_config() -> dict:
    return {
        "account_sid": os.getenv("TWILIO_ACCOUNT_SID", "").strip(),
        "auth_token": os.getenv("TWILIO_AUTH_TOKEN", "").strip(),
        "from_number": os.getenv("TWILIO_FROM_NUMBER", "").strip(),
        "to_number": os.getenv("SMS_ALERT_TO_NUMBER", "").strip(),
    }


def sms_alerts_configured() -> bool:
    config = sms_alert_config()
    return all(config.values())


def send_sms_message(message: str) -> None:
    config = sms_alert_config()
    if not all(config.values()):
        raise RuntimeError("SMS alerts are not configured yet.")

    credentials = f"{config['account_sid']}:{config['auth_token']}".encode("utf-8")
    encoded_credentials = base64.b64encode(credentials).decode("ascii")
    payload = urlencode(
        {
            "To": config["to_number"],
            "From": config["from_number"],
            "Body": message[:1500],
        }
    ).encode("utf-8")
    request = Request(
        f"https://api.twilio.com/2010-04-01/Accounts/{quote(config['account_sid'])}/Messages.json",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Basic {encoded_credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    try:
        with urlopen(request, timeout=30) as response:
            if response.status >= 400:
                raise RuntimeError(f"Twilio returned HTTP {response.status}.")
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="ignore").strip()
        raise RuntimeError(detail or f"Twilio returned HTTP {error.code}.") from error
    except URLError as error:
        raise RuntimeError(f"Could not reach Twilio: {error.reason}") from error


def build_public_enquiry_sms(inquiry: dict) -> str:
    parts = [
        "Lens Ledger enquiry",
        clean_text(inquiry.get("clientName"), 60) or "Unknown client",
        clean_text(inquiry.get("eventType"), 40) or "Event",
    ]
    event_date = format_display_date(inquiry.get("eventDate", ""))
    contact = clean_text(inquiry.get("contact"), 80)
    location = clean_text(inquiry.get("location"), 80)
    summary = " | ".join(parts)
    details = [f"Date: {event_date}"]
    if contact:
        details.append(f"Contact: {contact}")
    if location:
        details.append(f"Location: {location}")
    return f"{summary}\n" + "\n".join(details)


def password_hash(password: str, salt: bytes | None = None) -> str:
    salt_bytes = salt or secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, 120_000)
    return f"{base64.b64encode(salt_bytes).decode()}:{base64.b64encode(derived).decode()}"


def verify_password(password: str, stored_hash: str) -> bool:
    salt_b64, derived_b64 = stored_hash.split(":", 1)
    expected = password_hash(password, base64.b64decode(salt_b64))
    return hmac.compare_digest(expected, stored_hash)


def infer_public_event_type(message: str = "", event_type: str = "") -> str:
    normalized_event_type = clean_text(event_type, 80)
    if normalized_event_type and normalized_event_type != "Other":
        return normalized_event_type

    lower_message = (message or "").lower()
    if "wedding" in lower_message:
        return "Wedding"
    if "engagement" in lower_message or "proposal" in lower_message or "couple" in lower_message:
        return "Engagement"
    if "baby shower" in lower_message:
        return "Baby Shower"
    if "gender reveal" in lower_message or "reveal" in lower_message:
        return "Gender Reveal"
    if "house warming" in lower_message or "housewarming" in lower_message or "griha pravesh" in lower_message:
        return "House Warming"
    if "birthday" in lower_message:
        return "Birthday"
    return "Other"


def parse_public_date(value: str) -> str | None:
    value = clean_text(value, 20)
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).date().isoformat()
    except ValueError:
        return None


def collect_booked_public_events(state: dict) -> list[dict]:
    booked_events: list[dict] = []

    for lead in state.get("leads", []):
        status = clean_text(lead.get("status"), 40)
        event_date = parse_public_date(lead.get("eventDate", ""))
        if event_date and status in {"Confirmed", "Completed", "Closed"}:
            booked_events.append(
                {
                    "date": event_date,
                    "label": clean_text(lead.get("clientName"), 120) or "Booked event",
                    "type": clean_text(lead.get("eventType"), 80) or "Event",
                }
            )

    for plan in state.get("weddingPlans", []):
        event_date = parse_public_date(plan.get("weddingDate", ""))
        if event_date:
            booked_events.append(
                {
                    "date": event_date,
                    "label": clean_text(plan.get("coupleName"), 120) or "Wedding booking",
                    "type": "Wedding",
                }
            )

    for job in state.get("shootShareJobs", []):
        event_date = parse_public_date(job.get("date", ""))
        if event_date:
            booked_events.append(
                {
                    "date": event_date,
                    "label": clean_text(job.get("shootFor"), 120) or "Shoot & Share job",
                    "type": "Shoot & Share",
                }
            )

    return booked_events


def collect_upcoming_sms_events(state: dict, window_start, window_end) -> list[dict]:
    events: list[dict] = []
    confirmed_statuses = {"Confirmed", "Completed"}

    def maybe_add(event_date_raw: str, label: str, event_type: str, time_label: str = "") -> None:
        parsed = parse_public_date(event_date_raw)
        if not parsed:
            return
        event_day = datetime.fromisoformat(parsed).date()
        if not (window_start <= event_day <= window_end):
            return
        events.append(
            {
                "date": event_day,
                "dateLabel": event_day.strftime("%b %d"),
                "label": clean_text(label, 100) or "Upcoming event",
                "type": clean_text(event_type, 40) or "Event",
                "time": clean_text(time_label, 40),
            }
        )

    for lead in state.get("leads", []):
        status = clean_text(lead.get("status"), 40)
        source = clean_text(lead.get("source"), 40)
        if source != "manual" and status not in confirmed_statuses:
            continue
        maybe_add(
            lead.get("eventDate", ""),
            clean_text(lead.get("clientName"), 80) or "Booked event",
            clean_text(lead.get("eventType"), 40) or "Event",
            clean_text(lead.get("eventTime"), 40),
        )

    for plan in state.get("weddingPlans", []):
        client_name = clean_text(plan.get("clientName") or plan.get("coupleName"), 80) or "Wedding"
        events_list = plan.get("events") or []
        if events_list:
            for event in events_list:
                maybe_add(
                    event.get("eventDate") or plan.get("weddingDate", ""),
                    f"{client_name} - {clean_text(event.get('eventName'), 60) or 'Wedding event'}",
                    "Wedding",
                    clean_text(event.get("time"), 40),
                )
        else:
            maybe_add(plan.get("weddingDate", ""), client_name, "Wedding", clean_text(plan.get("coverageTime"), 40))

    for job in state.get("shootShareJobs", []):
        maybe_add(
            job.get("date", ""),
            clean_text(job.get("shootFor"), 80) or "Shoot & Share",
            "Shoot & Share",
            clean_text(job.get("time"), 40),
        )

    events.sort(key=lambda item: (item["date"], item["time"], item["label"]))
    return events


def build_weekly_reminder_sms(events: list[dict], window_start, window_end) -> str:
    lines = [
        f"Upcoming this week ({window_start.strftime('%b %d')} - {window_end.strftime('%b %d')})",
    ]
    for item in events[:6]:
        suffix = f" | {item['time']}" if item["time"] else ""
        lines.append(f"{item['dateLabel']}: {item['label']} ({item['type']}){suffix}")
    remaining = len(events) - 6
    if remaining > 0:
        lines.append(f"+{remaining} more upcoming event(s)")
    return "\n".join(lines)


def notification_already_sent(connection: sqlite3.Connection, user_id: int, notification_key: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM notification_logs WHERE user_id = ? AND notification_key = ?",
        (user_id, notification_key),
    ).fetchone()
    return row is not None


def record_notification(connection: sqlite3.Connection, user_id: int, notification_key: str, notification_type: str) -> None:
    connection.execute(
        """
        INSERT INTO notification_logs (user_id, notification_key, notification_type, sent_at)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, notification_key, notification_type, isoformat(now_utc())),
    )


def maybe_send_weekly_sms_reminder() -> None:
    if not sms_alerts_configured():
        return

    today_local = now_local().date()
    window_end = today_local + timedelta(days=SMS_REMINDER_WINDOW_DAYS - 1)

    with db_connection() as connection:
        owner = get_public_enquiry_owner(connection)
        if owner is None:
            return

        notification_key = f"weekly-sms:{today_local.isoformat()}"
        if notification_already_sent(connection, owner["id"], notification_key):
            return

        row = connection.execute(
            "SELECT state_json FROM app_states WHERE user_id = ?",
            (owner["id"],),
        ).fetchone()
        state = json.loads(row["state_json"]) if row else empty_state()
        events = collect_upcoming_sms_events(state, today_local, window_end)
        if not events:
            return

        send_sms_message(build_weekly_reminder_sms(events, today_local, window_end))
        record_notification(connection, owner["id"], notification_key, "weekly-reminder")
        connection.commit()


def run_sms_reminder_loop() -> None:
    poll_seconds = max(int(os.getenv("SMS_REMINDER_POLL_SECONDS", "900")), 60)
    while True:
        try:
            maybe_send_weekly_sms_reminder()
        except Exception as error:
            print(f"SMS reminder failed: {error}")
        time.sleep(poll_seconds)


def get_public_follow_ups(event_type: str) -> list[str]:
    return PUBLIC_FOLLOW_UPS.get(event_type, PUBLIC_FOLLOW_UPS["Other"])


def get_public_portfolio_matches(message: str, event_type: str) -> list[dict]:
    haystack = f"{message} {event_type}".lower()
    scored_matches: list[tuple[int, dict]] = []

    for match in PUBLIC_PORTFOLIO_MATCHES:
        score = sum(1 for keyword in match["keywords"] if keyword in haystack)
        if score == 0 and event_type in {"Wedding", "Engagement"} and match["title"] == "Weddings":
            score = 1
        if score == 0 and event_type in {"Baby Shower", "Gender Reveal", "House Warming", "Birthday"} and match["title"] == "Event Pictures":
            score = 1
        if score > 0:
            scored_matches.append((score, {"title": match["title"], "url": match["url"], "reason": match["reason"]}))

    if not scored_matches:
        return [
            {"title": PUBLIC_PORTFOLIO_MATCHES[0]["title"], "url": PUBLIC_PORTFOLIO_MATCHES[0]["url"], "reason": PUBLIC_PORTFOLIO_MATCHES[0]["reason"]},
            {"title": PUBLIC_PORTFOLIO_MATCHES[1]["title"], "url": PUBLIC_PORTFOLIO_MATCHES[1]["url"], "reason": PUBLIC_PORTFOLIO_MATCHES[1]["reason"]},
        ]

    scored_matches.sort(key=lambda item: item[0], reverse=True)
    return [match for _, match in scored_matches[:2]]


def build_public_assistant_reply(payload: dict, state: dict) -> dict:
    message = clean_text(payload.get("message"), 800)
    event_type = infer_public_event_type(message, clean_text(payload.get("eventType"), 80))
    event_date = parse_public_date(payload.get("eventDate", ""))
    lower_message = message.lower()

    asks_availability = bool(event_date) or any(token in lower_message for token in {"available", "availability", "free", "open date", "open on", "date"})
    asks_packages = any(token in lower_message for token in {"package", "packages", "silver", "gold", "platinum", "price", "pricing"})
    asks_events = any(token in lower_message for token in {"baby shower", "engagement", "house warming", "housewarming", "birthday", "gender reveal", "do you do", "do you cover"})
    asks_portfolio = any(token in lower_message for token in {"portfolio", "style", "outdoor", "engagement style", "cinematic", "gallery", "look", "couple"})

    if not any([asks_availability, asks_packages, asks_events, asks_portfolio]):
        asks_packages = True
        asks_events = True
        asks_portfolio = True

    answer_parts = []
    availability = None

    if asks_availability:
        if event_date:
            conflicts = [item for item in collect_booked_public_events(state) if item["date"] == event_date]
            if conflicts:
                labels = ", ".join(f"{item['label']} ({item['type']})" for item in conflicts[:3])
                availability = {
                    "status": "Booked",
                    "label": f"{event_date} looks booked",
                    "details": labels,
                }
                answer_parts.append(f"{event_date} currently looks booked in the calendar. I can still review it manually if timing or location makes a split possible.")
            else:
                availability = {
                    "status": "Likely Available",
                    "label": f"{event_date} looks open",
                    "details": "No saved booking is blocking that date right now.",
                }
                answer_parts.append(f"{event_date} looks open right now based on the saved schedule. Once you send the enquiry, I can confirm it properly.")
        else:
            answer_parts.append("Send the date you are considering and I can check whether it looks open in the calendar.")

    if asks_packages:
        package_text = "Packages: " + " ".join(f"{name}: {description}" for name, description in PUBLIC_PACKAGE_INFO.items())
        answer_parts.append(package_text)

    if asks_events:
        answer_parts.append("Yes, coverage is available for weddings, engagements, baby showers, gender reveals, house warmings, birthdays, and other family celebrations.")

    portfolio_matches = get_public_portfolio_matches(message, event_type)
    if asks_portfolio:
        answer_parts.append("I matched a couple of portfolio galleries below based on the style or event type you mentioned.")

    return {
        "answer": " ".join(answer_parts).strip(),
        "availability": availability,
        "portfolioMatches": portfolio_matches,
        "suggestedQuestions": get_public_follow_ups(event_type),
        "eventType": event_type,
    }


def create_session(connection: sqlite3.Connection, user_id: int) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(32)
    expires_at = now_utc() + timedelta(days=SESSION_DAYS)
    connection.execute(
        "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
        (token, user_id, isoformat(expires_at), isoformat(now_utc())),
    )
    connection.commit()
    return token, expires_at


def cleanup_expired_reset_tokens(connection: sqlite3.Connection) -> None:
    connection.execute("DELETE FROM password_reset_tokens WHERE expires_at <= ?", (isoformat(now_utc()),))
    connection.commit()


def create_password_reset_token(connection: sqlite3.Connection, user_id: int) -> tuple[str, datetime]:
    cleanup_expired_reset_tokens(connection)
    connection.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", (user_id,))
    token = secrets.token_urlsafe(32)
    expires_at = now_utc() + timedelta(hours=RESET_TOKEN_HOURS)
    connection.execute(
        """
        INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (token, user_id, isoformat(expires_at), isoformat(now_utc())),
    )
    connection.commit()
    return token, expires_at


def get_password_reset_record(connection: sqlite3.Connection, token: str) -> sqlite3.Row | None:
    cleanup_expired_reset_tokens(connection)
    row = connection.execute(
        """
        SELECT password_reset_tokens.token, password_reset_tokens.user_id, password_reset_tokens.expires_at, users.email
        FROM password_reset_tokens
        JOIN users ON users.id = password_reset_tokens.user_id
        WHERE password_reset_tokens.token = ?
        """,
        (token,),
    ).fetchone()
    if row is None:
        return None
    if parse_iso(row["expires_at"]) <= now_utc():
        connection.execute("DELETE FROM password_reset_tokens WHERE token = ?", (token,))
        connection.commit()
        return None
    return row


def get_public_base_url(handler: "LensLedgerHandler") -> str:
    configured = os.getenv("PUBLIC_BASE_URL", "").strip().rstrip("/")
    if configured:
        return configured

    forwarded_proto = handler.headers.get("X-Forwarded-Proto", "").split(",")[0].strip()
    secure_cookie = os.getenv("COOKIE_SECURE", "0") == "1"
    scheme = forwarded_proto or ("https" if secure_cookie else "http")
    host = handler.headers.get("Host", f"localhost:{os.getenv('PORT', '8000')}")
    return f"{scheme}://{host}"


def send_password_reset_email(email_address: str, reset_link: str) -> None:
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_username = os.getenv("SMTP_USERNAME", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", "").strip() or smtp_username
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_use_ssl = os.getenv("SMTP_USE_SSL", "0") == "1"
    smtp_use_tls = os.getenv("SMTP_USE_TLS", "1") == "1"

    if not smtp_host or not smtp_from:
        raise RuntimeError("Password reset email is not configured yet.")

    message = EmailMessage()
    message["Subject"] = "Reset your Lens Ledger password"
    message["From"] = smtp_from
    message["To"] = email_address
    message.set_content(
        "\n".join(
            [
                "A password reset was requested for your Lens Ledger account.",
                "",
                f"Use this link to reset your password: {reset_link}",
                "",
                f"This link expires in {RESET_TOKEN_HOURS} hours.",
                "If you did not request this, you can ignore this email.",
            ]
        )
    )

    if smtp_use_ssl:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30) as server:
            if smtp_username:
                server.login(smtp_username, smtp_password)
            server.send_message(message)
        return

    with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
        if smtp_use_tls:
            server.starttls()
        if smtp_username:
            server.login(smtp_username, smtp_password)
        server.send_message(message)


def get_user_from_session(handler: "LensLedgerHandler") -> sqlite3.Row | None:
    cookie_header = handler.headers.get("Cookie")
    if not cookie_header:
        return None

    cookies = SimpleCookie()
    cookies.load(cookie_header)
    morsel = cookies.get(SESSION_COOKIE)
    if morsel is None:
        return None

    token = morsel.value
    with db_connection() as connection:
        row = connection.execute(
            """
            SELECT users.id, users.email, sessions.expires_at, sessions.token
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ?
            """,
            (token,),
        ).fetchone()

        if row is None:
            return None

        if parse_iso(row["expires_at"]) <= now_utc():
            connection.execute("DELETE FROM sessions WHERE token = ?", (token,))
            connection.commit()
            return None

        return row


def slide_files() -> list[Path]:
    if not UPLOADS_DIR.exists():
        return []

    return sorted(
        [path for path in UPLOADS_DIR.iterdir() if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS],
        key=lambda path: path.name.lower(),
    )


def slide_position(name: str) -> str:
    portrait_names = {"DVS04492.jpg", "iDVS03117.jpg"}
    if name in portrait_names:
        return "center 22%"
    return "center center"


class LensLedgerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PROJECT_ROOT), **kwargs)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/api/auth/session":
            self.handle_session_get()
            return
        if parsed.path == "/api/auth/reset-password":
            self.handle_reset_password_get(parsed)
            return
        if parsed.path == "/api/state":
            self.handle_state_get()
            return
        if parsed.path == "/api/slides":
            self.handle_slides_get()
            return
        if parsed.path == "/api/public/assistant":
            self.handle_public_assistant_get(parsed)
            return
        if parsed.path == "/api/public/reviews":
            self.handle_public_reviews_get()
            return
        if parsed.path == "/api/admin/reviews":
            self.handle_admin_reviews_get()
            return
        if parsed.path.startswith("/uploads/slides/"):
            self.handle_slide_file(parsed.path.removeprefix("/uploads/slides/"))
            return

        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/api/auth/signup":
            self.send_error_json(HTTPStatus.FORBIDDEN, "Account creation is disabled.")
            return
        if parsed.path == "/api/auth/login":
            self.handle_login()
            return
        if parsed.path == "/api/auth/forgot-password":
            self.handle_forgot_password()
            return
        if parsed.path == "/api/auth/reset-password":
            self.handle_reset_password()
            return
        if parsed.path == "/api/auth/logout":
            self.handle_logout()
            return
        if parsed.path == "/api/public/enquiry":
            self.handle_public_enquiry()
            return
        if parsed.path == "/api/public/assistant":
            self.handle_public_assistant()
            return
        if parsed.path == "/api/public/reviews":
            self.handle_public_reviews_post()
            return
        if parsed.path == "/api/admin/generate-quote":
            self.handle_generate_quote()
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Route not found.")

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path.startswith("/api/admin/reviews/"):
            self.handle_admin_review_action(parsed.path)
            return
        if parsed.path == "/api/state":
            self.handle_state_put()
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Route not found.")

    def send_json(self, payload: dict, status: int = HTTPStatus.OK) -> None:
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def send_error_json(self, status: int, message: str) -> None:
        self.send_json({"error": message}, status=status)

    def set_session_cookie(self, token: str, expires_at: datetime) -> None:
        secure_cookie = os.getenv("COOKIE_SECURE", "0") == "1"
        cookie_parts = [
            f"{SESSION_COOKIE}={token}",
            "Path=/",
            "HttpOnly",
            "SameSite=Lax",
            f"Max-Age={SESSION_DAYS * 24 * 60 * 60}",
            f"Expires={expires_at.strftime('%a, %d %b %Y %H:%M:%S GMT')}",
        ]
        if secure_cookie:
            cookie_parts.append("Secure")
        self.send_header("Set-Cookie", "; ".join(cookie_parts))

    def clear_session_cookie(self) -> None:
        self.send_header(
            "Set-Cookie",
            f"{SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        )

    def handle_signup(self) -> None:
        try:
            payload = read_json_body(self)
        except ValueError as error:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(error))
            return

        email = str(payload.get("email", "")).strip().lower()
        password = str(payload.get("password", ""))
        if not email or "@" not in email:
            self.send_error_json(HTTPStatus.BAD_REQUEST, "Enter a valid email address.")
            return
        if len(password) < 8:
            self.send_error_json(HTTPStatus.BAD_REQUEST, "Password must be at least 8 characters.")
            return

        with db_connection() as connection:
            existing = connection.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
            if existing is not None:
                self.send_error_json(HTTPStatus.CONFLICT, "That email already has an account.")
                return

            cursor = connection.execute(
                "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
                (email, password_hash(password), isoformat(now_utc())),
            )
            user_id = cursor.lastrowid
            connection.execute(
                "INSERT INTO app_states (user_id, state_json, updated_at) VALUES (?, ?, ?)",
                (user_id, json.dumps(empty_state()), isoformat(now_utc())),
            )
            token, expires_at = create_session(connection, user_id)

        self.send_response(HTTPStatus.CREATED)
        self.set_session_cookie(token, expires_at)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        body = json.dumps({"user": {"id": user_id, "email": email}}).encode("utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def handle_login(self) -> None:
        try:
            payload = read_json_body(self)
        except ValueError as error:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(error))
            return

        email = str(payload.get("email", "")).strip().lower()
        password = str(payload.get("password", ""))

        with db_connection() as connection:
            row = connection.execute(
                "SELECT id, email, password_hash FROM users WHERE email = ?",
                (email,),
            ).fetchone()
            if row is None or not verify_password(password, row["password_hash"]):
                self.send_error_json(HTTPStatus.UNAUTHORIZED, "Incorrect email or password.")
                return

            token, expires_at = create_session(connection, row["id"])

        self.send_response(HTTPStatus.OK)
        self.set_session_cookie(token, expires_at)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        body = json.dumps({"user": {"id": row["id"], "email": row["email"]}}).encode("utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def handle_forgot_password(self) -> None:
        try:
            payload = read_json_body(self)
        except ValueError as error:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(error))
            return

        email = str(payload.get("email", "")).strip().lower()
        if not email or "@" not in email:
            self.send_error_json(HTTPStatus.BAD_REQUEST, "Enter a valid email address.")
            return

        with db_connection() as connection:
            row = connection.execute("SELECT id, email FROM users WHERE email = ?", (email,)).fetchone()
            if row is None:
                self.send_json(
                    {"message": "If an account exists for that email, a reset link has been sent."},
                    status=HTTPStatus.OK,
                )
                return

            token, _ = create_password_reset_token(connection, row["id"])

        reset_link = f"{get_public_base_url(self)}/?reset={quote(token)}"

        try:
            send_password_reset_email(email, reset_link)
        except Exception as error:
            print(f"Password reset email failed for {email}: {error}")
            print(f"Password reset fallback link for {email}: {reset_link}")
            self.send_error_json(HTTPStatus.SERVICE_UNAVAILABLE, str(error))
            return

        self.send_json({"message": "If an account exists for that email, a reset link has been sent."}, status=HTTPStatus.OK)

    def handle_reset_password_get(self, parsed) -> None:
        token = parse_qs(parsed.query).get("token", [""])[0].strip()
        if not token:
            self.send_error_json(HTTPStatus.BAD_REQUEST, "Reset token is required.")
            return

        with db_connection() as connection:
            row = get_password_reset_record(connection, token)

        if row is None:
            self.send_error_json(HTTPStatus.BAD_REQUEST, "That reset link is invalid or has expired.")
            return

        self.send_json({"ok": True, "email": row["email"]})

    def handle_reset_password(self) -> None:
        try:
            payload = read_json_body(self)
        except ValueError as error:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(error))
            return

        token = str(payload.get("token", "")).strip()
        password = str(payload.get("password", ""))
        if not token:
            self.send_error_json(HTTPStatus.BAD_REQUEST, "Reset token is required.")
            return
        if len(password) < 8:
            self.send_error_json(HTTPStatus.BAD_REQUEST, "Password must be at least 8 characters.")
            return

        with db_connection() as connection:
            row = get_password_reset_record(connection, token)
            if row is None:
                self.send_error_json(HTTPStatus.BAD_REQUEST, "That reset link is invalid or has expired.")
                return

            connection.execute(
                "UPDATE users SET password_hash = ? WHERE id = ?",
                (password_hash(password), row["user_id"]),
            )
            connection.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", (row["user_id"],))
            connection.execute("DELETE FROM sessions WHERE user_id = ?", (row["user_id"],))
            connection.commit()

        self.send_json({"message": "Your password has been updated. Please sign in again."}, status=HTTPStatus.OK)

    # ── Reviews ──────────────────────────────────────────────

    def handle_public_reviews_get(self) -> None:
        """Return all approved reviews for the public page."""
        with db_connection() as conn:
            rows = conn.execute(
                "SELECT id, name, event_type, rating, review_text, created_at "
                "FROM reviews WHERE approved = 1 ORDER BY created_at DESC"
            ).fetchall()
        reviews = [dict(r) for r in rows]
        self.send_json({"reviews": reviews})

    def handle_public_reviews_post(self) -> None:
        """Submit a new review (goes into pending, not yet approved)."""
        try:
            payload = read_json_body(self)
        except ValueError as error:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(error))
            return

        name = clean_text(payload.get("name"), 120)
        event_type = clean_text(payload.get("eventType"), 80)
        review_text = clean_text(payload.get("reviewText"), 1200)
        try:
            rating = max(1, min(5, int(payload.get("rating", 5))))
        except (TypeError, ValueError):
            rating = 5

        if not name or not review_text:
            self.send_error_json(HTTPStatus.BAD_REQUEST, "Name and review are required.")
            return

        now = datetime.now(timezone.utc).isoformat()
        with db_connection() as conn:
            conn.execute(
                "INSERT INTO reviews (name, event_type, rating, review_text, approved, created_at) "
                "VALUES (?, ?, ?, ?, 0, ?)",
                (name, event_type or "Event", rating, review_text, now),
            )
            conn.commit()

        self.send_json({"message": "Thank you! Your review has been submitted and will appear once approved."}, status=HTTPStatus.CREATED)

    def handle_admin_reviews_get(self) -> None:
        """Return all reviews (pending + approved) for the admin dashboard."""
        user = get_user_from_session(self)
        if not user:
            self.send_error_json(HTTPStatus.UNAUTHORIZED, "Not authenticated.")
            return
        with db_connection() as conn:
            rows = conn.execute(
                "SELECT id, name, event_type, rating, review_text, approved, created_at "
                "FROM reviews ORDER BY approved ASC, created_at DESC"
            ).fetchall()
        self.send_json({"reviews": [dict(r) for r in rows]})

    def handle_admin_review_action(self, path: str) -> None:
        """Approve or delete a review. PUT /api/admin/reviews/<id>/approve or /delete."""
        user = get_user_from_session(self)
        if not user:
            self.send_error_json(HTTPStatus.UNAUTHORIZED, "Not authenticated.")
            return

        parts = path.rstrip("/").split("/")
        # Expected: ['', 'api', 'admin', 'reviews', '<id>', '<action>']
        if len(parts) < 6:
            self.send_error_json(HTTPStatus.BAD_REQUEST, "Invalid path.")
            return
        try:
            review_id = int(parts[4])
        except (ValueError, IndexError):
            self.send_error_json(HTTPStatus.BAD_REQUEST, "Invalid review id.")
            return
        action = parts[5] if len(parts) > 5 else ""

        with db_connection() as conn:
            if action == "approve":
                conn.execute("UPDATE reviews SET approved = 1 WHERE id = ?", (review_id,))
                conn.commit()
                self.send_json({"message": "Review approved."})
            elif action == "delete":
                conn.execute("DELETE FROM reviews WHERE id = ?", (review_id,))
                conn.commit()
                self.send_json({"message": "Review deleted."})
            else:
                self.send_error_json(HTTPStatus.BAD_REQUEST, "Unknown action. Use 'approve' or 'delete'.")

    # ─────────────────────────────────────────────────────────

    def handle_public_enquiry(self) -> None:
        try:
            payload = read_json_body(self)
        except ValueError as error:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(error))
            return

        inquiry = build_public_enquiry(payload)
        if not inquiry["clientName"]:
            self.send_error_json(HTTPStatus.BAD_REQUEST, "Name is required.")
            return
        if not inquiry["contact"]:
            self.send_error_json(HTTPStatus.BAD_REQUEST, "Phone or email is required.")
            return

        with db_connection() as connection:
            owner = get_public_enquiry_owner(connection)
            if owner is None:
                self.send_error_json(HTTPStatus.SERVICE_UNAVAILABLE, "Dashboard account is not ready yet.")
                return

            row = connection.execute(
                "SELECT state_json FROM app_states WHERE user_id = ?",
                (owner["id"],),
            ).fetchone()
            state = json.loads(row["state_json"]) if row else empty_state()
            state.setdefault("inquiries", []).append(inquiry)
            state.setdefault("leads", [])
            state.setdefault("weddingPlans", [])
            state.setdefault("shootShareJobs", [])
            state.setdefault("editorJobs", [])
            state.setdefault("bankAccounts", [])
            connection.execute(
                """
                INSERT INTO app_states (user_id, state_json, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                  state_json = excluded.state_json,
                  updated_at = excluded.updated_at
                """,
                (owner["id"], json.dumps(state), isoformat(now_utc())),
            )
            connection.commit()

        try:
            if sms_alerts_configured():
                send_sms_message(build_public_enquiry_sms(inquiry))
        except Exception as error:
            print(f"Enquiry SMS failed: {error}")

        self.send_json(
            {"ok": True, "message": "Thank you. Your enquiry has been sent."},
            status=HTTPStatus.CREATED,
        )

    def handle_public_assistant_get(self, parsed) -> None:
        params = parse_qs(parsed.query)
        payload = {
            "message": (params.get("message") or [""])[0],
            "eventType": (params.get("eventType") or [""])[0],
            "eventDate": (params.get("eventDate") or [""])[0],
        }
        self._send_public_assistant_response(payload)

    def handle_public_assistant(self) -> None:
        try:
            payload = read_json_body(self)
        except ValueError as error:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(error))
            return

        self._send_public_assistant_response(payload)

    def _send_public_assistant_response(self, payload: dict) -> None:
        with db_connection() as connection:
            owner = get_public_enquiry_owner(connection)
            state = empty_state()
            if owner is not None:
                row = connection.execute(
                    "SELECT state_json FROM app_states WHERE user_id = ?",
                    (owner["id"],),
                ).fetchone()
                if row:
                    state = json.loads(row["state_json"])

        self.send_json(build_public_assistant_reply(payload, state), status=HTTPStatus.OK)

    def handle_logout(self) -> None:
        cookie_header = self.headers.get("Cookie")
        token = None
        if cookie_header:
            cookies = SimpleCookie()
            cookies.load(cookie_header)
            morsel = cookies.get(SESSION_COOKIE)
            token = morsel.value if morsel is not None else None

        if token:
            with db_connection() as connection:
                connection.execute("DELETE FROM sessions WHERE token = ?", (token,))
                connection.commit()

        self.send_response(HTTPStatus.OK)
        self.clear_session_cookie()
        body = json.dumps({"ok": True}).encode("utf-8")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def handle_session_get(self) -> None:
        user = get_user_from_session(self)
        if user is None:
            self.send_error_json(HTTPStatus.UNAUTHORIZED, "Not signed in.")
            return

        self.send_json({"user": {"id": user["id"], "email": user["email"]}})

    def require_user(self) -> sqlite3.Row | None:
        user = get_user_from_session(self)
        if user is None:
            self.send_error_json(HTTPStatus.UNAUTHORIZED, "Sign in required.")
            return None
        return user

    def handle_state_get(self) -> None:
        user = self.require_user()
        if user is None:
            return

        with db_connection() as connection:
            row = connection.execute(
                "SELECT state_json FROM app_states WHERE user_id = ?",
                (user["id"],),
            ).fetchone()

        state_json = row["state_json"] if row else json.dumps(empty_state())
        self.send_json({"state": json.loads(state_json)})

    def handle_state_put(self) -> None:
        user = self.require_user()
        if user is None:
            return

        try:
            payload = read_json_body(self)
        except ValueError as error:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(error))
            return

        state = payload.get("state")
        if not isinstance(state, dict):
            self.send_error_json(HTTPStatus.BAD_REQUEST, "State payload is required.")
            return

        with db_connection() as connection:
            connection.execute(
                """
                INSERT INTO app_states (user_id, state_json, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                  state_json = excluded.state_json,
                  updated_at = excluded.updated_at
                """,
                (user["id"], json.dumps(state), isoformat(now_utc())),
            )
            connection.commit()

        self.send_json({"ok": True})

    def handle_slides_get(self) -> None:
        slides = [
            {
                "name": slide.name,
                "url": f"/uploads/slides/{quote(slide.name)}",
                "position": slide_position(slide.name),
            }
            for slide in slide_files()
        ]

        self.send_json({"slides": slides or DEFAULT_SLIDES})

    def handle_generate_quote(self) -> None:
        user = get_user_from_session(self)
        if user is None:
            self.send_error_json(HTTPStatus.UNAUTHORIZED, "Login required.")
            return
        if not REPORTLAB_OK:
            self.send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, "reportlab not installed on server.")
            return
        try:
            payload = read_json_body(self)
        except ValueError as e:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(e))
            return

        client_name = str(payload.get("clientName", "Valued Client")).strip() or "Valued Client"
        events      = payload.get("events", [])
        package     = str(payload.get("package", "Silver")).strip()
        price       = str(payload.get("price", "")).strip()

        pdf_bytes = generate_quote_pdf(client_name, events, package, price)

        safe_name = client_name.replace(" ", "_").replace("&", "and")
        filename  = f"Quote_{safe_name}.pdf"

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/pdf")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(pdf_bytes)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(pdf_bytes)

    def handle_slide_file(self, raw_name: str) -> None:
        slide_name = Path(unquote(raw_name)).name
        slide_path = (UPLOADS_DIR / slide_name).resolve()

        if not slide_path.exists() or slide_path.parent != UPLOADS_DIR.resolve():
            self.send_error(HTTPStatus.NOT_FOUND, "Slide not found")
            return

        content_type = mimetypes.guess_type(slide_path.name)[0] or "application/octet-stream"
        slide_bytes = slide_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(slide_bytes)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(slide_bytes)


def generate_quote_pdf(client_name, events, package, price):
    """Tales by DVS - v8: matches user-designed 6-page layout."""
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.utils import ImageReader
    from PIL import Image as PILImage
    import random

    LATO_DIR = "/usr/share/fonts/truetype/lato"
    for fname, ffile in [("Lato","Lato-Regular"),("Lato-Bold","Lato-Bold"),
                          ("Lato-Light","Lato-Light"),("Lato-Black","Lato-Black"),
                          ("Lato-Italic","Lato-Italic")]:
        try: pdfmetrics.registerFont(TTFont(fname, f"{LATO_DIR}/{ffile}.ttf"))
        except: pass

    buf = io.BytesIO()
    W, H = A4
    ASSET = PROJECT_ROOT / "assets" / "quote"
    today = datetime.now().strftime("%B %d, %Y")
    c = rl_canvas.Canvas(buf, pagesize=A4)

    # Colour palette matching design
    CREAM    = HexColor('#F4EFE6')   # warm cream bg (pages 1,3,4)
    BEIGE    = HexColor('#EAE2D5')   # slightly darker beige
    NAVY     = HexColor('#162038')   # table rows
    NAVY2    = HexColor('#1E2D46')   # alt row
    GOLD     = HexColor('#C9A84C')
    CHAMPAGNE= HexColor('#E8CC80')
    DARK     = HexColor('#1A1510')   # near-black text on light
    ESPRESSO = HexColor('#0A0806')   # dark page bg
    WHITE    = HexColor('#FFFFFF')
    IVORY    = HexColor('#F5EDD8')
    MUTED    = HexColor('#7A6E60')

    PAD = 38;  TW = W - PAD * 2
    TN = "Times-Roman";  TNB = "Times-Bold";  TNI = "Times-Italic"

    # ---- helpers --------------------------------------------------------

    def centre_wrap(text, y, font=TN, size=10, color=None, max_w=None, gap=15, cx=None):
        if color is None: color = DARK
        if max_w is None: max_w = TW - 20
        if cx is None: cx = W / 2
        c.setFont(font, size); c.setFillColor(color)
        words = text.split(); line = ""
        for w in words:
            t = (line+" "+w).strip()
            if c.stringWidth(t, font, size) <= max_w: line = t
            else: c.drawCentredString(cx, y, line); y -= gap; line = w
        if line: c.drawCentredString(cx, y, line); y -= gap
        return y

    def left_wrap(text, x, y, font=TN, size=9, color=None, max_w=None, gap=13):
        if color is None: color = DARK
        if max_w is None: max_w = TW - 10
        c.setFont(font, size); c.setFillColor(color)
        words = text.split(); line = ""
        for w in words:
            t = (line+" "+w).strip()
            if c.stringWidth(t, font, size) <= max_w: line = t
            else: c.drawString(x, y, line); y -= gap; line = w
        if line: c.drawString(x, y, line); y -= gap
        return y

    def txt(text, x, y, size=10, color=None, font="Lato", align="left"):
        if color is None: color = DARK
        c.setFillColor(color); c.setFont(font, size)
        if align=="center": c.drawCentredString(x, y, text)
        elif align=="right": c.drawRightString(x, y, text)
        else: c.drawString(x, y, text)

    def hairline(y, col=None, lw=0.3, x1=None, x2=None):
        if col is None: col = DARK
        if x1 is None: x1 = PAD
        if x2 is None: x2 = W - PAD
        c.setStrokeColor(col); c.setLineWidth(lw); c.line(x1, y, x2, y)

    def page_box(col=None):
        if col is None: col = HexColor('#C0B090')
        c.setStrokeColor(col); c.setLineWidth(0.5)
        c.rect(12, 12, W-24, H-24, fill=0, stroke=1)

    def draw_logo(cx, top_y, logo_w=160):
        logo_h = logo_w / 1.778
        try:
            c.drawImage(ImageReader(str(ASSET / "logo.png")),
                        cx - logo_w/2, top_y - logo_h, logo_w, logo_h, mask="auto")
        except:
            c.setFillColor(DARK); c.setFont(TNI, 16)
            c.drawCentredString(cx, top_y - 20, "tales by DVS"); logo_h = 20
        return top_y - logo_h

    def photo_fill(fname, cx, cy, cw, ch):
        try:
            img = PILImage.open(str(ASSET / fname))
            iw, ih = img.size
        except: iw, ih = 3, 2
        ia = iw/ih; ca = cw/ch
        if ia > ca: dh=ch; dw=ch*ia
        else:       dw=cw; dh=cw/ia
        dx = cx+(cw-dw)/2; dy = cy+(ch-dh)/2
        try:
            c.saveState()
            p = c.beginPath(); p.rect(cx, cy, cw, ch)
            c.clipPath(p, stroke=0, fill=0)
            c.drawImage(ImageReader(str(ASSET / fname)),
                        dx, dy, dw, dh, mask="auto", preserveAspectRatio=False)
            c.restoreState()
        except:
            c.saveState(); c.setFillColor(BEIGE)
            c.rect(cx, cy, cw, ch, fill=1, stroke=0); c.restoreState()

    def brush_header(label, cx, y, width):
        """Gold rounded-rect simulating brush-stroke column header."""
        bh = 26; bx = cx - width/2
        c.setFillColor(GOLD)
        c.roundRect(bx, y - bh + 6, width, bh, 4, fill=1, stroke=0)
        c.setFillColor(ESPRESSO); c.setFont(TNB, 9)
        c.drawCentredString(cx, y - bh + 13, label)

    def bullet_diamond(x, y):
        c.saveState(); c.setFillColor(GOLD)
        c.translate(x, y); c.rotate(45)
        c.rect(-3, -3, 6, 6, fill=1, stroke=0); c.restoreState()

    def footer_light(name):
        hairline(32, HexColor('#C0B090'), 0.4)
        txt("Quote prepared for "+name+"   •   "+today+"   •   Tales by DVS",
            W/2, 18, size=7, color=MUTED, font=TNI, align="center")

    def footer_dark(name):
        hairline(32, HexColor('#6A5A40'), 0.4)
        txt("Quote prepared for "+name+"   •   "+today+"   •   Tales by DVS",
            W/2, 18, size=7, color=MUTED, font=TNI, align="center")

    # =====================================================================
    # PAGE 1  –  COVER  (cream bg, triptych photos, greeting)
    # =====================================================================
    c.setFillColor(CREAM); c.rect(0, 0, W, H, fill=1, stroke=0)
    page_box(HexColor('#C0B090'))

    # Logo top center
    logo_bot = draw_logo(W/2, H - 18, 170)

    # Tagline
    txt("Timeless stories, told with heart and cinematic artistry.",
        W/2, logo_bot - 14, size=10, color=DARK, font=TNI, align="center")

    # Greeting
    greet_y = logo_bot - 44
    txt("Dear " + client_name + ",", W/2, greet_y,
        size=14, color=DARK, font=TNI, align="center")

    msg_y = greet_y - 22
    for line in [
        "We're honored to be a part of your celebration.",
        "Capturing your moments, timelessly and artfully.",
        "Please find our curated details below.",
    ]:
        txt(line, W/2, msg_y, size=10, color=DARK, font=TN, align="center")
        msg_y -= 18

    # Triptych  –  3 equal portrait columns
    GAP = 8
    COL_W = (TW - GAP*2) / 3
    PHOTO_H = msg_y - 52 - 80   # leave room for footer text
    photo_top_y = msg_y - 24

    for i, fname in enumerate(["cover_left.jpg", "cover_center.jpg", "cover_right.jpg"]):
        px = PAD + i * (COL_W + GAP)
        photo_fill(fname, px, photo_top_y - PHOTO_H, COL_W, PHOTO_H)
        # subtle shadow-border
        c.setStrokeColor(HexColor('#C0B090')); c.setLineWidth(0.5)
        c.rect(px, photo_top_y - PHOTO_H, COL_W, PHOTO_H, fill=0, stroke=1)

    # Divider + guarantee footer text
    div_y = photo_top_y - PHOTO_H - 10
    hairline(div_y, HexColor('#C0B090'), 0.4)
    guarantee = ("Guaranteed Deliveries - We're very committed to the deliveries with our talented "
                 "post-production team to give you processed images and processed videos within 60 "
                 "days from your payment date.")
    gy = div_y - 14
    gy = centre_wrap(guarantee, gy, font=TN, size=8, color=DARK,
                     max_w=TW - 20, gap=12)

    footer_light(client_name)
    c.showPage()

    # =====================================================================
    # PAGE 2  –  EVENTS TABLE  (full-bleed moonlit dancer bg)
    # =====================================================================
    # Full-bleed background
    try:
        c.drawImage(ImageReader(str(ASSET / "page2_bg.jpg")),
                    0, 0, W, H, preserveAspectRatio=False)
    except:
        c.setFillColor(HexColor('#0D1520')); c.rect(0,0,W,H,fill=1,stroke=0)

    # Dark overlay on upper 60% for readability
    c.setFillColor(HexColor('#0A1020')); c.setFillAlpha(0.55)
    c.rect(0, H*0.38, W, H*0.62, fill=1, stroke=0); c.setFillAlpha(1)

    page_box(HexColor('#C9A84C'))

    # Logo
    draw_logo(W/2, H - 18, 170)

    # Column header brush strokes
    C1W = 100; C3W = 150; C2W = TW - C1W - C3W
    c1_cx = PAD + C1W/2
    c2_cx = PAD + C1W + C2W/2
    c3_cx = PAD + C1W + C2W + C3W/2

    header_y = H - 105
    brush_header("DATE",       c1_cx, header_y, C1W - 8)
    brush_header("EVENT NAME", c2_cx, header_y, C2W - 8)
    brush_header("TEAM",       c3_cx, header_y, C3W - 8)

    # Table rows
    ry = header_y - 10
    for i, ev in enumerate(events):
        team_raw = ev.get("team", "")
        parts = team_raw.split(" + ")
        t1 = parts[0]; t2 = ("+ "+parts[1]) if len(parts)>1 else ""
        ROW_H = 36 if t2 else 28

        c.setFillColor(NAVY if i%2==0 else NAVY2); c.setFillAlpha(0.88)
        c.rect(PAD, ry-ROW_H, TW, ROW_H, fill=1, stroke=0); c.setFillAlpha(1)

        mid = ry - ROW_H/2 - 4
        c.setFont(TN, 9); c.setFillColor(WHITE)
        c.drawCentredString(c1_cx, mid, ev.get("date","TBD"))
        c.setFont(TNB, 9)
        c.drawCentredString(c2_cx, mid, ev.get("event",""))
        c.setFont(TN, 8.5)
        if t2:
            c.drawCentredString(c3_cx, ry-ROW_H/2+2, t1)
            c.drawCentredString(c3_cx, ry-ROW_H/2-11, t2)
        else:
            c.drawCentredString(c3_cx, mid, t1)
        ry -= ROW_H

    # Outer table border
    table_top_y = header_y - 10
    c.setStrokeColor(WHITE); c.setLineWidth(0.5)
    c.rect(PAD, ry, TW, table_top_y - ry, fill=0, stroke=1)
    c.setLineWidth(0.25)
    c.line(PAD+C1W, table_top_y, PAD+C1W, ry)
    c.line(PAD+C1W+C2W, table_top_y, PAD+C1W+C2W, ry)

    footer_dark(client_name)
    c.showPage()

    # =====================================================================
    # PAGE 3  –  DELIVERABLES  (cream bg, B&W watermark bride)
    # =====================================================================
    c.setFillColor(CREAM); c.rect(0,0,W,H,fill=1,stroke=0)

    # Faded B&W watermark (left portion)
    try:
        c.drawImage(ImageReader(str(ASSET/"page3_watermark.jpg")),
                    PAD-5, H*0.18, TW*0.52, H*0.60,
                    preserveAspectRatio=False)
        # Cream overlay to fade it
        c.setFillColor(CREAM); c.setFillAlpha(0.55)
        c.rect(PAD-5, H*0.18, TW*0.52, H*0.60, fill=1, stroke=0)
        c.setFillAlpha(1)
    except: pass

    page_box(HexColor('#C0B090'))

    # Logo top right
    draw_logo(W - 80, H - 18, 110)

    # Heading
    txt("DELIVERABLES", PAD, H - 45, size=22, color=DARK, font=TNB)

    PACKAGES = {
        "Silver":   {"price": price if package=="Silver"   else "425",
                     "items": ["Wedding Teaser - A beautifully crafted short teaser combining highlights from all events.",
                                "Wedding Trailer - A cinematic trailer covering all wedding events in one stunning film.",
                                "Full-Length complete videos for each event."]},
        "Gold":     {"price": price if package=="Gold"     else "500",
                     "items": ["Includes everything in our Silver Package along with a Couple Pre-Wedding Photoshoot."]},
        "Platinum": {"price": price if package=="Platinum" else "575",
                     "items": ["Includes everything in our Silver and Gold packages, along with:",
                                "Exclusive Individual Event Trailers.",
                                "Highlight Reels for Social Media.",
                                "Complimentary Couple Pre-wedding Photoshoot."]}
    }

    # Table geometry
    PC1W = 90; PC2W = 70; PC3W = TW - PC1W - PC2W
    py = H - 60

    # Table header row
    c.setFillColor(DARK); c.setFillAlpha(0.06)
    c.rect(PAD, py-24, TW, 24, fill=1, stroke=0); c.setFillAlpha(1)
    c.setStrokeColor(DARK); c.setLineWidth(0.5)
    c.rect(PAD, py-24, TW, 24, fill=0, stroke=1)
    c.setFont(TNI, 10); c.setFillColor(DARK)
    c.drawCentredString(PAD+PC1W/2, py-15, "Package")
    c.drawCentredString(PAD+PC1W+PC2W/2, py-15, "Price")
    c.drawCentredString(PAD+PC1W+PC2W+PC3W/2, py-15, "Deliverables")
    py -= 24

    for pkg_name, pkg_data in PACKAGES.items():
        is_sel = pkg_name == package
        # pre-wrap items
        item_lines = []
        for itm in pkg_data["items"]:
            words = itm.split(); ln = ""
            for ww in words:
                t = (ln+" "+ww).strip()
                if c.stringWidth(t, TN, 8.5) <= PC3W-16: ln = t
                else: item_lines.append(ln); ln = ww
            if ln: item_lines.append(ln)
            item_lines.append("")

        rh = max(70, len(item_lines)*13 + 24)

        # Row bg
        c.setFillColor(HexColor('#EBE5D8') if is_sel else CREAM)
        c.rect(PAD, py-rh, TW, rh, fill=1, stroke=0)
        c.setStrokeColor(HexColor('#B0A090')); c.setLineWidth(0.5)
        c.rect(PAD, py-rh, TW, rh, fill=0, stroke=1)

        if is_sel:
            # Gold accent top border for selected
            c.setStrokeColor(GOLD); c.setLineWidth(2)
            c.line(PAD, py, PAD+TW, py)
            c.setLineWidth(0.5)

        mid_r = py - rh/2
        c.setFont(TNI, 11); c.setFillColor(DARK)
        c.drawCentredString(PAD+PC1W/2, mid_r-4, pkg_name)
        c.setFont(TNB if is_sel else TN, 14)
        c.setFillColor(DARK)
        c.drawCentredString(PAD+PC1W+PC2W/2, mid_r-5, pkg_data["price"])

        ity = py - 16
        c.setFont(TN, 8.5); c.setFillColor(DARK)
        for il in item_lines:
            if il:
                c.drawString(PAD+PC1W+PC2W+8, ity, "• "+il)
            ity -= 13

        # Column dividers
        c.setStrokeColor(HexColor('#B0A090')); c.setLineWidth(0.4)
        c.line(PAD+PC1W, py, PAD+PC1W, py-rh)
        c.line(PAD+PC1W+PC2W, py, PAD+PC1W+PC2W, py-rh)
        py -= rh

    # Notes
    hairline(py-12, HexColor('#B0A090'), 0.4)
    ny = py - 26
    for note in [
        "• Photos of all the events are uploaded on the cloud and shared through a private link, which can be accessed for ONE YEAR from your wedding",
        "• EDITED PICTURES - All the raw Pictures are shortlisted and then processed with light and colour corrections.",
    ]:
        ny = left_wrap(note, PAD, ny, font=TN, size=8.5, color=DARK, max_w=TW-8, gap=12)
        ny -= 6

    hairline(ny-8, HexColor('#B0A090'), 0.4)
    txt('"WE DON\'T PROCESS ANY RAW DATA UNTIL 100% PAYMENT IS DONE"',
        W/2, ny-22, size=9, color=DARK, font=TNB, align="center")

    footer_light(client_name)
    c.showPage()

    # =====================================================================
    # PAGE 4  –  TERMS  (cream bg, very faded portrait watermark)
    # =====================================================================
    c.setFillColor(BEIGE); c.rect(0,0,W,H,fill=1,stroke=0)

    # Very faded bg photo top portion
    try:
        c.drawImage(ImageReader(str(ASSET/"page4_bg.jpg")),
                    0, H*0.42, W, H*0.58, preserveAspectRatio=False)
        c.setFillColor(BEIGE); c.setFillAlpha(0.60)
        c.rect(0, H*0.42, W, H*0.58, fill=1, stroke=0); c.setFillAlpha(1)
    except: pass

    page_box(HexColor('#C0B090'))

    # Logo top right
    draw_logo(W-80, H-18, 110)

    # Heading
    txt("TERMS", W/2, H-52, size=32, color=DARK, font=TNB, align="center")
    hairline(H-62, HexColor('#C0B090'), 0.4)

    terms = [
        ('1. "SCHEDULING"',
         'The client should provide a schedule 30 days before the wedding date which has the '
         'dates and timings of events, locations, start and end timings. All the events will be '
         'planned and will happen according to the information provided by the client, NO changes '
         'can be done at the "last minute". team information will be available in the group we '
         'share with you before the event.'),
        ('2. TRAVEL EXPENSES',
         'You shall provide travel and accommodation for all outstation events. if accommodation '
         'is not provided we will head to book one and charges will be added to the final bill '
         'after the wedding.'),
        ('3. ADVANCE PAYMENTS',
         'You shall clear 50% of the whole amount immediately to block the dates, 50% on the '
         'wedding day. Once the advance is paid and the dates are blocked, it cannot be refunded. '
         'Guaranteed delivery from 60 days of your second payment, else we offer a free couple shoot.'),
        ('4. Change of Plans',
         'Any change of plan and postponement of any event will be accommodated based on our '
         'availability on the new dates (ONLY WITH 3 MONTHS PRIOR NOTIFICATION). if not informed '
         'the day will be considered an event and the advance will not be refunded.'),
        ('5. HARDISK / PAYMENTS / BACKUP-DATA',
         'DATA is provided over the hard disk to the client only when 100% of the payment is done. '
         'RAW DATA WILL BE GIVEN ONLY OVER HARDRIVE AFTER THE PAYMENT. we do not keep a backup of '
         'any wedding after 3 months (without payment) 1 year (after payment). we\'re not responsible '
         'for the data after the due date.'),
        ('6. TEAM / RESPECT / TIMING',
         'All our team is well-behaved and well-mannered, we expect the same in case of any events '
         'or situations. supporting them in an event will result in good output. Please let them have '
         'their space for a while to have food during long-day events. we respect your time and will '
         'be available on time and we expect the same from the clients. mentioning event time one hour '
         'before the event is fine but 2-3 hours prior will be considered as shooting time, time '
         'starts from the time mentioned on the schedule by the client.'),
    ]

    ty = H - 76
    for heading, body in terms:
        c.setFont(TNB, 9); c.setFillColor(DARK)
        c.drawString(PAD, ty, heading)
        ty -= 14
        ty = left_wrap(body, PAD+8, ty, font=TN, size=8.5, color=DARK,
                       max_w=TW-10, gap=12)
        ty -= 10
        if ty < 44: break

    footer_light(client_name)
    c.showPage()

    # =====================================================================
    # PAGE 5  –  CONDITIONS  (dark warm bg, dramatic photo at bottom)
    # =====================================================================
    c.setFillColor(HexColor('#1A1208')); c.rect(0,0,W,H,fill=1,stroke=0)

    # Bottom dramatic photo strip (~35% of page)
    PHOTO_STRIP_H = H * 0.36
    try:
        photo_fill("page5_bottom.jpg", 0, 0, W, PHOTO_STRIP_H)
        # Gradient fade top of photo into dark bg
        for alpha, frac in ((0.98,0.55),(0.80,0.35),(0.50,0.18)):
            c.setFillColor(HexColor('#1A1208')); c.setFillAlpha(alpha)
            c.rect(0, PHOTO_STRIP_H*(1-frac), W, PHOTO_STRIP_H*frac, fill=1, stroke=0)
        c.setFillAlpha(1)
    except: pass

    page_box(HexColor('#C9A84C'))

    # Logo top right
    draw_logo(W-80, H-18, 110)

    # Heading
    txt("CONDITIONS", W/2, H-52, size=28, color=WHITE, font=TNB, align="center")
    hairline(H-64, HexColor('#C9A84C'), 0.5)

    conditions = [
        "WE DON'T PROVIDE SERVICES FOR ANY EVENT THAT IS NOT MENTIONED IN THE QUOTE.",
        "Processed images and videos will be delivered within 60 days from the 2nd payment date.",
        "FOOD COVERAGE' will be done only if mentioned as we have limited sources for the wedding, prior notification is needed to cover the food.",
        'WE DON\'T PROVIDE "BANNERS" "PLAY CARDS" "FLEXIS" & "INVITATIONS"',
        "We provide raw data on SmugMug only AFTER 10 days of the wedding date.",
        "HARD DRIVE - 2 X 2TB HARDRIVES(SSD) Should be provided by the Client before the first event of the wedding rituals, We provide all the raw data and processed data over the hard drive provided by the client.",
    ]

    cy = H - 80
    for cond in conditions:
        is_bold = cond == cond.upper() or cond.startswith("WE DON") or cond.startswith("HARD")
        font_used = TNB if is_bold else TN
        words = cond.split(); lines = []; ln = ""
        for ww in words:
            t = (ln+" "+ww).strip()
            if c.stringWidth(t, font_used, 9) <= TW-30: ln = t
            else: lines.append(ln); ln = ww
        if ln: lines.append(ln)

        # Diamond bullet
        bullet_diamond(PAD+8, cy - 5)

        c.setFont(font_used, 9)
        c.setFillColor(WHITE if is_bold else IVORY)
        liy = cy
        for ll in lines:
            c.drawString(PAD+20, liy, ll); liy -= 13; cy -= 13
        cy -= 14
        if cy < PHOTO_STRIP_H + 20: break

    footer_dark(client_name)
    c.showPage()

    # =====================================================================
    # PAGE 6  –  THANK YOU  (full-bleed holi/warm bg)
    # =====================================================================
    try:
        c.drawImage(ImageReader(str(ASSET/"page6_bg.jpg")),
                    0, 0, W, H, preserveAspectRatio=False)
    except:
        c.setFillColor(HexColor('#3A2010')); c.rect(0,0,W,H,fill=1,stroke=0)

    # Light overlay top portion for text readability
    c.setFillColor(WHITE); c.setFillAlpha(0.42)
    c.rect(0, H*0.62, W, H*0.38, fill=1, stroke=0); c.setFillAlpha(1)

    page_box(HexColor('#C9A84C'))

    # Logo
    draw_logo(W/2, H-18, 160)

    # "Client Galleries" — underlined hyperlink
    link_y = H - 90
    c.setFont(TNB, 18); c.setFillColor(DARK)
    lw2 = c.stringWidth("Client Galleries", TNB, 18)
    c.drawCentredString(W/2, link_y, "Client Galleries")
    c.setStrokeColor(DARK); c.setLineWidth(1.2)
    c.line(W/2 - lw2/2, link_y-2, W/2 + lw2/2, link_y-2)
    c.linkURL("https://www.talesbydvs.com",
              (W/2-lw2/2, link_y-4, W/2+lw2/2, link_y+18), relative=0)

    txt("ITS YOUR BIG DAY!", W/2, link_y-28, size=16, color=DARK, font=TNB, align="center")
    txt("MAKE IT MORE MEMORABLE WITH US!", W/2, link_y-50, size=13, color=DARK, font=TNB, align="center")

    # THANK YOU in large
    txt("THANK YOU!", W/2, link_y-94, size=42, color=DARK, font=TNB, align="center")

    footer_dark(client_name)
    c.showPage()
    c.save()
    buf.seek(0)
    return buf.read()


def main() -> None:
    ensure_database()
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    if sms_alerts_configured():
        reminder_thread = threading.Thread(target=run_sms_reminder_loop, daemon=True)
        reminder_thread.start()
        print("SMS alerts enabled: enquiry alerts + weekly reminders")
    server = ThreadingHTTPServer((host, port), LensLedgerHandler)
    print(f"Lens Ledger web server running at http://{host}:{port}")
    print(f"Database file: {DB_PATH}")
    print(f"Hero slideshow folder: {UPLOADS_DIR}")
    server.serve_forever()


if __name__ == "__main__":
    main()
