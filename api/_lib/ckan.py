from __future__ import annotations

import json
import ssl
import urllib.parse
import urllib.request
from datetime import date, datetime

CKAN_BASE_URL = "https://ckan0.cf.opendata.inter.prod-toronto.ca"
PACKAGE_ID = "registered-programs-and-drop-in-courses-offering"
DROP_IN_DATASTORE_ID = "c99ec04f-4540-482c-9ee4-efb38774eab4"
LOCATIONS_DATASTORE_ID = "f23ac1ad-6f46-4b59-811f-eb34be9b1f7a"
PARKS_GEOJSON_URL = (
    "https://ckan0.cf.opendata.inter.prod-toronto.ca/"
    "dataset/cbea3a67-9168-4c6d-8186-16ac1a795b5b/"
    "resource/f6cdcd50-da7b-4ede-8e60-c3cdba70b559/download/"
    "parks-and-recreation-facilities-4326.geojson"
)

SSL_CONTEXT = ssl.create_default_context()

LOCATION_CACHE = None
COORDINATE_CACHE = None

DISTRICT_NORMALIZATION = {
    "Toronto East York": "Toronto and East York",
}


def is_missing(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        stripped = value.strip()
        return stripped == "" or stripped.lower() == "none"
    return False


def fetch_json(url: str, params: dict | None = None) -> dict:
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=45, context=SSL_CONTEXT) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_all_datastore_rows(resource_id: str, filters: dict | None = None, page_size: int = 5000) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    while True:
        params = {
            "id": resource_id,
            "limit": page_size,
            "offset": offset,
        }
        if filters:
            params["filters"] = json.dumps(filters)

        payload = fetch_json(f"{CKAN_BASE_URL}/api/3/action/datastore_search", params=params)
        result = payload["result"]
        batch = result.get("records", [])
        rows.extend(batch)
        offset += len(batch)
        if len(batch) < page_size:
            break
    return rows


def normalize_district(value: str | None) -> str | None:
    if is_missing(value):
        return None
    return DISTRICT_NORMALIZATION.get(value, value)


def build_address(location_row: dict) -> str | None:
    parts = [
        str(location_row.get("Street No") or "").strip(),
        str(location_row.get("Street No Suffix") or "").strip(),
        str(location_row.get("Street Name") or "").strip(),
        str(location_row.get("Street Type") or "").strip(),
        str(location_row.get("Street Direction") or "").strip(),
    ]
    address = " ".join(part for part in parts if part and part.lower() != "none")
    postal = str(location_row.get("Postal Code") or "").strip()
    if postal.lower() == "none":
        postal = ""
    if address and postal:
        return f"{address}, {postal}"
    return address or None


def format_time(hour_value: int | str | None, minute_value: int | str | None) -> str | None:
    if hour_value in (None, "") or minute_value in (None, ""):
        return None
    hour = int(hour_value)
    minute = int(minute_value)
    return datetime(2000, 1, 1, hour, minute).strftime("%-I:%M %p")


def is_current(last_date_value: str | None) -> bool:
    if not last_date_value:
        return True
    try:
        last_date = datetime.strptime(last_date_value, "%Y-%m-%d").date()
    except ValueError:
        return True
    return last_date >= date.today()


def matches_age(age_min: int | str | None, age_max: int | str | None, age_bucket: str | None) -> bool:
    if not age_bucket:
        return True

    min_age = int(float(age_min)) if age_min not in (None, "") else 0
    max_age = None if age_max in (None, "") else int(float(age_max))

    bucket_ranges = {
        "young": (0, 12),
        "teen": (13, 18),
        "adult": (19, 65),
        "senior": (55, 200),
    }
    bucket_min, bucket_max = bucket_ranges[age_bucket]
    effective_max = max_age if max_age is not None else 200
    return not (effective_max < bucket_min or min_age > bucket_max)


def matches_time_of_day(start_hour: int | str | None, weekday: int | None, time_of_day: str | None) -> bool:
    if not time_of_day:
        return True
    if time_of_day == "weekend":
        return weekday in (5, 6)
    if start_hour in (None, ""):
        return False

    hour = int(start_hour)
    if time_of_day == "morning":
        return 6 <= hour < 12
    if time_of_day == "afternoon":
        return 12 <= hour < 17
    if time_of_day == "evening":
        return 17 <= hour <= 22
    return True


def load_location_cache() -> dict[int, dict]:
    global LOCATION_CACHE
    if LOCATION_CACHE is not None:
        return LOCATION_CACHE

    rows = fetch_all_datastore_rows(LOCATIONS_DATASTORE_ID)
    LOCATION_CACHE = {}
    for row in rows:
        location_id = row.get("Location ID")
        if location_id in (None, ""):
            continue
        LOCATION_CACHE[int(location_id)] = {
            **row,
            "District": normalize_district(row.get("District")),
        }
    return LOCATION_CACHE


def load_coordinate_cache() -> dict[int, dict]:
    global COORDINATE_CACHE
    if COORDINATE_CACHE is not None:
        return COORDINATE_CACHE

    geojson = fetch_json(PARKS_GEOJSON_URL)
    cache: dict[int, dict] = {}
    for feature in geojson.get("features", []):
        props = feature.get("properties", {})
        geometry = feature.get("geometry", {})
        location_id = props.get("LOCATIONID")
        coords = geometry.get("coordinates") or []
        if not location_id or not coords:
            continue
        try:
            lon, lat = coords[0]
            cache[int(location_id)] = {
                "lat": lat,
                "lon": lon,
                "phone": None if props.get("PHONE") in (None, "", "None") else props.get("PHONE"),
                "url": props.get("URL"),
                "address": props.get("ADDRESS"),
                "facility_type": props.get("TYPE"),
            }
        except (ValueError, TypeError, IndexError):
            continue

    COORDINATE_CACHE = cache
    return COORDINATE_CACHE


def build_activity_options(*, program_type: str | None = None, limit: int = 50) -> list[dict]:
    if program_type not in (None, "dropin"):
        return []

    rows = fetch_all_datastore_rows(DROP_IN_DATASTORE_ID)
    counts: dict[str, dict[str, object]] = {}

    for row in rows:
        raw_title = row.get("Course Title")
        if is_missing(raw_title):
            continue
        activity = str(raw_title).strip()
        entry = counts.setdefault(
            activity,
            {
                "activity": activity,
                "count": 0,
                "locations": set(),
            },
        )
        entry["count"] = int(entry["count"]) + 1

        location_id_value = row.get("Location ID")
        try:
            if not is_missing(location_id_value):
                cast_locations = entry["locations"]
                assert isinstance(cast_locations, set)
                cast_locations.add(int(location_id_value))
        except (TypeError, ValueError):
            continue

    result = [
        {
            "activity": item["activity"],
            "count": item["count"],
            "locations": len(item["locations"]),
        }
        for item in counts.values()
    ]
    result.sort(key=lambda item: (-int(item["count"]), str(item["activity"])))
    return result[:limit]


def build_district_options() -> list[dict]:
    locations = load_location_cache()
    counts: dict[str, int] = {}

    for location in locations.values():
        district = normalize_district(location.get("District"))
        if is_missing(district):
            continue
        assert district is not None
        counts[district] = counts.get(district, 0) + 1

    return [
        {"district": district, "location_count": counts[district]}
        for district in sorted(counts.keys())
    ]


def build_facility_type_options() -> list[dict]:
    locations = load_location_cache()
    coordinates = load_coordinate_cache()
    counts: dict[str, int] = {}

    for location_id, location in locations.items():
        coord = coordinates.get(location_id, {})
        facility_type = coord.get("facility_type") or location.get("Location Type")
        if is_missing(facility_type):
            continue
        facility_type_str = str(facility_type).strip()
        counts[facility_type_str] = counts.get(facility_type_str, 0) + 1

    result = [
        {"facility_type": facility_type, "count": counts[facility_type]}
        for facility_type in counts.keys()
    ]
    result.sort(key=lambda item: (-int(item["count"]), str(item["facility_type"])))
    return result


def build_program_search_response(
    *,
    activity: str | None = None,
    district: str | None = None,
    age: str | None = None,
    time_of_day: str | None = None,
    weekday: int | None = None,
    limit: int = 2000,
) -> dict:
    drop_in_rows = fetch_all_datastore_rows(DROP_IN_DATASTORE_ID)
    locations = load_location_cache()
    coordinates = load_coordinate_cache()

    programs: list[dict] = []

    for row in drop_in_rows:
        raw_title = str(row.get("Course Title") or "").strip()
        if not raw_title:
            continue
        if not is_current(row.get("Last Date")):
            continue
        if activity and activity.lower() not in raw_title.lower():
            continue

        row_weekday = row.get("Weekday")
        try:
            row_weekday_int = int(row_weekday) if row_weekday not in (None, "") else None
        except (TypeError, ValueError):
            row_weekday_int = None

        if weekday is not None and row_weekday_int != weekday:
            continue
        if not matches_age(row.get("Age Min"), row.get("Age Max"), age):
            continue
        if not matches_time_of_day(row.get("Start Hour"), row_weekday_int, time_of_day):
            continue

        location_id_value = row.get("Location ID")
        if location_id_value in (None, ""):
            continue
        try:
            location_id = int(location_id_value)
        except (TypeError, ValueError):
            continue

        location = locations.get(location_id)
        if not location:
            continue

        normalized_district = normalize_district(location.get("District"))
        if district and normalized_district != district:
            continue

        coord = coordinates.get(location_id, {})

        programs.append(
            {
                "id": row.get("_id"),
                "location_id": location_id,
                "course_title": raw_title,
                "weekday": row_weekday_int,
                "day_of_week": row.get("DayOftheWeek"),
                "start_time": format_time(row.get("Start Hour"), row.get("Start Minute")),
                "end_time": format_time(row.get("End Hour"), row.get("End Min")),
                "age_min": row.get("Age Min"),
                "age_max": row.get("Age Max"),
                "location_name": location.get("Location Name"),
                "asset_name": location.get("Asset Name"),
                "address": build_address(location) or coord.get("address"),
                "district": normalized_district,
                "facility_type": coord.get("facility_type") or location.get("Location Type"),
                "accessibility": location.get("Accessibility"),
                "phone": coord.get("phone"),
                "url": coord.get("url"),
                "lon": coord.get("lon"),
                "lat": coord.get("lat"),
            }
        )

        if len(programs) >= limit:
            break

    programs.sort(
        key=lambda item: (
            item.get("weekday") if item.get("weekday") is not None else 99,
            item.get("start_time") or "",
            item.get("location_name") or "",
        )
    )

    return {
        "program_type": "dropin",
        "count": len(programs),
        "filters": {
            "activity": activity,
            "age": age,
            "weekday": weekday,
            "district": district,
            "time_of_day": time_of_day,
        },
        "programs": programs,
    }
