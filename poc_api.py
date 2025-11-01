from fastapi import FastAPI, Query, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
import psycopg
from psycopg.rows import dict_row, tuple_row
from typing import Optional, List
import uvicorn

app = FastAPI(
    title="Toronto Recreation Finder API",
    description="Find recreation centres, programs, and facilities across Toronto",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"]
)

DB_URL = "postgresql://poc:poc123@localhost:5432/poc_db"

def get_db():
    return psycopg.connect(DB_URL, row_factory=dict_row)

# ============================================
# LOCATION/CENTRE ENDPOINTS
# ============================================

@app.get("/api/centres")
async def get_centres(
    activity: Optional[str] = None,
    weekday: Optional[int] = Query(None, ge=0, le=6, description="0=Monday, 6=Sunday"),
    district: Optional[str] = None,
    facility_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000)
):
    """
    Get recreation centres with optional filters.
    
    - **activity**: Filter by program name (e.g., "swim", "basketball")
    - **weekday**: Filter by day (0=Monday, 6=Sunday)
    - **district**: Filter by district name
    - **facility_type**: Filter by facility type (e.g., "Community Centre", "Park")
    - **limit**: Maximum results to return
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            query = """
                WITH location_programs AS (
                    SELECT 
                        l.location_id,
                        l.location_name,
                        l.asset_name,
                        l.address,
                        l.district,
                        l.facility_type,
                        l.accessibility,
                        l.phone,
                        l.url,
                        ST_X(l.geom) as lon,
                        ST_Y(l.geom) as lat,
                        COUNT(DISTINCT pd.id) as dropin_count,
                        COUNT(DISTINCT pr.id) as registered_count
                    FROM locations l
                    LEFT JOIN programs_dropin pd ON l.location_id = pd.location_id
                    LEFT JOIN programs_registered pr ON l.location_id = pr.location_id
                    WHERE l.geom IS NOT NULL
            """
            params = {}
            
            if activity:
                query += """
                    AND (
                        pd.course_title ILIKE %(activity)s 
                        OR pr.course_title ILIKE %(activity)s
                    )
                """
                params['activity'] = f"%{activity}%"
            
            if weekday is not None:
                query += " AND pd.weekday = %(weekday)s"
                params['weekday'] = weekday
            
            if district:
                query += " AND l.district = %(district)s"
                params['district'] = district
            
            if facility_type:
                query += " AND l.facility_type ILIKE %(facility_type)s"
                params['facility_type'] = f"%{facility_type}%"
            
            query += """
                    GROUP BY l.location_id, l.location_name, l.asset_name, l.address,
                             l.district, l.facility_type, l.accessibility, l.phone, l.url,
                             l.geom
                )
                SELECT 
                    location_id,
                    COALESCE(location_name, asset_name) as name,
                    address,
                    district,
                    facility_type,
                    accessibility,
                    phone,
                    url,
                    lon,
                    lat,
                    dropin_count,
                    registered_count,
                    dropin_count + registered_count as total_programs
                FROM location_programs
                ORDER BY total_programs DESC, name
                LIMIT %(limit)s;
            """
            params['limit'] = limit
            
            cur.execute(query, params)
            return cur.fetchall()

@app.get("/api/centres/geojson")
async def get_centres_geojson(
    activity: Optional[str] = None,
    weekday: Optional[int] = None,
    district: Optional[str] = None,
    facility_type: Optional[str] = None
):
    """
    Get centres as GeoJSON FeatureCollection for mapping.
    Same filters as /api/centres but returns map-ready format.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            query = """
                WITH centre_counts AS (
                    SELECT 
                        l.location_id,
                        l.location_name,
                        l.asset_name,
                        l.address,
                        l.district,
                        l.facility_type,
                        l.geom,
                        COUNT(DISTINCT pd.id) as dropin_count,
                        COUNT(DISTINCT pr.id) as registered_count
                    FROM locations l
                    LEFT JOIN programs_dropin pd ON l.location_id = pd.location_id
                    LEFT JOIN programs_registered pr ON l.location_id = pr.location_id
                    WHERE l.geom IS NOT NULL
            """
            params = {}
            
            if activity:
                query += """
                    AND (
                        pd.course_title ILIKE %(activity)s 
                        OR pr.course_title ILIKE %(activity)s
                    )
                """
                params['activity'] = f"%{activity}%"
            
            if weekday is not None:
                query += " AND pd.weekday = %(weekday)s"
                params['weekday'] = weekday
            
            if district:
                query += " AND l.district = %(district)s"
                params['district'] = district
            
            if facility_type:
                query += " AND l.facility_type ILIKE %(facility_type)s"
                params['facility_type'] = f"%{facility_type}%"
            
            query += """
                    GROUP BY l.location_id, l.location_name, l.asset_name, l.address,
                             l.district, l.facility_type, l.geom
                )
                SELECT jsonb_build_object(
                    'type', 'FeatureCollection',
                    'features', jsonb_agg(
                        jsonb_build_object(
                            'type', 'Feature',
                            'geometry', ST_AsGeoJSON(geom)::jsonb,
                            'properties', jsonb_build_object(
                                'id', location_id,
                                'name', COALESCE(location_name, asset_name),
                                'address', address,
                                'district', district,
                                'facility_type', facility_type,
                                'dropin_count', dropin_count,
                                'registered_count', registered_count,
                                'total_programs', dropin_count + registered_count
                            )
                        )
                    )
                ) as geojson
                FROM centre_counts;
            """
            
            cur.execute(query, params)
            result = cur.fetchone()
            return result['geojson'] if result else {"type": "FeatureCollection", "features": []}

@app.get("/api/centres/{location_id}")
async def get_centre_detail(location_id: str):
    """Get detailed information about a specific recreation centre."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    location_id,
                    COALESCE(location_name, asset_name) as name,
                    asset_name,
                    location_name,
                    address,
                    district,
                    facility_type,
                    amenities,
                    accessibility,
                    intersection,
                    ttc_information,
                    phone,
                    url,
                    description,
                    postal_code,
                    ST_X(geom) as lon,
                    ST_Y(geom) as lat
                FROM locations
                WHERE location_id = %s;
            """, (location_id,))
            
            location = cur.fetchone()
            if not location:
                raise HTTPException(status_code=404, detail="Location not found")
            
            return location

@app.get("/api/centres/{location_id}/programs")
async def get_centre_programs(
    location_id: str,
    program_type: Optional[str] = Query(None, description="'dropin' or 'registered'")
):
    """Get all programs at a specific centre."""
    with get_db() as conn:
        with conn.cursor() as cur:
            programs = {"dropin": [], "registered": []}
            
            # Get drop-in programs
            if program_type is None or program_type == "dropin":
                cur.execute("""
                    SELECT 
                        course_id,
                        course_title,
                        section,
                        age_min,
                        age_max,
                        day_of_week,
                        start_time::text,
                        end_time::text,
                        date_range,
                        first_date::text,
                        last_date::text
                    FROM programs_dropin
                    WHERE location_id = %s
                    ORDER BY weekday, start_time;
                """, (location_id,))
                programs["dropin"] = cur.fetchall()
            
            # Get registered programs
            if program_type is None or program_type == "registered":
                cur.execute("""
                    SELECT 
                        course_id,
                        course_title,
                        activity_title,
                        section,
                        min_age,
                        max_age,
                        days_of_week,
                        from_to,
                        start_hour,
                        start_minute,
                        end_hour,
                        end_minute,
                        program_category,
                        registration_date::text,
                        status_info,
                        activity_url
                    FROM programs_registered
                    WHERE location_id = %s
                    ORDER BY course_title;
                """, (location_id,))
                programs["registered"] = cur.fetchall()
            
            return programs

@app.get("/api/centres/{location_id}/program-types")
async def get_centre_program_types(location_id: str):
    """Get unique program types (titles) at a specific centre."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    'dropin' as program_type,
                    ARRAY_AGG(DISTINCT course_title ORDER BY course_title) FILTER (WHERE course_title IS NOT NULL) as titles,
                    COUNT(DISTINCT course_title) as count
                FROM programs_dropin
                WHERE location_id = %s
                UNION ALL
                SELECT 
                    'registered' as program_type,
                    ARRAY_AGG(DISTINCT course_title ORDER BY course_title) FILTER (WHERE course_title IS NOT NULL) as titles,
                    COUNT(DISTINCT course_title) as count
                FROM programs_registered
                WHERE location_id = %s;
            """, (location_id, location_id))
            
            result = cur.fetchall()
            return {
                "dropin": result[0] if len(result) > 0 else {"titles": [], "count": 0},
                "registered": result[1] if len(result) > 1 else {"titles": [], "count": 0}
            }

@app.get("/api/centres/{location_id}/facilities")
async def get_centre_facilities(location_id: str):
    """Get all facilities at a specific centre."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    facility_id,
                    facility_type,
                    facility_type_code,
                    asset_name,
                    permit,
                    facility_rating
                FROM facilities
                WHERE location_id = %s
                ORDER BY facility_type;
            """, (location_id,))
            
            return cur.fetchall()

# ============================================
# SEARCH & FILTER ENDPOINTS
# ============================================

@app.get("/api/activities")
async def get_activities(
    program_type: Optional[str] = Query(None, description="'dropin' or 'registered'"),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Get list of unique activities/programs.
    Returns most popular activities first.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            if program_type == "dropin":
                cur.execute("""
                    SELECT 
                        course_title as activity,
                        COUNT(*) as count,
                        COUNT(DISTINCT location_id) as locations
                    FROM programs_dropin
                    WHERE course_title IS NOT NULL
                    GROUP BY course_title
                    ORDER BY count DESC
                    LIMIT %s;
                """, (limit,))
            elif program_type == "registered":
                cur.execute("""
                    SELECT 
                        course_title as activity,
                        COUNT(*) as count,
                        COUNT(DISTINCT location_id) as locations
                    FROM programs_registered
                    WHERE course_title IS NOT NULL
                    GROUP BY course_title
                    ORDER BY count DESC
                    LIMIT %s;
                """, (limit,))
            else:
                # Combine both types
                cur.execute("""
                    SELECT 
                        course_title as activity,
                        SUM(count) as count,
                        SUM(locations) as locations
                    FROM (
                        SELECT 
                            course_title,
                            COUNT(*) as count,
                            COUNT(DISTINCT location_id) as locations
                        FROM programs_dropin
                        WHERE course_title IS NOT NULL
                        GROUP BY course_title
                        UNION ALL
                        SELECT 
                            course_title,
                            COUNT(*) as count,
                            COUNT(DISTINCT location_id) as locations
                        FROM programs_registered
                        WHERE course_title IS NOT NULL
                        GROUP BY course_title
                    ) combined
                    GROUP BY course_title
                    ORDER BY count DESC
                    LIMIT %s;
                """, (limit,))
            
            return cur.fetchall()

@app.get("/api/districts")
async def get_districts():
    """Get list of all districts with location counts."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    district,
                    COUNT(*) as location_count
                FROM locations
                WHERE district IS NOT NULL
                GROUP BY district
                ORDER BY district;
            """)
            return cur.fetchall()

@app.get("/api/facility-types")
async def get_facility_types():
    """Get list of all facility types."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    facility_type,
                    COUNT(*) as count
                FROM locations
                WHERE facility_type IS NOT NULL
                GROUP BY facility_type
                ORDER BY count DESC;
            """)
            return cur.fetchall()

# ============================================
# SPATIAL/MAP ENDPOINTS
# ============================================

@app.get("/api/centres/nearby")
async def get_nearby_centres(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius_km: float = Query(5.0, ge=0.1, le=50, description="Search radius in kilometers"),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Find recreation centres near a specific location.
    Returns centres within radius_km, ordered by distance.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    l.location_id,
                    COALESCE(l.location_name, l.asset_name) as name,
                    l.address,
                    l.district,
                    l.facility_type,
                    ST_X(l.geom) as lon,
                    ST_Y(l.geom) as lat,
                    ROUND(
                        CAST(
                            ST_Distance(
                                l.geom::geography,
                                ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
                            ) / 1000 AS NUMERIC
                        ), 2
                    ) as distance_km,
                    COUNT(DISTINCT pd.id) + COUNT(DISTINCT pr.id) as total_programs
                FROM locations l
                LEFT JOIN programs_dropin pd ON l.location_id = pd.location_id
                LEFT JOIN programs_registered pr ON l.location_id = pr.location_id
                WHERE l.geom IS NOT NULL
                    AND ST_DWithin(
                        l.geom::geography,
                        ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
                        %s * 1000
                    )
                GROUP BY l.location_id, l.location_name, l.asset_name, l.address,
                         l.district, l.facility_type, l.geom
                ORDER BY l.geom <-> ST_SetSRID(ST_MakePoint(%s, %s), 4326)
                LIMIT %s;
            """, (lon, lat, lon, lat, radius_km, lon, lat, limit))
            
            return cur.fetchall()

@app.get("/api/wards/geojson")
def get_wards_geojson():
    sql = """
        SELECT (
          json_build_object(
            'type','FeatureCollection',
            'features', COALESCE(json_agg(
              json_build_object(
                'type','Feature',
                'geometry', ST_AsGeoJSON(geom)::json,
                'properties', json_build_object(
                  'id', id,
                  'area_id', area_id,
                  'area_name', area_name,
                  'area_short_code', area_short_code
                )
              )
            ), '[]'::json)
          )
        )::text AS fc
        FROM public.wards;
    """
    try:
        with get_db() as conn, conn.cursor(row_factory=tuple_row) as cur:
            cur.execute(sql)
            fc_text = (cur.fetchone() or [None])[0] or '{"type":"FeatureCollection","features":[]}'
        return Response(content=fc_text, media_type="application/json")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to build wards GeoJSON")





# ============================================
# STATISTICS & ANALYTICS ENDPOINTS
# ============================================

@app.get("/api/stats/summary")
async def get_summary_stats():
    """Get overall database statistics."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    (SELECT COUNT(*) FROM locations) as total_locations,
                    (SELECT COUNT(*) FROM locations WHERE geom IS NOT NULL) as locations_with_coords,
                    (SELECT COUNT(*) FROM programs_dropin) as dropin_programs,
                    (SELECT COUNT(*) FROM programs_registered) as registered_programs,
                    (SELECT COUNT(*) FROM facilities) as total_facilities,
                    (SELECT COUNT(*) FROM wards) as total_wards,
                    (SELECT COUNT(DISTINCT district) FROM locations WHERE district IS NOT NULL) as districts,
                    (SELECT COUNT(DISTINCT facility_type) FROM locations WHERE facility_type IS NOT NULL) as facility_types;
            """)
            return cur.fetchone()

@app.get("/api/stats/by-district")
async def get_stats_by_district():
    """Get statistics grouped by district."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    l.district,
                    COUNT(DISTINCT l.location_id) as locations,
                    COUNT(DISTINCT pd.id) as dropin_programs,
                    COUNT(DISTINCT pr.id) as registered_programs,
                    COUNT(DISTINCT f.id) as facilities
                FROM locations l
                LEFT JOIN programs_dropin pd ON l.location_id = pd.location_id
                LEFT JOIN programs_registered pr ON l.location_id = pr.location_id
                LEFT JOIN facilities f ON l.location_id = f.location_id
                WHERE l.district IS NOT NULL
                GROUP BY l.district
                ORDER BY locations DESC;
            """)
            return cur.fetchall()

# ============================================
# HEALTH & TESTING ENDPOINTS
# ============================================

@app.get("/health")
async def health_check():
    """Simple health check for monitoring."""
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                cur.execute("SELECT PostGIS_Version();")
                postgis_version = cur.fetchone()
        return {
            "status": "healthy",
            "database": "connected",
            "postgis": postgis_version
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


@app.get("/api/_health/wards")
def health_wards():
    with get_db() as conn, conn.cursor(row_factory=tuple_row) as cur:
        cur.execute("SELECT COUNT(*) AS n FROM public.wards;")
        n = cur.fetchone()[0]  # tuple row -> index 0 works
    return {"ok": True, "rows": int(n)}




@app.get("/test/spatial")
async def test_spatial_query():
    """Test PostGIS spatial queries - find centres near downtown Toronto."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    COALESCE(location_name, asset_name) as name,
                    address,
                    ROUND(
                        CAST(
                            ST_Distance(
                                geom::geography,
                                ST_SetSRID(ST_MakePoint(-79.3832, 43.6532), 4326)::geography
                            ) / 1000 AS NUMERIC
                        ), 2
                    ) as distance_km
                FROM locations
                WHERE geom IS NOT NULL
                ORDER BY geom <-> ST_SetSRID(ST_MakePoint(-79.3832, 43.6532), 4326)
                LIMIT 5;
            """)
            return {"nearest_to_downtown": cur.fetchall()}

@app.get("/")
async def root():
    """API root with helpful links."""
    return {
        "message": "Toronto Recreation Finder API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "centres": "/api/centres",
            "centres_map": "/api/centres/geojson",
            "activities": "/api/activities",
            "districts": "/api/districts",
            "nearby": "/api/centres/nearby?lat=43.65&lon=-79.38&radius_km=5",
            "stats": "/api/stats/summary"
        }
    }

# ============================================
# NEW ENDPOINT: AGGREGATED PROGRAM SEARCH
# ============================================

@app.get("/api/programs/search")
async def search_programs_aggregated(
    activity: Optional[str] = None,
    age: Optional[str] = None,
    weekday: Optional[int] = Query(None, ge=0, le=6, description="0=Monday, 6=Sunday"),
    district: Optional[str] = None,
    program_type: Optional[str] = Query("dropin", description="'dropin' or 'registered'"),
    limit: int = Query(200, ge=1, le=500)
):
    """
    Search for programs across ALL centres with filters.
    Returns aggregated results for weekly calendar grid.
    
    Use this when you want to see all matching programs across Toronto,
    not just programs at a specific centre.
    
    - **activity**: Sport/program name (e.g., "Table Tennis", "Basketball")
    - **age**: Age filter ("young", "teen", "adult", "senior")
    - **weekday**: Day of week (0=Monday, 6=Sunday)
    - **district**: Filter by district
    - **program_type**: "dropin" or "registered"
    - **limit**: Maximum results
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            
            if program_type == "dropin":
                # Query drop-in programs
                query = """
                    SELECT 
                        pd.id,
                        pd.course_id,
                        pd.course_title,
                        pd.section,
                        pd.day_of_week,
                        pd.start_time::text,
                        pd.end_time::text,
                        pd.age_min,
                        pd.age_max,
                        pd.location_id,
                        l.location_name,
                        l.asset_name,
                        l.address,
                        l.district,
                        ST_X(l.geom) as lon,
                        ST_Y(l.geom) as lat,
                        pd.weekday,
                        pd.date_range,
                        pd.first_date::text,
                        pd.last_date::text
                    FROM programs_dropin pd
                    JOIN locations l ON pd.location_id = l.location_id
                    WHERE 1=1
                """
                params = {}
                
                # Activity filter
                if activity:
                    query += " AND pd.course_title ILIKE %(activity)s"
                    params['activity'] = f"%{activity}%"
                
                # Age filter (map frontend age strings to age ranges)
                if age:
                    if age == "young":  # Under 12
                        query += " AND (pd.age_max <= 12 OR pd.age_min < 12 OR pd.age_max IS NULL)"
                    elif age == "teen":  # 13-18
                        query += " AND (pd.age_min <= 18 OR pd.age_min IS NULL) AND (pd.age_max >= 13 OR pd.age_max IS NULL)"
                    elif age == "adult":  # 19-65
                        query += " AND (pd.age_min <= 65 OR pd.age_min IS NULL) AND (pd.age_max >= 19 OR pd.age_max IS NULL)"
                    elif age == "senior":  # 65+
                        query += " AND (pd.age_min >= 55 OR pd.age_min IS NULL)"
                
                # Weekday filter
                if weekday is not None:
                    query += " AND pd.weekday = %(weekday)s"
                    params['weekday'] = weekday
                
                # District filter
                if district:
                    query += " AND l.district = %(district)s"
                    params['district'] = district
                
                # Order by day of week, then time
                query += """
                    ORDER BY 
                        pd.weekday,
                        pd.start_time,
                        l.location_name
                    LIMIT %(limit)s;
                """
                params['limit'] = limit
                
                cur.execute(query, params)
                results = cur.fetchall()
                
                return {
                    "program_type": "dropin",
                    "total": len(results),
                    "filters": {
                        "activity": activity,
                        "age": age,
                        "weekday": weekday,
                        "district": district
                    },
                    "programs": results
                }
            
            elif program_type == "registered":
                # Query registered programs
                query = """
                    SELECT 
                        pr.id,
                        pr.course_id,
                        pr.course_title,
                        pr.activity_title,
                        pr.section,
                        pr.days_of_week,
                        pr.from_to,
                        pr.start_hour,
                        pr.start_minute,
                        pr.end_hour,
                        pr.end_minute,
                        pr.min_age,
                        pr.max_age,
                        pr.location_id,
                        l.location_name,
                        l.asset_name,
                        l.address,
                        l.district,
                        ST_X(l.geom) as lon,
                        ST_Y(l.geom) as lat,
                        pr.program_category,
                        pr.registration_date::text,
                        pr.status_info,
                        pr.activity_url
                    FROM programs_registered pr
                    JOIN locations l ON pr.location_id = l.location_id
                    WHERE 1=1
                """
                params = {}
                
                # Activity filter
                if activity:
                    query += " AND (pr.course_title ILIKE %(activity)s OR pr.activity_title ILIKE %(activity)s)"
                    params['activity'] = f"%{activity}%"
                
                # Age filter
                if age:
                    if age == "young":
                        query += " AND (pr.max_age <= 12 OR pr.min_age < 12 OR pr.max_age IS NULL)"
                    elif age == "teen":
                        query += " AND (pr.min_age <= 18 OR pr.min_age IS NULL) AND (pr.max_age >= 13 OR pr.max_age IS NULL)"
                    elif age == "adult":
                        query += " AND (pr.min_age <= 65 OR pr.min_age IS NULL) AND (pr.max_age >= 19 OR pr.max_age IS NULL)"
                    elif age == "senior":
                        query += " AND (pr.min_age >= 55 OR pr.min_age IS NULL)"
                
                # District filter
                if district:
                    query += " AND l.district = %(district)s"
                    params['district'] = district
                
                query += """
                    ORDER BY 
                        pr.course_title,
                        l.location_name
                    LIMIT %(limit)s;
                """
                params['limit'] = limit
                
                cur.execute(query, params)
                results = cur.fetchall()
                
                return {
                    "program_type": "registered",
                    "total": len(results),
                    "filters": {
                        "activity": activity,
                        "age": age,
                        "district": district
                    },
                    "programs": results
                }
            
            else:
                raise HTTPException(status_code=400, detail="program_type must be 'dropin' or 'registered'")


# ============================================
# HELPER ENDPOINT: Quick Stats for Search
# ============================================

@app.get("/api/programs/search/stats")
async def get_program_search_stats(
    activity: Optional[str] = None,
    age: Optional[str] = None,
    weekday: Optional[int] = None,
    district: Optional[str] = None
):
    """
    Get quick stats about programs matching search criteria.
    Useful for showing "Found 25 programs at 12 centres" type messages.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT 
                    COUNT(DISTINCT pd.id) as dropin_count,
                    COUNT(DISTINCT pd.location_id) as dropin_centres,
                    COUNT(DISTINCT pr.id) as registered_count,
                    COUNT(DISTINCT pr.location_id) as registered_centres
                FROM programs_dropin pd
                FULL OUTER JOIN programs_registered pr ON 1=1
                LEFT JOIN locations l ON pd.location_id = l.location_id OR pr.location_id = l.location_id
                WHERE 1=1
            """
            params = {}
            
            if activity:
                query += """ AND (
                    pd.course_title ILIKE %(activity)s 
                    OR pr.course_title ILIKE %(activity)s 
                    OR pr.activity_title ILIKE %(activity)s
                )"""
                params['activity'] = f"%{activity}%"
            
            if weekday is not None:
                query += " AND pd.weekday = %(weekday)s"
                params['weekday'] = weekday
            
            if district:
                query += " AND l.district = %(district)s"
                params['district'] = district
            
            cur.execute(query, params)
            stats = cur.fetchone()
            
            return {
                "dropin": {
                    "programs": stats['dropin_count'],
                    "centres": stats['dropin_centres']
                },
                "registered": {
                    "programs": stats['registered_count'],
                    "centres": stats['registered_centres']
                },
                "total": {
                    "programs": stats['dropin_count'] + stats['registered_count'],
                    "centres": max(stats['dropin_centres'], stats['registered_centres'])
                }
            }

if __name__ == "__main__":
    print("🚀 Starting Toronto Recreation Finder API")
    print("🌐 Server: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    print("🧪 Test: http://localhost:8000/test/spatial")
    print("📊 Stats: http://localhost:8000/api/stats/summary")
    uvicorn.run("poc_api:app", host="0.0.0.0", port=8000, reload=True)