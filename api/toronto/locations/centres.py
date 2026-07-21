from __future__ import annotations

import urllib.parse
from http.server import BaseHTTPRequestHandler

from api._lib.cities.toronto.ckan import (
    build_centre_detail,
    build_district_options,
    build_facility_type_options,
)
from api._lib.http import send_json


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        centre_id = params.get("centre_id", [None])[0]
        resource = params.get("resource", [None])[0]

        if centre_id is not None:
            payload = build_centre_detail(centre_id)
            if payload is None:
                send_json(self, {"detail": "Location not found"}, status=404)
                return
            send_json(self, payload)
            return

        if resource == "districts":
            send_json(self, build_district_options())
            return

        if resource == "facility-types":
            send_json(self, build_facility_type_options())
            return

        send_json(self, {"detail": "Unknown resource"}, status=400)
