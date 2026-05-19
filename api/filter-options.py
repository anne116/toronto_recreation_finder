from __future__ import annotations

import json
import urllib.parse
from http.server import BaseHTTPRequestHandler

from api._lib.ckan import build_activity_options
from api._lib.data import ACTIVITY_TAXONOMY, CATEGORY_DESCRIPTIONS


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        payload = {
            "categories": [
                {
                    "name": name,
                    "description": CATEGORY_DESCRIPTIONS.get(name, ""),
                    "activities": activities,
                }
                for name, activities in ACTIVITY_TAXONOMY.items()
            ],
            "activities": build_activity_options(limit=2000),
        }

        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))
        return
