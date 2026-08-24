#!/usr/bin/env python3
"""One-time Twitch device authorization for public (secretless) apps.

Run:  uv run python scripts/twitch_device_auth.py
Then open the printed URL on any device logged into Twitch, enter the code,
and approve. This script polls and prints the env line to paste into
apps/api/.env as TWITCH_USER_TOKEN=...
"""

import os
import sys
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

CLIENT_ID = os.environ.get("TWITCH_CLIENT_ID", "")
API = "https://id.twitch.tv/oauth2"


def post(path: str, params: dict) -> dict:
    body = urlencode(params).encode()
    req = Request(f"{API}{path}", data=body, headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urlopen(req, timeout=15) as res:
        return json_loads(res.read())


def json_loads(raw: bytes) -> dict:
    import json

    return json.loads(raw.decode())


def main() -> None:
    if not CLIENT_ID:
        sys.exit("Set TWITCH_CLIENT_ID (or edit CLIENT_ID in this script).")
    start = post("/device", {"client_id": CLIENT_ID, "scopes": "user:read:email"})
    print(f"\n1. Open:  {start['verification_uri']}")
    print(f"2. Enter code:  {start['user_code']}\n3. Approve access. Waiting (expires in {start['expires_in']//60} min)...")

    deadline = time.time() + start["expires_in"]
    interval = max(int(start.get("interval", 5)), 2)
    while time.time() < deadline:
        time.sleep(interval)
        try:
            done = post("/token", {
                "client_id": CLIENT_ID,
                "device_code": start["device_code"],
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            })
        except Exception as exc:  # 400 while pending
            if "authorization_pending" in str(exc) or "slow_down" in str(exc):
                continue
            print("poll error:", exc)
            continue
        print("\nApproved. Add this line to apps/api/.env:\n")
        print(f"TWITCH_USER_TOKEN={done['access_token']}")
        return
    sys.exit("Timed out waiting for approval.")


if __name__ == "__main__":
    main()
