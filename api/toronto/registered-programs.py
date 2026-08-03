from __future__ import annotations

import urllib.parse
from http.server import BaseHTTPRequestHandler

from api._lib.cities.toronto.ckan import (
    build_registered_centres_geojson_response,
    build_registered_filter_options_response,
    build_registered_program_search_response,
)
from api._lib.http import send_json


def _parse_activity(params: dict) -> str | list[str] | None:
    activity_values = [value for value in params.get("activity", []) if value]
    return activity_values[0] if len(activity_values) == 1 else (activity_values or None)


def _parse_location_ids(params: dict) -> set[int] | None:
    raw = params.get("location_ids", [None])[0]
    if not raw:
        return None
    ids: set[int] = set()
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            ids.add(int(part))
        except (TypeError, ValueError):
            continue
    return ids or None


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        resource = params.get("resource", [None])[0]

        if resource == "search":
            limit_value = params.get("limit", [None])[0]
            try:
                limit = int(limit_value) if limit_value not in (None, "") else 2000
            except (TypeError, ValueError):
                limit = 2000

            location_id_value = params.get("location_id", [None])[0]
            try:
                location_id = int(location_id_value) if location_id_value not in (None, "") else None
            except (TypeError, ValueError):
                location_id = None

            payload = build_registered_program_search_response(
                category=params.get("category", [None])[0],
                activity=_parse_activity(params),
                district=params.get("district", [None])[0],
                age=params.get("age", [None])[0],
                start_month=params.get("start_month", [None])[0] or None,
                location_id=location_id,
                location_ids=_parse_location_ids(params),
                limit=max(1, min(limit, 5000)),
            )
            send_json(self, payload)
            return

        if resource == "geojson":
            location_id_value = params.get("location_id", [None])[0]
            try:
                location_id = int(location_id_value) if location_id_value not in (None, "") else None
            except (TypeError, ValueError):
                location_id = None

            payload = build_registered_centres_geojson_response(
                category=params.get("category", [None])[0],
                activity=_parse_activity(params),
                district=params.get("district", [None])[0],
                age=params.get("age", [None])[0],
                start_month=params.get("start_month", [None])[0] or None,
                location_id=location_id,
            )
            send_json(self, payload)
            return

        if resource == "filter-options":
            payload = build_registered_filter_options_response()
            send_json(self, payload)
            return

        send_json(self, {"detail": "Unknown resource"}, status=400)
