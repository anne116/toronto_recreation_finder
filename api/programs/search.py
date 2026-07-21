from __future__ import annotations

import json
import urllib.parse
from http.server import BaseHTTPRequestHandler

from api._lib.cities.toronto.ckan import build_program_search_response


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        weekday = params.get("weekday", [None])[0] or None
        
        limit_value = params.get("limit", [None])[0]
        try:
            limit = int(limit_value) if limit_value not in (None, "") else 2000
        except (TypeError, ValueError):
            limit = 2000

        activity_values = [value for value in params.get("activity", []) if value]
        activity = activity_values[0] if len(activity_values) == 1 else (activity_values or None)

        payload = build_program_search_response(
            category=params.get("category", [None])[0],
            activity=activity,
            district=params.get("district", [None])[0],
            age=params.get("age", [None])[0],
            time_of_day=params.get("time_of_day", [None])[0],
            weekday=weekday,
            limit=max(1, min(limit, 5000)),
        )

        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))
        return
