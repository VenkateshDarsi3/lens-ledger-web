from __future__ import annotations

import base64
import hashlib
import hmac
import json
import mimetypes
import os
import secrets
import smtplib
import sqlite3
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlparse


PROJECT_ROOT = Path(__file__).resolve().parent
DATA_DIR = PROJECT_ROOT / "data"
UPLOADS_DIR = PROJECT_ROOT / "uploads" / "slides"
DB_PATH = DATA_DIR / "lens_ledger.sqlite3"
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
SESSION_COOKIE = "lens_ledger_session"
SESSION_DAYS = 14
RESET_TOKEN_HOURS = 2
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


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


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
    website_note = "Public website enquiry."
    combined_notes = f"{website_note} {notes}".strip()

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


def password_hash(password: str, salt: bytes | None = None) -> str:
    salt_bytes = salt or secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, 120_000)
    return f"{base64.b64encode(salt_bytes).decode()}:{base64.b64encode(derived).decode()}"


def verify_password(password: str, stored_hash: str) -> bool:
    salt_b64, derived_b64 = stored_hash.split(":", 1)
    expected = password_hash(password, base64.b64decode(salt_b64))
    return hmac.compare_digest(expected, stored_hash)


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

        self.send_error(HTTPStatus.NOT_FOUND, "Route not found.")

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)

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

        self.send_json(
            {"ok": True, "message": "Thank you. Your enquiry has been sent."},
            status=HTTPStatus.CREATED,
        )

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


def main() -> None:
    ensure_database()
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    server = ThreadingHTTPServer((host, port), LensLedgerHandler)
    print(f"Lens Ledger web server running at http://{host}:{port}")
    print(f"Database file: {DB_PATH}")
    print(f"Hero slideshow folder: {UPLOADS_DIR}")
    server.serve_forever()


if __name__ == "__main__":
    main()
