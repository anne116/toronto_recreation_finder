from __future__ import annotations

import json
import urllib.parse
from http.server import BaseHTTPRequestHandler

from api._lib.ckan import build_centres_geojson_response


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        weekday_value = params.get("weekday", [None])[0]

        try:
            weekday = int(weekday_value) if weekday_value not in (None, "") else None
        except (TypeError, ValueError):
            weekday = None

        payload = build_centres_geojson_response(
            activity=params.get("activity", [None])[0],
            district=params.get("district", [None])[0],
            facility_type=params.get("facility_type", [None])[0],
            weekday=weekday,
        )

        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))
        return
