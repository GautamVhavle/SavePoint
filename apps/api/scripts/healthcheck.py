"""Container HEALTHCHECK probe: exits 0 when the API answers on its own port."""

import os
import sys
import urllib.request

port = os.environ.get("PORT", "8000")
try:
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/v1/health", timeout=2) as response:
        sys.exit(0 if response.status == 200 else 1)
except Exception:
    sys.exit(1)
