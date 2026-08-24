#!/usr/bin/env python3
"""Poll the pending Twitch device grant, save TWITCH_USER_TOKEN, then run a
live IGDB smoke test (search, details, banner mapping) against real payloads."""

import json
import re
import sys
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

CLIENT_ID = "qhmnp3b6ag0w4fvhb8k9mezp96i6r3"
API = "https://id.twitch.tv/oauth2"
ENV = Path(__file__).resolve().parent.parent / ".env"


def post(url: str, params: dict) -> dict:
    body = urlencode(params).encode()
    req = Request(url, data=body)
    with urlopen(req, timeout=15) as res:
        return json.loads(res.read().decode())


def save_env_token(token: str) -> None:
    text = ENV.read_text() if ENV.exists() else ""
    line = f"TWITCH_USER_TOKEN={token}"
    if re.search(r"^TWITCH_USER_TOKEN=.*$", text, flags=re.M):
        text = re.sub(r"^TWITCH_USER_TOKEN=.*$", line, text, flags=re.M)
    else:
        text = (text.rstrip() + "\n" if text.strip() else "") + line + "\n"
    ENV.write_text(text)


def banner_url(game: dict) -> str | None:
    image_id = (
        (game.get("artworks") or [{}])[0].get("image_id")
        or (game.get("screenshots") or [{}])[0].get("image_id")
        or (game.get("cover") or {}).get("image_id")
    )
    return f"https://images.igdb.com/igdb/image/upload/t_1080p/{image_id}.jpg" if image_id else None


def main() -> None:
    device = json.loads(Path("/tmp/tw_device.json").read_text())
    deadline = time.time() + int(device["expires_in"])
    interval = max(int(device.get("interval", 5)), 3)

    token = None
    while time.time() < deadline:
        try:
            done = post(f"{API}/token", {
                "client_id": CLIENT_ID,
                "device_code": device["device_code"],
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            })
            token = done["access_token"]
            break
        except HTTPError as exc:
            detail = exc.read().decode()
            if "authorization_pending" in detail:
                time.sleep(interval)
                continue
            if "slow_down" in detail:
                interval += 5
                time.sleep(interval)
                continue
            print("POLL-ERROR", detail[:200])
            sys.exit(1)
    if not token:
        print("EXPIRED: approval window closed; restart when ready.")
        sys.exit(1)

    save_env_token(token)
    print("TOKEN-SAVED to apps/api/.env")

    # ---- live IGDB smoke test ----
    def igdb(endpoint: str, query: str) -> list:
        req = Request(
            f"https://api.igdb.com/v4/{endpoint}",
            data=query.encode(),
            headers={"Client-ID": CLIENT_ID, "Authorization": f"Bearer {token}"},
        )
        with urlopen(req, timeout=15) as res:
            return json.loads(res.read().decode())

    fields = "id,name,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,genres.name,platforms.name"
    results = igdb("games", f'search "outer wilds"; fields {fields}; limit 3;')
    print(f"LIVE-SEARCH ok: {len(results)} results")
    for g in results:
        url = banner_url(g)
        frd = g.get("first_release_date"); year = time.strftime("%Y", time.gmtime(int(frd))) if frd else "?"
        genres = ",".join(x["name"] for x in g.get("genres", []))
        platforms = ",".join(x["name"] for x in g.get("platforms", [])[:4])
        status = "?"
        if url:
            try:
                req = Request(url, method="HEAD")
                with urlopen(req, timeout=10) as res:
                    status = str(res.status)
            except Exception as exc:
                status = f"ERR {exc}"
        print(f"  - {g['name']} ({year}) [{genres}] platforms[{platforms}] banner={status}")

    details = igdb("games", f'fields {fields},summary; where id = {results[0]["id"]};')
    d0 = details[0]
    print(f"LIVE-DETAILS ok: summary {len(d0.get('summary', ''))} chars")
    print("ALL-LIVE-CHECKS-PASSED")


if __name__ == "__main__":
    main()
