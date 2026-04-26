from __future__ import annotations

import json
import urllib.parse
from http.server import BaseHTTPRequestHandler

from api._lib.ckan import build_centre_detail


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        centre_id = params.get("centre_id", [None])[0]
        payload = build_centre_detail(centre_id) if centre_id is not None else None

        if payload is None:
            self.send_response(404)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"detail": "Location not found"}).encode("utf-8"))
            return

        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))
        return
