"""Password hashing and signed-token helpers (standard library only).

Avoids third-party crypto dependencies: passwords use PBKDF2-HMAC-SHA256 with a
per-user salt; auth tokens are HMAC-SHA256 signed payloads carrying the username
and an expiry timestamp.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time

_PBKDF2_ITERATIONS = 200_000


def hash_password(password: str) -> str:
    """Return a self-describing ``pbkdf2_sha256$iters$salt$hash`` string."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ITERATIONS)
    return (
        f"pbkdf2_sha256${_PBKDF2_ITERATIONS}$"
        f"{base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"
    )


def verify_password(password: str, stored: str) -> bool:
    """Constant-time check of ``password`` against a stored hash string."""
    try:
        algo, iters, salt_b64, hash_b64 = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iters))
        return hmac.compare_digest(dk, expected)
    except (ValueError, TypeError):
        return False


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _b64url_decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def create_token(username: str, secret: str, ttl: int) -> str:
    """Create an HMAC-signed token of the form ``<payload>.<signature>``."""
    payload = {"sub": username, "exp": int(time.time()) + ttl}
    raw = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return f"{raw}.{sig}"


def verify_token(token: str, secret: str) -> str | None:
    """Return the username if the token is valid and unexpired, else ``None``."""
    try:
        raw, sig = token.split(".")
    except ValueError:
        return None
    expected = hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return None
    try:
        payload = json.loads(_b64url_decode(raw))
    except (ValueError, TypeError):
        return None
    if not isinstance(payload, dict) or "sub" not in payload or "exp" not in payload:
        return None
    if int(payload["exp"]) < int(time.time()):
        return None
    return str(payload["sub"])
