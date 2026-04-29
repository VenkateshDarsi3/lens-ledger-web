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


def generate_quote_pdf(client_name: str, events: list, package: str, price: str) -> bytes:
    """Generate a luxury Tales by DVS quote PDF — premium redesign."""
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.utils import ImageReader
    import random

    # ── Register Lato fonts ──────────────────────────────────────────────────
    LATO_DIR = "/usr/share/fonts/truetype/lato"
    for fname, ffile in [
        ("Lato",        "Lato-Regular"),
        ("Lato-Bold",   "Lato-Bold"),
        ("Lato-Light",  "Lato-Light"),
        ("Lato-Black",  "Lato-Black"),
        ("Lato-Italic", "Lato-Italic"),
        ("Lato-Thin",   "Lato-Thin"),
    ]:
        try:
            pdfmetrics.registerFont(TTFont(fname, f"{LATO_DIR}/{ffile}.ttf"))
        except Exception:
            pass

    buf = io.BytesIO()
    W, H = A4   # ~595 x 842 pts

    ASSET_DIR = PROJECT_ROOT / "assets" / "quote"
    today = datetime.now().strftime("%B %d, %Y")

    c = rl_canvas.Canvas(buf, pagesize=A4)

    # ── Palette ──────────────────────────────────────────────────────────────
    NAVY  = HexColor('#0B1520')
    NAVY2 = HexColor('#0F1E30')
    GOLD  = HexColor('#C9A84C')
    LGOLD = HexColor('#D9BC72')
    WHITE = HexColor('#FFFFFF')
    CREAM = HexColor('#EDE3D4')
    MUTED = HexColor('#8A7E6E')

    # ── Layout constants ─────────────────────────────────────────────────────
    PAD = 38
    TW  = W - PAD * 2

    # ── Helper: centred word-wrap, returns new y ─────────────────────────────
    def centre_wrap(text, y, font="Lato", size=9, color=CREAM, max_w=W - 90, gap=13):
        c.setFont(font, size)
        c.setFillColor(color)
        words = text.split()
        line = ""
        for w in words:
            test = (line + " " + w).strip()
            if c.stringWidth(test, font, size) <= max_w:
                line = test
            else:
                c.drawCentredString(W / 2, y, line)
                y -= gap
                line = w
        if line:
            c.drawCentredString(W / 2, y, line)
            y -= gap
        return y

    # ── Helper: left-aligned word-wrap, returns new y ────────────────────────
    def left_wrap(text, x, y, font="Lato", size=9, color=CREAM, max_w=W - 80, gap=12):
        c.setFont(font, size)
        c.setFillColor(color)
        words = text.split()
        line = ""
        for w in words:
            test = (line + " " + w).strip()
            if c.stringWidth(test, font, size) <= max_w:
                line = test
            else:
                c.drawString(x, y, line)
                y -= gap
                line = w
        if line:
            c.drawString(x, y, line)
            y -= gap
        return y

    # ── Helper: horizontal rule ───────────────────────────────────────────────
    def hline(y, col=GOLD, lw=0.6, pad=36):
        c.setStrokeColor(col)
        c.setLineWidth(lw)
        c.line(pad, y, W - pad, y)

    # ── Helper: quick text draw ───────────────────────────────────────────────
    def txt(text, x, y, size=10, color=WHITE, font="Lato", align="left"):
        c.setFillColor(color)
        c.setFont(font, size)
        if align == "center":   c.drawCentredString(x, y, text)
        elif align == "right":  c.drawRightString(x, y, text)
        else:                   c.drawString(x, y, text)

    # ── Helper: navy background ───────────────────────────────────────────────
    def navy_bg():
        c.setFillColor(NAVY)
        c.rect(0, 0, W, H, fill=1, stroke=0)

    # ── Helper: draw logo, return bottom-y of logo ────────────────────────────
    def draw_logo(cx, top_y, logo_w=180):
        logo_h = logo_w / 1.775   # 600/338 aspect ratio
        try:
            c.drawImage(ImageReader(str(ASSET_DIR / "logo.png")),
                        cx - logo_w / 2, top_y - logo_h,
                        logo_w, logo_h, mask="auto")
        except Exception:
            c.setFillColor(GOLD)
            c.setFont("Lato-Bold", 20)
            c.drawCentredString(cx, top_y - 28, "tales by DVS")
            logo_h = 28
        return top_y - logo_h

    # ── Helper: programmatic gold bokeh dots ──────────────────────────────────
    def draw_bokeh(seed=42, count=55, y_top=H, y_bot=0):
        rng = random.Random(seed)
        c.saveState()
        for _ in range(count):
            bx = rng.uniform(0, W)
            by = rng.uniform(y_bot, y_top)
            br = rng.uniform(1.5, 9)
            ba = rng.uniform(0.03, 0.20)
            c.setFillColor(GOLD)
            c.setFillAlpha(ba)
            c.circle(bx, by, br, fill=1, stroke=0)
        c.setFillAlpha(1)
        c.restoreState()

    # ── Helper: draw photo clipped to rect ───────────────────────────────────
    def draw_photo(photo_name, x, y, pw, ph):
        try:
            c.saveState()
            p = c.beginPath()
            p.rect(x, y, pw, ph)
            c.clipPath(p, stroke=0, fill=0)
            c.drawImage(ImageReader(str(ASSET_DIR / photo_name)),
                        x, y, pw, ph, mask="auto", preserveAspectRatio=False)
            c.restoreState()
        except Exception:
            c.saveState()
            c.setFillColor(NAVY2)
            c.rect(x, y, pw, ph, fill=1, stroke=0)
            c.restoreState()

    # ══════════════════════════════════════════════════════════════════════════
    #  PAGE 1 — Full-bleed Cover Photo + Events Table
    # ══════════════════════════════════════════════════════════════════════════

    # 1a. Full-bleed wedding photo (cover_bg.jpg already A4-proportioned)
    try:
        c.drawImage(ImageReader(str(ASSET_DIR / "cover_bg.jpg")),
                    0, 0, W, H, preserveAspectRatio=False)
    except Exception:
        navy_bg()

    # 1b. Dark gradient overlay — almost opaque at bottom, barely visible at top
    overlay_h = H * 0.78
    steps = 42
    for i in range(steps):
        frac = i / steps
        alpha = 0.96 - frac * 0.93
        c.setFillColor(NAVY)
        c.setFillAlpha(alpha)
        band_h = overlay_h / steps
        c.rect(0, i * band_h, W, band_h + 1, fill=1, stroke=0)
    c.setFillAlpha(1)

    # 1c. Semi-transparent navy bar at very top for logo readability
    c.setFillColor(NAVY)
    c.setFillAlpha(0.60)
    c.rect(0, H - 115, W, 115, fill=1, stroke=0)
    c.setFillAlpha(1)

    # 1d. Logo — top center
    logo_bot = draw_logo(W / 2, H - 14, 210)

    # 1e. Thin gold rule below logo
    hline(logo_bot - 8, GOLD, 0.8)

    # 1f. Greeting
    txt(f"DEAR {client_name.upper()},",
        W / 2, logo_bot - 26, size=15, color=GOLD, font="Lato-Light", align="center")

    # 1g. Intro
    intro = (
        "THANK YOU FOR REACHING US. WE WOULD BE HONOURED TO BE A PART OF YOUR "
        "CELEBRATIONS AND TO FREEZE YOUR AUSPICIOUS MOMENTS. PLEASE FIND OUR "
        "SERVICES, DELIVERABLES AND CHARGES LISTED BELOW AS PER YOUR REQUIREMENTS."
    )
    iy = centre_wrap(intro, logo_bot - 46, font="Lato", size=8.5, color=CREAM,
                     max_w=W - 100, gap=13)

    # ── Events table ─────────────────────────────────────────────────────────
    C1W   = 108   # DATE column width
    C3W   = 90    # TEAM column width
    C2W   = TW - C1W - C3W   # EVENT NAME
    ROW_H = 30
    HDR_H = 26

    table_top = iy - 18

    # Header row — solid gold fill, navy text
    c.setFillColor(GOLD)
    c.rect(PAD, table_top - HDR_H, TW, HDR_H, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Lato-Bold", 9)
    c.drawCentredString(PAD + C1W / 2,               table_top - HDR_H + 10, "DATE")
    c.drawCentredString(PAD + C1W + C2W / 2,         table_top - HDR_H + 10, "EVENT")
    c.drawCentredString(PAD + C1W + C2W + C3W / 2,   table_top - HDR_H + 10, "TEAM")

    ry = table_top - HDR_H
    for i, ev in enumerate(events):
        row_fill = HexColor('#0F1D2E') if i % 2 == 0 else HexColor('#091523')
        c.setFillColor(row_fill)
        c.rect(PAD, ry - ROW_H, TW, ROW_H, fill=1, stroke=0)
        c.setStrokeColor(GOLD)
        c.setLineWidth(0.25)
        c.line(PAD, ry - ROW_H, PAD + TW, ry - ROW_H)

        my = ry - ROW_H / 2 - 4
        c.setFont("Lato", 9)
        c.setFillColor(CREAM)
        c.drawCentredString(PAD + C1W / 2,               my, ev.get("date", "TBD"))
        c.setFont("Lato-Bold", 9)
        c.setFillColor(WHITE)
        c.drawCentredString(PAD + C1W + C2W / 2,         my, ev.get("name", ""))
        c.setFont("Lato", 9)
        c.setFillColor(CREAM)
        c.drawCentredString(PAD + C1W + C2W + C3W / 2,   my, ev.get("team", ""))
        ry -= ROW_H

    # Outer border + vertical dividers on table
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.5)
    c.rect(PAD, ry, TW, table_top - ry, fill=0, stroke=1)
    c.setLineWidth(0.25)
    c.line(PAD + C1W,        table_top - HDR_H, PAD + C1W,        ry)
    c.line(PAD + C1W + C2W,  table_top - HDR_H, PAD + C1W + C2W,  ry)

    # Footer
    hline(36, GOLD, 0.5)
    txt(f"Quote prepared for {client_name}   •   {today}   •   Tales by DVS",
        W / 2, 22, size=7.5, color=MUTED, font="Lato-Italic", align="center")

    c.showPage()

    # ══════════════════════════════════════════════════════════════════════════
    #  PAGE 2 — Deliverables / Packages
    # ══════════════════════════════════════════════════════════════════════════
    navy_bg()
    draw_bokeh(seed=101, count=52, y_top=H, y_bot=0)

    # Small logo top right
    draw_logo(W - 85, H - 10, 130)

    txt("DELIVERABLES", W / 2, H - 50, size=28, color=WHITE, font="Lato-Light", align="center")
    hline(H - 63, GOLD, 1.0)

    PACKAGES = {
        "Silver": {
            "price": price if package == "Silver" else "475",
            "items": [
                "Wedding Teaser — Short cinematic teaser combining highlights from all events.",
                "Wedding Trailer — Full cinematic trailer covering all wedding events.",
                "Full-length complete videos for each individual event.",
            ],
        },
        "Gold": {
            "price": price if package == "Gold" else "550",
            "items": [
                "Everything in Silver Package, plus:",
                "Couple Pre-Wedding Photoshoot.",
            ],
        },
        "Platinum": {
            "price": price if package == "Platinum" else "650",
            "items": [
                "Everything in Silver & Gold, plus:",
                "Exclusive Individual Event Trailers.",
                "Highlight Reels for Social Media.",
                "Complimentary Couple Pre-Wedding Photoshoot.",
            ],
        },
    }

    PT_X = 36
    PT_W = W - 72
    PC1W = 82    # Package name
    PC2W = 74    # Price
    PC3W = PT_W - PC1W - PC2W   # Deliverables

    py = H - 76

    # Header row
    c.setFillColor(HexColor('#071018'))
    c.rect(PT_X, py - 22, PT_W, 22, fill=1, stroke=0)
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.6)
    c.rect(PT_X, py - 22, PT_W, 22, fill=0, stroke=1)
    c.setFillColor(LGOLD)
    c.setFont("Lato-Bold", 9)
    c.drawCentredString(PT_X + PC1W / 2,               py - 12, "PACKAGE")
    c.drawCentredString(PT_X + PC1W + PC2W / 2,        py - 12, "PRICE (USD)")
    c.drawCentredString(PT_X + PC1W + PC2W + PC3W / 2, py - 12, "WHAT'S INCLUDED")
    py -= 22

    for pkg_name, pkg_data in PACKAGES.items():
        is_sel = pkg_name == package

        # Pre-wrap deliverable text lines
        item_lines = []
        for itm in pkg_data["items"]:
            words = itm.split()
            ln = ""
            for ww in words:
                test = (ln + " " + ww).strip()
                if c.stringWidth(test, "Lato", 8.5) <= PC3W - 16:
                    ln = test
                else:
                    item_lines.append(ln)
                    ln = ww
            if ln:
                item_lines.append(ln)
            item_lines.append("")   # gap between items

        rh = max(58, len(item_lines) * 12 + 22)

        row_col = HexColor('#1A3050') if is_sel else HexColor('#10202E')
        c.setFillColor(row_col)
        c.rect(PT_X, py - rh, PT_W, rh, fill=1, stroke=0)
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.5 if is_sel else 0.4)
        c.rect(PT_X, py - rh, PT_W, rh, fill=0, stroke=1)

        if is_sel:
            c.setFillColor(GOLD)
            c.rect(PT_X, py - rh, 4, rh, fill=1, stroke=0)
            bw, bh = 72, 14
            c.setFillColor(GOLD)
            c.roundRect(PT_X + PT_W - bw - 6, py - bh - 4, bw, bh, 3, fill=1, stroke=0)
            c.setFillColor(NAVY)
            c.setFont("Lato-Bold", 7)
            c.drawCentredString(PT_X + PT_W - 6 - bw / 2, py - bh + 2, "YOUR PACKAGE")

        mid_r = py - rh / 2
        c.setFillColor(GOLD if is_sel else LGOLD)
        c.setFont("Lato-Bold", 12)
        c.drawCentredString(PT_X + PC1W / 2, mid_r - 5, pkg_name.upper())

        c.setFillColor(WHITE if is_sel else CREAM)
        c.setFont("Lato-Black", 17)
        c.drawCentredString(PT_X + PC1W + PC2W / 2, mid_r - 7, f"${pkg_data['price']}")

        c.setFont("Lato", 8.5)
        c.setFillColor(CREAM)
        ity = py - 14
        for il in item_lines:
            if il:
                c.drawString(PT_X + PC1W + PC2W + 10, ity, il)
            ity -= 12

        c.setStrokeColor(GOLD)
        c.setLineWidth(0.3)
        c.line(PT_X + PC1W,         py, PT_X + PC1W,         py - rh)
        c.line(PT_X + PC1W + PC2W,  py, PT_X + PC1W + PC2W,  py - rh)

        py -= rh

    hline(py - 10, GOLD, 0.4)
    ny = py - 24
    notes = [
        "•  Photos uploaded to a private cloud link — accessible for ONE YEAR from your wedding date.",
        "•  EDITED PICTURES — All raw pictures shortlisted and processed with light & color corrections.",
    ]
    for note in notes:
        ny = left_wrap(note, PT_X + 4, ny, font="Lato", size=8, color=CREAM,
                       max_w=PT_W - 8, gap=11)
        ny -= 4

    hline(46, GOLD, 0.8)
    txt('“WE DON’T PROCESS ANY RAW DATA UNTIL 100% PAYMENT IS DONE”',
        W / 2, 30, size=8.5, color=GOLD, font="Lato-Italic", align="center")

    c.showPage()

    # ══════════════════════════════════════════════════════════════════════════
    #  PAGE 3 — Terms & Conditions
    # ══════════════════════════════════════════════════════════════════════════
    navy_bg()
    draw_bokeh(seed=202, count=45, y_top=H, y_bot=0)

    draw_logo(W - 85, H - 10, 130)
    txt("TERMS & CONDITIONS", W / 2, H - 50, size=26, color=WHITE,
        font="Lato-Light", align="center")
    hline(H - 63, GOLD, 1.0)

    terms = [
        ("1.  SCHEDULING",
         "The client should provide a schedule 30 days before the wedding date, including dates, "
         "timings, locations, and start/end times for all events. No last-minute changes. Team "
         "information will be shared in a group before the event."),
        ("2.  TRAVEL EXPENSES",
         "You shall provide travel and accommodation for all outstation events. If accommodation "
         "is not provided, we will book and add the charges to the final bill."),
        ("3.  ADVANCE PAYMENTS",
         "50% of the total amount is required immediately to block your dates; the remaining 50% "
         "is due on the wedding day. Once the advance is paid, it cannot be refunded. Guaranteed "
         "delivery within 60 days of your second payment — otherwise we offer a complimentary "
         "couple shoot."),
        ("4.  CHANGE OF PLANS",
         "Any change of plan or postponement will be accommodated based on availability on the new "
         "dates, ONLY WITH 3 MONTHS PRIOR NOTIFICATION. Otherwise the day is considered an event "
         "and the advance will not be refunded."),
        ("5.  HARD DISK / PAYMENTS / BACKUP",
         "Data is provided over the hard disk ONLY when 100% payment is done. RAW DATA given only "
         "over hard drive after full payment. No backup kept after 3 months (without payment) or "
         "1 year (after payment). We are not responsible for data after the due date."),
        ("6.  TEAM / RESPECT / TIMING",
         "Our team is well-behaved and we expect the same. Please allow them space and food breaks "
         "during long events. We respect your time and will arrive on time — please provide "
         "the correct schedule 30 days prior. Events mentioned 1 hour before start are fine; "
         "2–3 hours prior counts as shooting time."),
    ]

    ty = H - 76
    for heading, body in terms:
        c.setFillColor(HexColor('#0D1D2E'))
        c.rect(36, ty - 18, TW, 18, fill=1, stroke=0)
        c.setFillColor(GOLD)
        c.rect(36, ty - 18, 3, 18, fill=1, stroke=0)
        c.setFont("Lato-Bold", 9)
        c.setFillColor(GOLD)
        c.drawString(44, ty - 11, heading)
        ty -= 20
        ty = left_wrap(body, 44, ty, font="Lato", size=8.5, color=CREAM,
                       max_w=TW - 12, gap=12)
        ty -= 12
        if ty < 46:
            break

    hline(36, GOLD, 0.4)

    c.showPage()

    # ══════════════════════════════════════════════════════════════════════════
    #  PAGE 4 — Conditions
    # ══════════════════════════════════════════════════════════════════════════
    navy_bg()
    draw_bokeh(seed=303, count=45, y_top=H, y_bot=0)

    draw_logo(W - 85, H - 10, 130)
    txt("CONDITIONS", W / 2, H - 50, size=26, color=WHITE,
        font="Lato-Light", align="center")
    hline(H - 63, GOLD, 1.0)

    conditions = [
        ("WE DON’T PROVIDE SERVICES FOR ANY EVENT NOT MENTIONED IN THE QUOTE.", True),
        ("Processed images & videos delivered within 60 days from the 2nd payment date.", False),
        ("FOOD COVERAGE done only if mentioned. Prior notification required.", False),
        ("WE DON’T PROVIDE “BANNERS”, “PLAY CARDS”, “FLEXIS” OR “INVITATIONS”.", True),
        ("Raw data provided on SmugMug ONLY AFTER 10 days of the wedding date.", False),
        ("HARD DRIVE — 2 × 2TB SSDs must be provided by the Client before the first event. "
         "We provide all raw and processed data over the hard drive provided by the client.", False),
    ]

    cy = H - 76
    for cond_text, is_bold in conditions:
        font_used = "Lato-Bold" if is_bold else "Lato"
        words = cond_text.split()
        lines_est = []
        ln = ""
        for ww in words:
            test = (ln + " " + ww).strip()
            if c.stringWidth(test, font_used, 9) <= TW - 52:
                ln = test
            else:
                lines_est.append(ln)
                ln = ww
        if ln:
            lines_est.append(ln)

        ch = max(32, len(lines_est) * 13 + 16)

        c.setFillColor(HexColor('#0F1E2E'))
        c.roundRect(36, cy - ch, TW, ch, 4, fill=1, stroke=0)
        c.setStrokeColor(GOLD)
        c.setLineWidth(0.3)
        c.roundRect(36, cy - ch, TW, ch, 4, fill=0, stroke=1)

        # Gold diamond bullet
        bx, by_b = 51, cy - ch / 2 + 2
        c.saveState()
        c.setFillColor(GOLD)
        c.translate(bx, by_b)
        c.rotate(45)
        c.rect(-4, -4, 8, 8, fill=1, stroke=0)
        c.restoreState()

        c.setFont(font_used, 9)
        c.setFillColor(WHITE if is_bold else CREAM)
        liy = cy - 14
        for lline in lines_est:
            c.drawString(62, liy, lline)
            liy -= 13

        cy -= ch + 9
        if cy < 46:
            break

    hline(36, GOLD, 0.4)

    c.showPage()

    # ══════════════════════════════════════════════════════════════════════════
    #  PAGE 5 — Thank You
    # ══════════════════════════════════════════════════════════════════════════
    navy_bg()

    # Full-bleed photo at top (thankyou_wide.jpg is 16:9)
    strip_h = H * 0.42
    try:
        c.drawImage(ImageReader(str(ASSET_DIR / "thankyou_wide.jpg")),
                    0, H - strip_h, W, strip_h, preserveAspectRatio=False)
    except Exception:
        draw_bokeh(seed=404, count=25, y_top=H, y_bot=H - strip_h)

    # Gradient fade from photo into navy
    fade_steps = 32
    fade_zone = strip_h * 0.45
    for i in range(fade_steps):
        alpha = (i / fade_steps) ** 1.6
        c.setFillColor(NAVY)
        c.setFillAlpha(alpha)
        bh = fade_zone / fade_steps
        c.rect(0, H - strip_h + i * bh, W, bh + 1, fill=1, stroke=0)
    c.setFillAlpha(1)

    # Bokeh in the navy section
    draw_bokeh(seed=505, count=38, y_top=H - strip_h + 30, y_bot=0)

    # Gold rule at boundary
    hline(H - strip_h + 6, GOLD, 1.5)

    # Content — centered in navy section below photo
    below_photo = H - strip_h

    txt("IT’S YOUR BIG DAY!", W / 2, below_photo - 28, size=22,
        color=GOLD, font="Lato-Light", align="center")
    txt("MAKE IT MORE MEMORABLE WITH US.", W / 2, below_photo - 52, size=13,
        color=CREAM, font="Lato-Light", align="center")

    hline(below_photo - 66, GOLD, 0.6)

    logo_b = draw_logo(W / 2, below_photo - 76, 230)

    hline(logo_b - 12, GOLD, 0.6)

    txt("THANK YOU!", W / 2, logo_b - 42, size=30, color=WHITE,
        font="Lato-Black", align="center")

    txt("We look forward to being a part of your story.",
        W / 2, logo_b - 66, size=10, color=MUTED, font="Lato-Italic", align="center")

    # Three thumbnail photos in a row at the very bottom
    ph_w = (TW - 20) / 3
    ph_h = ph_w * (2 / 3)   # 3:2 matches thumb*.jpg crops
    strip_bot_y = 50

    for pi, ph_name in enumerate(["thumb1.jpg", "thumb2.jpg", "thumb3.jpg"]):
        px = PAD + pi * (ph_w + 10)
        draw_photo(ph_name, px, strip_bot_y, ph_w, ph_h)
        c.setStrokeColor(GOLD)
        c.setLineWidth(0.6)
        c.rect(px, strip_bot_y, ph_w, ph_h, fill=0, stroke=1)

    hline(strip_bot_y - 6, GOLD, 0.5)
    txt(f"Quote prepared for {client_name}   •   {today}   •   Tales by DVS",
        W / 2, strip_bot_y - 20, size=7.5, color=MUTED, font="Lato-Italic", align="center")

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
