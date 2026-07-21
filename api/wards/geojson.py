from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler

from api._lib.cities.toronto.ckan import build_wards_geojson_response


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        payload = build_wards_geojson_response()

        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))
        return
