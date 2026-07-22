from __future__ import annotations

import urllib.parse
from http.server import BaseHTTPRequestHandler

from api._lib.cities.toronto.ckan import (
    build_activity_options,
    build_centres_geojson_response,
    build_program_search_response,
)
from api._lib.cities.toronto.drop_in_taxonomy import ACTIVITY_TAXONOMY, CATEGORY_DESCRIPTIONS
from api._lib.http import send_json


def _parse_activity(params: dict) -> str | list[str] | None:
    activity_values = [value for value in params.get("activity", []) if value]
    return activity_values[0] if len(activity_values) == 1 else (activity_values or None)


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        resource = params.get("resource", [None])[0]

        if resource == "search":
            weekday = params.get("weekday", [None])[0] or None
            limit_value = params.get("limit", [None])[0]
            try:
                limit = int(limit_value) if limit_value not in (None, "") else 2000
            except (TypeError, ValueError):
                limit = 2000

            payload = build_program_search_response(
                category=params.get("category", [None])[0],
                activity=_parse_activity(params),
                district=params.get("district", [None])[0],
                age=params.get("age", [None])[0],
                time_of_day=params.get("time_of_day", [None])[0],
                weekday=weekday,
                limit=max(1, min(limit, 5000)),
            )
            send_json(self, payload)
            return

        if resource == "geojson":
            weekday = params.get("weekday", [None])[0] or None
            payload = build_centres_geojson_response(
                category=params.get("category", [None])[0],
                activity=_parse_activity(params),
                district=params.get("district", [None])[0],
                age=params.get("age", [None])[0],
                facility_type=params.get("facility_type", [None])[0],
                weekday=weekday,
            )
            send_json(self, payload)
            return

        if resource == "filter-options":
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
            send_json(self, payload)
            return

        send_json(self, {"detail": "Unknown resource"}, status=400)
