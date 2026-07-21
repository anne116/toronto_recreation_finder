from __future__ import annotations

import json
import urllib.parse
from http.server import BaseHTTPRequestHandler

from api._lib.cities.toronto.ckan import build_registered_centres_geojson_response


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        start_month = params.get("start_month", [None])[0] or None

        activity_values = [value for value in params.get("activity", []) if value]
        activity = activity_values[0] if len(activity_values) == 1 else (activity_values or None)

        payload = build_registered_centres_geojson_response(
            category=params.get("category", [None])[0],
            activity=activity,
            district=params.get("district", [None])[0],
            age=params.get("age", [None])[0],
            start_month=start_month,
        )

        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))
        return
