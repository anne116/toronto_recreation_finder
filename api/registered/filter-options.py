from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler

from api._lib.ckan import build_registered_filter_options_response


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        payload = build_registered_filter_options_response()

        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))
        return
