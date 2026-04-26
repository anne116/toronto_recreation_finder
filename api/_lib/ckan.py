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
FACILITY_CACHE = None

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


def clean_optional_string(value: object) -> str | None:
    if is_missing(value):
        return None
    return str(value).strip()


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


def format_time_hms(hour_value: int | str | None, minute_value: int | str | None) -> str | None:
    if hour_value in (None, "") or minute_value in (None, ""):
        return None
    hour = int(hour_value)
    minute = int(minute_value)
    return f"{hour:02d}:{minute:02d}:00"


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


def parse_int(value: object) -> int | None:
    if is_missing(value):
        return None
    try:
        return int(str(value))
    except (TypeError, ValueError):
        return None


def load_location_cache() -> dict[int, dict]:
    global LOCATION_CACHE
    if LOCATION_CACHE is not None:
        return LOCATION_CACHE

    rows = fetch_all_datastore_rows(LOCATIONS_DATASTORE_ID)
    LOCATION_CACHE = {}
    for row in rows:
        location_id = parse_int(row.get("Location ID"))
        if location_id is None:
            continue
        LOCATION_CACHE[location_id] = {
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
        location_id = parse_int(props.get("LOCATIONID"))
        coords = geometry.get("coordinates") or []
        if location_id is None or not coords:
            continue
        try:
            lon, lat = coords[0]
        except (TypeError, IndexError, ValueError):
            continue

        existing = cache.get(location_id)
        if existing and existing.get("url") and existing.get("phone"):
            continue

        cache[location_id] = {
            "lat": lat,
            "lon": lon,
            "phone": clean_optional_string(props.get("PHONE")),
            "url": clean_optional_string(props.get("URL")),
            "address": clean_optional_string(props.get("ADDRESS")),
            "facility_type": clean_optional_string(props.get("TYPE")),
        }

    COORDINATE_CACHE = cache
    return COORDINATE_CACHE


def load_facility_cache() -> dict[int, list[dict]]:
    global FACILITY_CACHE
    if FACILITY_CACHE is not None:
        return FACILITY_CACHE

    geojson = fetch_json(PARKS_GEOJSON_URL)
    cache: dict[int, list[dict]] = {}
    for feature in geojson.get("features", []):
        props = feature.get("properties", {})
        location_id = parse_int(props.get("LOCATIONID"))
        if location_id is None:
            continue

        facility_type = clean_optional_string(props.get("TYPE"))
        asset_name = clean_optional_string(props.get("ASSET_NAME"))
        if facility_type is None and asset_name is None:
            continue

        cache.setdefault(location_id, []).append(
            {
                "facility_type": facility_type or "Unknown",
                "asset_name": asset_name,
                "permit": None,
                "facility_rating": None,
            }
        )

    FACILITY_CACHE = cache
    return FACILITY_CACHE


def location_name(location: dict | None) -> str | None:
    if not location:
        return None
    return clean_optional_string(location.get("Location Name")) or clean_optional_string(location.get("Asset Name"))


def location_facility_type(location: dict | None, coord: dict | None = None) -> str | None:
    if coord:
        from_coord = clean_optional_string(coord.get("facility_type"))
        if from_coord:
            return from_coord
    if not location:
        return None
    return clean_optional_string(location.get("Location Type"))


def location_matches_facility_type(location_id: int, filter_value: str | None) -> bool:
    if is_missing(filter_value):
        return True

    needle = str(filter_value).strip().lower()
    location = load_location_cache().get(location_id)
    coord = load_coordinate_cache().get(location_id)
    facilities = load_facility_cache().get(location_id, [])

    candidates: list[str] = []
    for value in (
        location_facility_type(location, coord),
        clean_optional_string(location.get("Location Type")) if location else None,
    ):
        if value:
            candidates.append(value)

    for facility in facilities:
        value = clean_optional_string(facility.get("facility_type"))
        if value:
            candidates.append(value)

    return any(needle in candidate.lower() for candidate in candidates)


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

        location_id = parse_int(row.get("Location ID"))
        if location_id is not None:
            cast_locations = entry["locations"]
            assert isinstance(cast_locations, set)
            cast_locations.add(location_id)

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
        facility_type = location_facility_type(location, coord)
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

        row_weekday_int = parse_int(row.get("Weekday"))
        if weekday is not None and row_weekday_int != weekday:
            continue
        if not matches_age(row.get("Age Min"), row.get("Age Max"), age):
            continue
        if not matches_time_of_day(row.get("Start Hour"), row_weekday_int, time_of_day):
            continue

        location_id = parse_int(row.get("Location ID"))
        if location_id is None:
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
                "day_of_week": clean_optional_string(row.get("DayOftheWeek")),
                "start_time": format_time(row.get("Start Hour"), row.get("Start Minute")),
                "end_time": format_time(row.get("End Hour"), row.get("End Min")),
                "age_min": row.get("Age Min"),
                "age_max": row.get("Age Max"),
                "location_name": location_name(location),
                "asset_name": clean_optional_string(location.get("Asset Name")),
                "address": build_address(location) or clean_optional_string(coord.get("address")),
                "district": normalized_district,
                "facility_type": location_facility_type(location, coord),
                "accessibility": clean_optional_string(location.get("Accessibility")),
                "phone": clean_optional_string(coord.get("phone")),
                "url": clean_optional_string(coord.get("url")),
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


def build_centres_geojson_response(
    *,
    activity: str | None = None,
    district: str | None = None,
    facility_type: str | None = None,
    weekday: int | None = None,
) -> dict:
    drop_in_rows = fetch_all_datastore_rows(DROP_IN_DATASTORE_ID)
    locations = load_location_cache()
    coordinates = load_coordinate_cache()

    grouped: dict[int, dict] = {}

    for row in drop_in_rows:
        raw_title = clean_optional_string(row.get("Course Title"))
        if raw_title is None:
            continue
        if not is_current(row.get("Last Date")):
            continue
        if activity and activity.lower() not in raw_title.lower():
            continue

        row_weekday_int = parse_int(row.get("Weekday"))
        if weekday is not None and row_weekday_int != weekday:
            continue

        location_id = parse_int(row.get("Location ID"))
        if location_id is None:
            continue

        location = locations.get(location_id)
        coord = coordinates.get(location_id)
        if not location or not coord:
            continue

        normalized_district = normalize_district(location.get("District"))
        if district and normalized_district != district:
            continue
        if not location_matches_facility_type(location_id, facility_type):
            continue

        bucket = grouped.setdefault(
            location_id,
            {
                "id": location_id,
                "name": location_name(location),
                "address": build_address(location) or clean_optional_string(coord.get("address")),
                "district": normalized_district,
                "facility_type": location_facility_type(location, coord),
                "dropin_count": 0,
                "registered_count": 0,
                "total_programs": 0,
                "lon": coord.get("lon"),
                "lat": coord.get("lat"),
            },
        )
        bucket["dropin_count"] += 1
        bucket["total_programs"] += 1

    features = []
    centres = sorted(
        grouped.values(),
        key=lambda item: (-int(item["total_programs"]), str(item["name"] or "")),
    )
    for centre in centres:
        lon = centre.get("lon")
        lat = centre.get("lat")
        if lon is None or lat is None:
            continue
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat],
                },
                "properties": {
                    "id": centre["id"],
                    "name": centre["name"],
                    "address": centre["address"],
                    "district": centre["district"],
                    "facility_type": centre["facility_type"],
                    "dropin_count": centre["dropin_count"],
                    "registered_count": centre["registered_count"],
                    "total_programs": centre["total_programs"],
                },
            }
        )

    return {
        "type": "FeatureCollection",
        "features": features,
    }


def build_centre_detail(location_id: str | int) -> dict | None:
    location_id_int = parse_int(location_id)
    if location_id_int is None:
        return None

    locations = load_location_cache()
    coordinates = load_coordinate_cache()
    location = locations.get(location_id_int)
    coord = coordinates.get(location_id_int, {})
    if not location:
        return None

    return {
        "id": location_id_int,
        "name": location_name(location),
        "asset_name": clean_optional_string(location.get("Asset Name")),
        "location_name": clean_optional_string(location.get("Location Name")),
        "address": build_address(location) or clean_optional_string(coord.get("address")),
        "district": normalize_district(location.get("District")),
        "facility_type": location_facility_type(location, coord),
        "amenities": clean_optional_string(location.get("Amenities")),
        "accessibility": clean_optional_string(location.get("Accessibility")),
        "intersection": clean_optional_string(location.get("Nearest Intersection")),
        "ttc_information": clean_optional_string(location.get("TTC Information")),
        "phone": clean_optional_string(coord.get("phone")),
        "url": clean_optional_string(coord.get("url")),
        "description": clean_optional_string(location.get("Location Description")),
        "postal_code": clean_optional_string(location.get("Postal Code")),
        "lon": coord.get("lon"),
        "lat": coord.get("lat"),
    }


def build_centre_programs(location_id: str | int, *, age: str | None = None) -> dict | None:
    location_id_int = parse_int(location_id)
    if location_id_int is None:
        return None

    locations = load_location_cache()
    if location_id_int not in locations:
        return None

    rows = fetch_all_datastore_rows(DROP_IN_DATASTORE_ID, filters={"Location ID": location_id_int})
    programs: list[dict] = []

    for row in rows:
        if not is_current(row.get("Last Date")):
            continue
        if not matches_age(row.get("Age Min"), row.get("Age Max"), age):
            continue

        weekday = parse_int(row.get("Weekday"))
        programs.append(
            {
                "id": row.get("_id") or row.get("Course_ID"),
                "centre_id": location_id_int,
                "location_id": location_id_int,
                "course_id": row.get("Course_ID"),
                "course_title": clean_optional_string(row.get("Course Title")) or "Unknown Program",
                "activity": clean_optional_string(row.get("Course Title")),
                "day_of_week": clean_optional_string(row.get("DayOftheWeek")),
                "weekday": weekday,
                "start_time": format_time_hms(row.get("Start Hour"), row.get("Start Minute")),
                "end_time": format_time_hms(row.get("End Hour"), row.get("End Min")),
                "age_min": parse_int(row.get("Age Min")),
                "age_max": parse_int(row.get("Age Max")),
            }
        )

    programs.sort(
        key=lambda item: (
            item.get("weekday") if item.get("weekday") is not None else 99,
            item.get("start_time") or "",
            item.get("course_title") or "",
        )
    )

    return {
        "dropin": programs,
        "registered": [],
    }


def build_centre_facilities(location_id: str | int) -> list[dict] | None:
    location_id_int = parse_int(location_id)
    if location_id_int is None:
        return None

    locations = load_location_cache()
    if location_id_int not in locations:
        return None

    facilities = list(load_facility_cache().get(location_id_int, []))
    if facilities:
        return facilities

    location = locations.get(location_id_int)
    coord = load_coordinate_cache().get(location_id_int, {})
    fallback_type = location_facility_type(location, coord)
    if not fallback_type:
        return []

    return [
        {
            "facility_type": fallback_type,
            "asset_name": clean_optional_string(location.get("Asset Name")) if location else None,
            "permit": None,
            "facility_rating": None,
        }
    ]
