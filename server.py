from __future__ import annotations

import base64
import hashlib
import hmac
import json
import mimetypes
import os
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, unquote, urlparse


PROJECT_ROOT = Path(__file__).resolve().parent
DATA_DIR = PROJECT_ROOT / "data"
UPLOADS_DIR = PROJECT_ROOT / "uploads" / "slides"
DB_PATH = DATA_DIR / "lens_ledger.sqlite3"
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
SESSION_COOKIE = "lens_ledger_session"
SESSION_DAYS = 14
DEFAULT_SLIDES = [
    {"url": "/assets/feature-couple.jpg", "position": "center center"},
    {"url": "/assets/hero-wedding.jpg", "position": "center 38%"},
    {"url": "/assets/feature-color.jpg", "position": "center center"},
    {"url": "/assets/wall-paper.jpg", "position": "center 46%"},
]


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
            self.handle_signup()
            return
        if parsed.path == "/api/auth/login":
            self.handle_login()
            return
        if parsed.path == "/api/auth/logout":
            self.handle_logout()
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
                (user_id, json.dumps({"leads": [], "weddingPlans": [], "shootShareJobs": [], "editorJobs": []}), isoformat(now_utc())),
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

        state_json = row["state_json"] if row else json.dumps({"leads": [], "weddingPlans": [], "shootShareJobs": [], "editorJobs": []})
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
