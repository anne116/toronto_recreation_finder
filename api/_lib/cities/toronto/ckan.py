from __future__ import annotations

import json
from pathlib import Path
import ssl
import urllib.parse
import urllib.request
from datetime import date, datetime

from api._lib.cities.toronto.drop_in_taxonomy import ACTIVITY_TAXONOMY, RAW_TO_CANONICAL_ACTIVITY
from api._lib.cities.toronto.registered_taxonomy import (
    REGISTERED_CATEGORY_TO_TITLES,
    REGISTERED_TITLE_TO_CATEGORY,
    RAW_TO_CANONICAL_REGISTERED_ACTIVITY,
    OTHER_REGISTERED_CATEGORY,
)

CKAN_BASE_URL = "https://ckan0.cf.opendata.inter.prod-toronto.ca"
PACKAGE_ID = "registered-programs-and-drop-in-courses-offering"
DROP_IN_DATASTORE_ID = "c99ec04f-4540-482c-9ee4-efb38774eab4"
REGISTERED_DATASTORE_ID = "3bdfdad5-b1d0-4b1b-b56d-c61c317da306"
LOCATIONS_DATASTORE_ID = "f23ac1ad-6f46-4b59-811f-eb34be9b1f7a"
PARKS_GEOJSON_URL = (
    "https://ckan0.cf.opendata.inter.prod-toronto.ca/"
    "dataset/cbea3a67-9168-4c6d-8186-16ac1a795b5b/"
    "resource/f6cdcd50-da7b-4ede-8e60-c3cdba70b559/download/"
    "parks-and-recreation-facilities-4326.geojson"
)
WARDS_GEOJSON_PATH = (
    Path(__file__).resolve().parents[2] / "data" / "raw_data" / "city-wards-data-4326.geojson"
)

SSL_CONTEXT = ssl.create_default_context()

LOCATION_CACHE = None
COORDINATE_CACHE = None
FACILITY_CACHE = None
WARDS_CACHE = None

DISTRICT_NORMALIZATION = {
    "Toronto East York": "Toronto and East York",
}

WEEKDAY_NAMES = (
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
)

WEEKDAY_DISPLAY_ORDER = (
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
)

WEEKDAY_NAME_LOOKUP = {name.lower(): name for name in WEEKDAY_NAMES}
WEEKDAY_TO_INDEX = {name.lower(): index for index, name in enumerate(WEEKDAY_NAMES)}
WEEKDAY_DISPLAY_INDEX = {name: index for index, name in enumerate(WEEKDAY_DISPLAY_ORDER)}

REGISTERED_WEEKDAY_MAP = {
    "Mon": "Monday",
    "Tue": "Tuesday",
    "Wed": "Wednesday",
    "Thu": "Thursday",
    "Fri": "Friday",
    "Sat": "Saturday",
    "Sun": "Sunday",
}

REGISTERED_CATEGORY_ORDER = list(REGISTERED_CATEGORY_TO_TITLES.keys()) + [OTHER_REGISTERED_CATEGORY]

CATEGORY_ACTIVITY_LOOKUP = {
    category.lower(): set(activities)
    for category, activities in ACTIVITY_TAXONOMY.items()
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

def canonicalize_activity_title(value: object) -> str | None:
    cleaned = clean_optional_string(value)
    if cleaned is None:
        return None
    return RAW_TO_CANONICAL_ACTIVITY.get(cleaned, cleaned)

def raw_titles_for_activity(activity: str) -> set[str]:
    matches = {
        raw_title
        for raw_title, canonical_title in RAW_TO_CANONICAL_ACTIVITY.items()
        if canonical_title == activity
    }
    matches.add(activity)
    return matches

def normalize_facility_type_label(value: object) -> str | None:
    cleaned = clean_optional_string(value)
    if cleaned is None:
        return None

    lowered = cleaned.lower()
    special_cases = {
        "crc": "CRC",
        "pool": "Pool",
        "park": "Park",
        "school": "School",
        "church": "Church",
        "stadium": "Stadium",
        "camp": "Camp",
        "garden": "Garden",
        "other": "Other",
    }
    if lowered in special_cases:
        return special_cases[lowered]

    if cleaned.islower():
        return " ".join(part.capitalize() for part in cleaned.split())

    return cleaned


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


def normalize_category(value: object) -> str | None:
    cleaned = clean_optional_string(value)
    if cleaned is None:
        return None
    for category in ACTIVITY_TAXONOMY.keys():
        if category.lower() == cleaned.lower():
            return category
    return None


def activity_matches_filters(
    raw_title: str,
    *,
    category: str | None = None,
    activity: str | list[str] | None = None,
) -> bool:
    canonical_title = canonicalize_activity_title(raw_title)
    if canonical_title is None:
        return False

    activities = [activity] if isinstance(activity, str) else (activity or [])
    if activities:
        allowed_raw_titles: set[str] = set()
        for name in activities:
            allowed_raw_titles |= raw_titles_for_activity(name)
        if raw_title not in allowed_raw_titles:
            return False

    normalized_category = normalize_category(category)
    if normalized_category is None:
        return True

    return canonical_title in CATEGORY_ACTIVITY_LOOKUP.get(normalized_category.lower(), set())


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

    min_age = int(float(age_min)) if not is_missing(age_min) else 0
    max_age = None if is_missing(age_max) else int(float(age_max))

    bucket_ranges = {
        "children": (0, 12),
        "teens": (13, 17),
        "young_adults": (18, 24),
        "adults": (25, 59),
        "seniors": (60, 200),
    }
    bucket_min, bucket_max = bucket_ranges[age_bucket]
    effective_max = max_age if max_age is not None else 200
    return not (effective_max < bucket_min or min_age > bucket_max)

def matches_registered_age_group(
        age_min: int | str | None,
        age_max: int | str | None,
        age_bucket: str | None,
) -> bool:
    if not age_bucket:
        return True
    min_age = int(float(age_min)) if not is_missing(age_min) else 0
    max_age = None if is_missing(age_max) else int(float(age_max))

    bucket_ranges = {
        "infants_toddlers": (0, 2),
        "preschool_early_childhood": (3, 5),
        "children": (6, 12),
        "teens": (13, 17),
        "young_adults": (18, 24),
        "adults": (25, 59),
        "seniors": (60, 200),        
    }

    bucket_min, bucket_max = bucket_ranges[age_bucket]
    effective_max = max_age if max_age is not None else 200
    return not (effective_max < bucket_min or min_age > bucket_max)

def matches_time_of_day(start_hour: int | str | None, weekday_index: int | None, time_of_day: str | None) -> bool:
    if not time_of_day:
        return True
    if time_of_day == "weekend":
        return weekday_index in (0, 6)
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


def normalize_weekday_name(day_name: object) -> str | None:
    cleaned_day = clean_optional_string(day_name)
    if cleaned_day is None:
        return None
    return WEEKDAY_NAME_LOOKUP.get(cleaned_day.lower())

def weekday_index(day_name: str | None) -> int | None:
    if day_name is None:
        return None
    return WEEKDAY_TO_INDEX.get(day_name.lower())

def normalize_date_fields(row: dict) -> tuple[str | None, str | None, str | None]:
    start_date = clean_optional_string(row.get("First Date"))
    end_date = clean_optional_string(row.get("Last Date"))

    if start_date and end_date:
        return start_date, end_date, start_date if start_date == end_date else f"{start_date} to {end_date}"
    
    if start_date:
        return start_date, None, start_date

    if end_date:
        return None, end_date, end_date
    
    raw_date_range = clean_optional_string(row.get("Date Range"))
    return start_date, end_date, raw_date_range

def sort_weekdays(days: list[str]) -> list[str]:
    return sorted(days, key=lambda day: WEEKDAY_DISPLAY_INDEX.get(day, 99))


def normalize_registered_days(value: object) -> list[str]:
    cleaned = clean_optional_string(value)
    if cleaned is None:
        return []

    days: list[str] = []
    for part in cleaned.split(","):
        token = part.strip()
        if not token:
            continue
        normalized = REGISTERED_WEEKDAY_MAP.get(token)
        if normalized and normalized not in days:
            days.append(normalized)
    return sort_weekdays(days)


def parse_registered_date_range(value: object) -> tuple[str | None, str | None, str | None]:
    cleaned = clean_optional_string(value)
    if cleaned is None:
        return None, None, None

    if " to " not in cleaned:
        return None, None, cleaned

    left, right = cleaned.split(" to ", 1)
    try:
        start_date = datetime.strptime(left.strip(), "%b-%d-%Y").strftime("%Y-%m-%d")
        end_date = datetime.strptime(right.strip(), "%b-%d-%Y").strftime("%Y-%m-%d")
    except ValueError:
        return None, None, cleaned

    date_range = start_date if start_date == end_date else f"{start_date} to {end_date}"
    return start_date, end_date, date_range


def get_start_month(start_date: str | None) -> tuple[str | None, int | None]:
    if start_date is None:
        return None, None
    try:
        parsed = datetime.strptime(start_date, "%Y-%m-%d")
    except ValueError:
        return None, None
    return parsed.strftime("%B"), parsed.month


def months_to_years(value: object) -> int | None:
    months = parse_int(value)
    if months is None:
        return None
    return months // 12


def canonicalize_registered_activity_title(value: object) -> str | None:
    cleaned = clean_optional_string(value)
    if cleaned is None:
        return None
    return RAW_TO_CANONICAL_REGISTERED_ACTIVITY.get(cleaned, cleaned)


def raw_titles_for_registered_activity(activity: str) -> set[str]:
    matches = {
        raw_title
        for raw_title, canonical_title in RAW_TO_CANONICAL_REGISTERED_ACTIVITY.items()
        if canonical_title == activity
    }
    matches.add(activity)
    return matches


def derive_registered_category(course_title: object) -> str:
    canonical = canonicalize_registered_activity_title(course_title)
    if canonical is None:
        return OTHER_REGISTERED_CATEGORY
    return REGISTERED_TITLE_TO_CATEGORY.get(canonical, OTHER_REGISTERED_CATEGORY)


def is_registered_current(end_date_value: str | None) -> bool:
    if not end_date_value:
        return True
    try:
        end_date = datetime.strptime(end_date_value, "%Y-%m-%d").date()
    except ValueError:
        return True
    return end_date >= date.today()


def registered_row_matches_activity(course_title: str | None, activity: str | list[str] | None) -> bool:
    if not activity:
        return True
    activities = [activity] if isinstance(activity, str) else activity
    allowed_raw_titles: set[str] = set()
    for name in activities:
        allowed_raw_titles |= raw_titles_for_registered_activity(name)
    return course_title in allowed_raw_titles

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
            "facility_type": normalize_facility_type_label(props.get("TYPE")),
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

        facility_type = normalize_facility_type_label(props.get("TYPE"))
        asset_name = clean_optional_string(props.get("ASSET_NAME"))
        if facility_type is None and asset_name is None:
            continue

        bucket = cache.setdefault(location_id, [])
        candidate = {
            "facility_type": facility_type or "Unknown",
            "asset_name": asset_name,
            "permit": None,
            "facility_rating": None,
        }
        if candidate not in bucket:
            bucket.append(candidate)

    FACILITY_CACHE = cache
    return FACILITY_CACHE


def load_wards_geojson() -> dict:
    global WARDS_CACHE
    if WARDS_CACHE is not None:
        return WARDS_CACHE

    if not WARDS_GEOJSON_PATH.exists():
        WARDS_CACHE = {"type": "FeatureCollection", "features": []}
        return WARDS_CACHE

    payload = json.loads(WARDS_GEOJSON_PATH.read_text(encoding="utf-8"))
    WARDS_CACHE = {
        "type": payload.get("type", "FeatureCollection"),
        "features": payload.get("features", []),
    }
    return WARDS_CACHE


def location_name(location: dict | None) -> str | None:
    if not location:
        return None
    return clean_optional_string(location.get("Location Name")) or clean_optional_string(location.get("Asset Name"))


def location_facility_type(location: dict | None, coord: dict | None = None) -> str | None:
    if coord:
        from_coord = normalize_facility_type_label(coord.get("facility_type"))
        if from_coord:
            return from_coord
    if not location:
        return None
    return normalize_facility_type_label(location.get("Location Type"))


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
        value = normalize_facility_type_label(facility.get("facility_type"))
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
        activity = canonicalize_activity_title(raw_title)
        if activity is None:
            continue

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
        facility_type_str = normalize_facility_type_label(facility_type)
        if facility_type_str is None:
            continue
        counts[facility_type_str] = counts.get(facility_type_str, 0) + 1

    result = [
        {"facility_type": facility_type, "count": counts[facility_type]}
        for facility_type in counts.keys()
    ]
    result.sort(key=lambda item: (-int(item["count"]), str(item["facility_type"])))
    return result

def build_registered_filter_options_response() -> dict:
    rows = fetch_all_datastore_rows(REGISTERED_DATASTORE_ID)
    locations = load_location_cache()

    categories: dict[str, set[str]] = {}
    activity_counts: dict[str, dict[str, object]] = {}
    district_counts: dict[str, int] = {}
    start_months: dict[str, int] = {}

    for row in rows:
        course_title = clean_optional_string(row.get("Course Title"))
        start_date, end_date, _ = parse_registered_date_range(row.get("From To"))
        if not is_registered_current(end_date):
            continue

        location_id = parse_int(row.get("Location ID"))
        if course_title is None or location_id is None:
            continue

        location = locations.get(location_id)
        if not location:
            continue

        canonical_title = canonicalize_registered_activity_title(course_title) or course_title
        category = derive_registered_category(course_title)
        categories.setdefault(category, set()).add(canonical_title)

        activity_entry = activity_counts.setdefault(
            canonical_title,
            {"activity": canonical_title, "count": 0, "locations": set()},
        )
        activity_entry["count"] = int(activity_entry["count"]) + 1
        cast_locations = activity_entry["locations"]
        assert isinstance(cast_locations, set)
        cast_locations.add(location_id)

        district = normalize_district(location.get("District"))
        if district:
            district_counts[district] = district_counts.get(district, 0) + 1
        start_month_label, month_number = get_start_month(start_date)
        if start_month_label and month_number:
            start_months[start_month_label] = month_number

    category_payload = []
    remaining_categories = {key for key in categories.keys() if key not in REGISTERED_CATEGORY_ORDER}
    for category in REGISTERED_CATEGORY_ORDER:
        activities = categories.get(category)
        if not activities:
            continue
        category_payload.append(
            {
                "name": category,
                "description": "",
                "activities": sorted(activities),
            }
        )
    for category in sorted(remaining_categories):
        category_payload.append(
            {
                "name": category,
                "description": "",
                "activities": sorted(categories[category]),
            }
        )
    activity_payload = [
        {
            "activity": item["activity"],
            "count": item["count"],
            "locations": len(item["locations"]),
        }
        for item in activity_counts.values()
    ]
    activity_payload.sort(key=lambda item: str(item["activity"]))
    district_payload = [
        {"district": district, "location_count": district_counts[district]}
        for district in sorted(district_counts.keys())
    ]
    start_month_payload = [
        {
            "value": month_name,
            "label": month_name,
            "month_number": month_number,
        }
        for month_name, month_number in sorted(start_months.items(), key=lambda item: item[1])
    ]

    return {
        "categories": category_payload,
        "activities": activity_payload,
        "districts": district_payload,
        "startMonths": start_month_payload,
    }


def collect_registered_program_groups(
    *,
    category: str | None = None,
    activity: str | list[str] | None = None,
    district: str | None = None,
    age: str | None = None,
    start_month: str | None = None,
    location_id: int | None = None,
    location_ids: set[int] | None = None,
) -> list[dict]:
    rows = fetch_all_datastore_rows(REGISTERED_DATASTORE_ID)
    locations = load_location_cache()
    grouped: dict[tuple, dict] = {}

    for row in rows:
        row_location_id = parse_int(row.get("Location ID"))
        course_title = clean_optional_string(row.get("Course Title"))
        activity_title = clean_optional_string(row.get("Activity Title"))
        if row_location_id is None or course_title is None:
            continue
        if location_id is not None:
            if row_location_id != location_id:
                continue
        elif location_ids is not None and row_location_id not in location_ids:
            continue

        location = locations.get(row_location_id)
        if not location:
            continue

        normalized_category = derive_registered_category(course_title)
        if category and normalized_category != category:
            continue
        if not registered_row_matches_activity(course_title, activity):
            continue

        days_of_week = normalize_registered_days(row.get("Days of The Week"))

        start_date, end_date, date_range = parse_registered_date_range(row.get("From To"))
        if not is_registered_current(end_date):
            continue
        start_month_label, _ = get_start_month(start_date)
        if start_month and start_month_label != start_month:
            continue

        age_min = months_to_years(row.get("Min Age"))
        age_max = months_to_years(row.get("Max Age"))
        if not matches_registered_age_group(age_min, age_max, age):
            continue

        normalized_district = normalize_district(location.get("District"))
        if district and normalized_district != district:
            continue

        start_time = format_time_hms(row.get("Start Hour"), row.get("Start Min"))
        end_time = format_time_hms(row.get("End Hour"), row.get("End Min"))
        group_key = (
            row_location_id,
            course_title,
            start_time,
            end_time,
            age_min,
            age_max,
            normalized_category,
        )

        period = {
            "id": f"{row_location_id}-{row.get('Course_ID')}-{start_time}-{end_time}-{start_date or 'na'}",
            "course_id": row.get("Course_ID"),
            "days_of_week": days_of_week,
            "start_date": start_date,
            "end_date": end_date,
            "date_range": date_range,
            "start_month": start_month_label,
            "start_time": start_time,
            "end_time": end_time,
            "activity_url": clean_optional_string(row.get("Activity URL")),
        }

        if group_key not in grouped:
            grouped[group_key] = {
                "id": f"{row_location_id}|{course_title}|{start_time or ''}|{end_time or ''}|{age_min or ''}|{age_max or ''}|{normalized_category}",
                "location_id": row_location_id,
                "location_name": location_name(location) or "Unknown Location",
                "district": normalized_district,
                "category": normalized_category,
                "course_title": course_title,
                "age_min": age_min,
                "age_max": age_max,
                "start_time": start_time,
                "end_time": end_time,
                "periods": [],
            }

        grouped[group_key]["periods"].append(period)

    result: list[dict] = []
    for group in grouped.values():
        periods = sorted(
            group["periods"],
            key=lambda item: (
                item.get("start_date") or "",
                item.get("start_time") or "",
                item.get("course_id") or "",
            ),
        )
        all_days: list[str] = []
        for period in periods:
            for day in period.get("days_of_week", []):
                if day not in all_days:
                    all_days.append(day)
        all_days = sort_weekdays(all_days)

        first_period = periods[0]
        last_period = periods[-1]
        start_date = first_period.get("start_date")
        end_date = last_period.get("end_date") or last_period.get("start_date")
        date_range = format_registered_summary_range(start_date, end_date)

        result.append(
            {
                **group,
                "days_of_week": all_days,
                "start_date": start_date,
                "end_date": end_date,
                "date_range": date_range,
                "start_month": first_period.get("start_month"),
                "periods": periods,
            }
        )

    result.sort(
        key=lambda item: (
            item.get("course_title") or "",
            item.get("start_date") or "",
            item.get("start_time") or "",
            item.get("location_name") or "",
        )
    )
    return result


def format_registered_summary_range(start_date: str | None, end_date: str | None) -> str | None:
    if start_date and end_date:
        return start_date if start_date == end_date else f"{start_date} to {end_date}"
    return start_date or end_date


def build_registered_program_search_response(
    *,
    category: str | None = None,
    activity: str | list[str] | None = None,
    district: str | None = None,
    age: str | None = None,
    start_month: str | None = None,
    location_id: int | None = None,
    location_ids: set[int] | None = None,
    limit: int = 2000,
) -> dict:
    programs = collect_registered_program_groups(
        category=category,
        activity=activity,
        district=district,
        age=age,
        start_month=start_month,
        location_id=location_id,
        location_ids=location_ids,
    )[:limit]

    return {
        "program_type": "registered",
        "count": len(programs),
        "filters": {
            "category": category,
            "activity": activity,
            "age": age,
            "start_month": start_month,
            "district": district,
        },
        "programs": programs,
    }


def build_registered_centres_geojson_response(
    *,
    category: str | None = None,
    activity: str | list[str] | None = None,
    district: str | None = None,
    age: str | None = None,
    start_month: str | None = None,
    location_id: int | None = None,
) -> dict:
    groups = collect_registered_program_groups(
        category=category,
        activity=activity,
        district=district,
        age=age,
        start_month=start_month,
        location_id=location_id,
    )
    coordinates = load_coordinate_cache()

    grouped_centres: dict[int, dict] = {}
    for group in groups:
        row_location_id = int(group["location_id"])
        coord = coordinates.get(row_location_id)
        if not coord:
            continue

        bucket = grouped_centres.setdefault(
            row_location_id,
            {
                "id": row_location_id,
                "name": group["location_name"],
                "district": group.get("district"),
                "registered_count": 0,
                "dropin_count": 0,
                "total_programs": 0,
                "facility_type": coord.get("facility_type"),
                "address": coord.get("address"),
                "lon": coord.get("lon"),
                "lat": coord.get("lat"),
            },
        )
        bucket["registered_count"] += 1
        bucket["total_programs"] += 1

    features = []
    centres = sorted(
        grouped_centres.values(),
        key=lambda item: (-int(item["registered_count"]), str(item["name"] or "")),
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


def build_program_search_response(
    *,
    category: str | None = None,
    activity: str | list[str] | None = None,
    district: str | None = None,
    age: str | None = None,
    time_of_day: str | None = None,
    weekday: str | None = None,
    location_id: int | None = None,
    location_ids: set[int] | None = None,
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
        if not activity_matches_filters(raw_title, category=category, activity=activity):
            continue

        row_day_of_week = normalize_weekday_name(row.get("DayOftheWeek"))
        if weekday is not None and row_day_of_week != weekday:
            continue
        row_weekday_index = weekday_index(row_day_of_week)
        if not matches_age(row.get("Age Min"), row.get("Age Max"), age):
            continue
        if not matches_time_of_day(row.get("Start Hour"), row_weekday_index, time_of_day):
            continue

        row_location_id = parse_int(row.get("Location ID"))
        if row_location_id is None:
            continue
        if location_id is not None:
            if row_location_id != location_id:
                continue
        elif location_ids is not None and row_location_id not in location_ids:
            continue

        location = locations.get(row_location_id)
        if not location:
            continue

        normalized_district = normalize_district(location.get("District"))
        if district and normalized_district != district:
            continue

        coord = coordinates.get(row_location_id, {})
        start_date, end_date, date_range = normalize_date_fields(row)

        programs.append(
            {
                "id": row.get("_id"),
                "location_id": row_location_id,
                "course_title": raw_title,
                "activity": canonicalize_activity_title(raw_title),
                "day_of_week": row_day_of_week,
                "start_time": format_time_hms(row.get("Start Hour"), row.get("Start Minute")),
                "end_time": format_time_hms(row.get("End Hour"), row.get("End Min")),
                "start_date": start_date,
                "end_date": end_date,
                "date_range": date_range,
                "age_min": parse_int(row.get("Age Min")),
                "age_max": parse_int(row.get("Age Max")),
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
            weekday_index(item.get("day_of_week")) if item.get("day_of_week") is not None else 99,
            item.get("start_date") or "",
            item.get("start_time") or "",
            item.get("location_name") or "",
        )
    )

    return {
        "program_type": "dropin",
        "count": len(programs),
        "filters": {
            "category": normalize_category(category),
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
    category: str | None = None,
    activity: str | list[str] | None = None,
    district: str | None = None,
    age: str | None = None,
    facility_type: str | None = None,
    weekday: str | None = None,
    location_id: int | None = None,
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
        if not activity_matches_filters(raw_title, category=category, activity=activity):
            continue

        row_day_of_week = normalize_weekday_name(row.get("DayOftheWeek"))
        if weekday is not None and row_day_of_week != weekday:
            continue
        if not matches_age(row.get("Age Min"), row.get("Age Max"), age):
            continue

        row_location_id = parse_int(row.get("Location ID"))
        if row_location_id is None:
            continue
        if location_id is not None and row_location_id != location_id:
            continue

        location = locations.get(row_location_id)
        coord = coordinates.get(row_location_id)
        if not location or not coord:
            continue

        normalized_district = normalize_district(location.get("District"))
        if district and normalized_district != district:
            continue
        if not location_matches_facility_type(row_location_id, facility_type):
            continue

        bucket = grouped.setdefault(
            row_location_id,
            {
                "id": row_location_id,
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

def build_wards_geojson_response() -> dict:
    return load_wards_geojson()
