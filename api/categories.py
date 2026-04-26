from __future__ import annotations

from http.server import BaseHTTPRequestHandler

from api._lib.http import send_json
from api._lib.data import CATEGORY_DESCRIPTIONS, ACTIVITY_TAXONOMY

class handler(BaseHTTPRequestHandler):
    def do_OPTION(self):
        send_json(self, {}, status=204)

    def do_GET(self):
        send_json(
            self,
            {
                "categories": [
                    {
                        "name": name,
                        "description": CATEGORY_DESCRIPTIONS.get(name, ""),
                        "activities": activities,
                    }
                    for name, activities in ACTIVITY_TAXONOMY.items()
                ]
            },
        status=200
        )