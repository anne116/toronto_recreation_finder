from __future__ import annotations

import json
import urllib.parse
from http.server import BaseHTTPRequestHandler

from api._lib.ckan import build_centres_geojson_response


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        weekday = params.get("weekday", [None])[0] or None

        payload = build_centres_geojson_response(
            category=params.get("category", [None])[0],
            activity=params.get("activity", [None])[0],
            district=params.get("district", [None])[0],
            age=params.get("age", [None])[0],
            facility_type=params.get("facility_type", [None])[0],
            weekday=weekday,
        )

        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))
        return
