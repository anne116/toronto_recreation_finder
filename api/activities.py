from __future__ import annotations

import json
import urllib.parse
from http.server import BaseHTTPRequestHandler

from api._lib.ckan import build_activity_options


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        program_type = params.get("program_type", [None])[0]
        limit_value = params.get("limit", [None])[0]

        try:
            limit = int(limit_value) if limit_value not in (None, "") else 50
        except (TypeError, ValueError):
            limit = 50

        payload = build_activity_options(
            program_type=program_type,
            limit=max(1, min(limit, 2000)),
        )

        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))
        return
