from __future__ import annotations

from http.server import BaseHTTPRequestHandler

from api._lib.ckan import CKAN_BASE_URL, PACKAGE_ID, DROP_IN_DATASTORE_ID
from api._lib.http import send_json

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        send_json(self, {}, status=204)

    def do_GET(self):
        send_json(
            self,
            {
                "ok": True,
                "service": "toronto-recreation-finder-api",
                "step": "2.1",
                "data_source": {
                    "provider": "toronto-open-data-ckan",
                    "base_url": CKAN_BASE_URL,
                    "package_id": PACKAGE_ID,
                    "drop_in_datastore_id": DROP_IN_DATASTORE_ID,
                },
            },
            status=200,
        )