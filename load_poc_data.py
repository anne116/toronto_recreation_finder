# load_poc_data_optimized.py - Using GeoJSON for coordinates
import psycopg
import pandas as pd
import json
from typing import Optional

DB_URL = "postgresql://poc:poc123@localhost:5432/poc_db"

def setup_schema(conn):
    """Create tables optimized for GeoJSON + CSV data."""
    with conn.cursor() as cur:
        cur.execute("""
            DROP TABLE IF EXISTS programs_dropin CASCADE;
            DROP TABLE IF EXISTS programs_registered CASCADE;
            DROP TABLE IF EXISTS facilities CASCADE;
            DROP TABLE IF EXISTS locations CASCADE;
            DROP TABLE IF EXISTS wards CASCADE;
            
            -- Main locations table (merged from GeoJSON + CSV)
            CREATE TABLE locations (
                id SERIAL PRIMARY KEY,
                location_id VARCHAR(50) UNIQUE NOT NULL,
                
                -- From GeoJSON (parks-and-recreation-facilities-4326.geojson)
                asset_id INTEGER,
                asset_name VARCHAR(255),
                facility_type VARCHAR(100),
                amenities TEXT,
                address TEXT,  -- Clean address from GeoJSON
                phone VARCHAR(50),
                url TEXT,
                geom GEOMETRY(Point, 4326),  -- Already in GeoJSON!
                
                -- From CSV (locations.csv) - additional details
                parent_location_id VARCHAR(50),
                location_name VARCHAR(255),
                location_type VARCHAR(100),
                accessibility TEXT,
                intersection VARCHAR(255),
                ttc_information TEXT,
                district VARCHAR(100),
                description TEXT,
                
                -- Address components (from CSV if needed)
                street_no VARCHAR(20),
                street_no_suffix VARCHAR(10),
                street_name VARCHAR(100),
                street_type VARCHAR(50),
                street_direction VARCHAR(10),
                postal_code VARCHAR(10)
            );
            
            -- Drop-in programs
            CREATE TABLE programs_dropin (
                id SERIAL PRIMARY KEY,
                location_id VARCHAR(50) REFERENCES locations(location_id),
                course_id VARCHAR(100),
                course_title VARCHAR(255),
                section VARCHAR(100),
                age_min INT,
                age_max INT,
                date_range VARCHAR(100),
                start_hour INT,
                start_minute INT,
                end_hour INT,
                end_minute INT,
                first_date DATE,
                last_date DATE,
                day_of_week VARCHAR(50),
                start_time TIME,
                end_time TIME,
                weekday INT  -- 0=Monday, 6=Sunday
            );
            
            -- Registered programs
            CREATE TABLE programs_registered (
                id SERIAL PRIMARY KEY,
                location_id VARCHAR(50) REFERENCES locations(location_id),
                course_id VARCHAR(100),
                section VARCHAR(100),
                activity_title VARCHAR(255),
                course_title VARCHAR(255),
                days_of_week VARCHAR(100),
                from_to VARCHAR(100),
                start_hour INT,
                start_minute INT,
                end_hour INT,
                end_minute INT,
                activity_url TEXT,
                min_age INT,
                max_age INT,
                program_category VARCHAR(100),
                registration_date DATE,
                status_info TEXT
            );
            
            -- Facilities
            CREATE TABLE facilities (
                id SERIAL PRIMARY KEY,
                facility_id VARCHAR(50),
                location_id VARCHAR(50) REFERENCES locations(location_id),
                facility_type VARCHAR(255),
                permit VARCHAR(100),
                facility_type_code VARCHAR(100),
                facility_rating VARCHAR(100),
                asset_name VARCHAR(255)
            );
            
            -- Wards
            CREATE TABLE wards (
                id SERIAL PRIMARY KEY,
                area_id BIGINT,
                area_name VARCHAR(255),
                area_short_code VARCHAR(10),
                area_desc TEXT,
                geom GEOMETRY(MultiPolygon, 4326)
            );
            
            -- Indexes for performance
            CREATE INDEX idx_locations_location_id ON locations(location_id);
            CREATE INDEX idx_locations_district ON locations(district);
            CREATE INDEX idx_locations_geom ON locations USING GIST(geom);
            CREATE INDEX idx_dropin_location_id ON programs_dropin(location_id);
            CREATE INDEX idx_dropin_weekday ON programs_dropin(weekday);
            CREATE INDEX idx_registered_location_id ON programs_registered(location_id);
            CREATE INDEX idx_facilities_location_id ON facilities(location_id);
            CREATE INDEX idx_wards_geom ON wards USING GIST(geom);
        """)
    conn.commit()
    print("✅ Schema created")

def normalize_district(district):
    """Normalize district names."""
    if pd.isna(district):
        return None
    district = str(district).strip()
    mapping = {
        'etobicoke york': 'Etobicoke York',
        'north york': 'North York',
        'scarborough': 'Scarborough',
        'toronto and east york': 'Toronto and East York',
        'toronto east york': 'Toronto and East York',
    }
    return mapping.get(district.lower(), district.title())

def load_locations(conn):
    """
    Load locations by merging GeoJSON (coordinates) with CSV (details).
    
    Strategy:
    1. Load GeoJSON first (has coordinates + LOCATIONID)
    2. Load CSV into memory as lookup dict
    3. Merge on location_id, preferring GeoJSON for coordinates/address
    """
    print("Loading locations from GeoJSON + CSV merge...")
    
    # Step 1: Load GeoJSON with coordinates
    with open('data/raw_data/parks-and-recreation-facilities-4326.geojson') as f:
        geojson = json.load(f)
    
    # Step 2: Load CSV as lookup dictionary
    csv_df = pd.read_csv('data/raw_data/locations.csv')
    csv_lookup = {}
    for _, row in csv_df.iterrows():
        csv_lookup[str(row['Location ID'])] = row
    
    print(f"  Found {len(geojson['features'])} locations in GeoJSON")
    print(f"  Found {len(csv_lookup)} locations in CSV")
    
    loaded = 0
    matched = 0
    
    with conn.cursor() as cur:
        for feature in geojson['features']:
            try:
                props = feature['properties']
                location_id = str(props['LOCATIONID'])
                
                # Extract coordinates from GeoJSON geometry
                # GeoJSON uses MultiPoint, but we only need the first point
                coords = feature['geometry']['coordinates']
                if feature['geometry']['type'] == 'MultiPoint':
                    lon, lat = coords[0]  # GeoJSON is [lon, lat]
                else:
                    lon, lat = coords
                
                # Get additional details from CSV if available
                csv_data = csv_lookup.get(location_id, {})
                if csv_data is not None and len(csv_data) > 0:
                    matched += 1
                
                cur.execute("""
                    INSERT INTO locations (
                        location_id, asset_id, asset_name, facility_type,
                        amenities, address, phone, url, geom,
                        parent_location_id, location_name, location_type,
                        accessibility, intersection, ttc_information, district,
                        description, street_no, street_no_suffix, street_name,
                        street_type, street_direction, postal_code
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s,
                        ST_SetSRID(ST_MakePoint(%s, %s), 4326),
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (location_id) DO UPDATE SET
                        asset_id = EXCLUDED.asset_id,
                        geom = EXCLUDED.geom
                """, (
                    # From GeoJSON
                    location_id,
                    props.get('ASSET_ID'),
                    props.get('ASSET_NAME'),
                    props.get('TYPE'),
                    props.get('AMENITIES'),
                    props.get('ADDRESS'),
                    props.get('PHONE'),
                    props.get('URL'),
                    lon, lat,  # Coordinates from geometry
                    # From CSV (if available)
                    csv_data.get('Parent Location ID'),
                    csv_data.get('Location Name'),
                    csv_data.get('Location Type'),
                    csv_data.get('Accessibility'),
                    csv_data.get('Intersection'),
                    csv_data.get('TTC Information'),
                    normalize_district(csv_data.get('District')),
                    csv_data.get('Description'),
                    csv_data.get('Street No'),
                    csv_data.get('Street No Suffix'),
                    csv_data.get('Street Name'),
                    csv_data.get('Street Type'),
                    csv_data.get('Street Direction'),
                    csv_data.get('Postal Code')
                ))
                loaded += 1
                
                if loaded % 100 == 0:
                    conn.commit()
                    print(f"  Loaded {loaded} locations...")
                    
            except Exception as e:
                print(f"  Error loading location {props.get('LOCATIONID')}: {e}")
        
        conn.commit()
    
    print(f"✅ Loaded {loaded} locations")
    print(f"   - {matched} matched with CSV details")
    print(f"   - {loaded} have coordinates (100%)")
    return loaded

def parse_day_of_week(day_str):
    """Convert day string to weekday number (0=Monday, 6=Sunday)."""
    if pd.isna(day_str):
        return None
    day_map = {
        'monday': 0, 'mon': 0,
        'tuesday': 1, 'tue': 1, 'tues': 1,
        'wednesday': 2, 'wed': 2,
        'thursday': 3, 'thu': 3, 'thur': 3, 'thurs': 3,
        'friday': 4, 'fri': 4,
        'saturday': 5, 'sat': 5,
        'sunday': 6, 'sun': 6
    }
    return day_map.get(str(day_str).lower().strip(), None)

def load_dropins(conn):
    """Load drop-in programs CSV."""
    print("Loading drop-in programs...")
    df = pd.read_csv('data/raw_data/drop-in.csv')
    
    loaded = 0
    skipped = 0
    
    with conn.cursor() as cur:
        for idx, row in df.iterrows():
            try:
                # Check if location exists
                cur.execute(
                    "SELECT 1 FROM locations WHERE location_id = %s",
                    (str(row['Location ID']),)
                )
                if not cur.fetchone():
                    skipped += 1
                    continue
                
                # Parse time components
                start_hour = int(row['Start Hour']) if pd.notna(row['Start Hour']) else None
                start_minute = int(row['Start Minute']) if pd.notna(row['Start Minute']) else 0
                end_hour = int(row['End Hour']) if pd.notna(row['End Hour']) else None
                end_minute = int(row['End Min']) if pd.notna(row['End Min']) else 0
                
                start_time = f"{start_hour:02d}:{start_minute:02d}:00" if start_hour is not None else None
                end_time = f"{end_hour:02d}:{end_minute:02d}:00" if end_hour is not None else None
                
                weekday = parse_day_of_week(row.get('DayOftheWeek'))
                
                first_date = pd.to_datetime(row['First Date'], errors='coerce') if pd.notna(row.get('First Date')) else None
                last_date = pd.to_datetime(row['Last Date'], errors='coerce') if pd.notna(row.get('Last Date')) else None
                
                cur.execute("""
                    INSERT INTO programs_dropin (
                        location_id, course_id, course_title, section,
                        age_min, age_max, date_range,
                        start_hour, start_minute, end_hour, end_minute,
                        first_date, last_date, day_of_week,
                        start_time, end_time, weekday
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    str(row['Location ID']), row.get('Course_ID'),
                    row.get('Course Title'), row.get('Section'),
                    int(row['Age Min']) if pd.notna(row.get('Age Min')) else None,
                    int(row['Age Max']) if pd.notna(row.get('Age Max')) else None,
                    row.get('Date Range'),
                    start_hour, start_minute, end_hour, end_minute,
                    first_date, last_date, row.get('DayOftheWeek'),
                    start_time, end_time, weekday
                ))
                loaded += 1
                
                if loaded % 100 == 0:
                    conn.commit()
                    print(f"  Loaded {loaded}/{len(df)} programs...")
                    
            except Exception as e:
                print(f"  Error loading program: {e}")
        
        conn.commit()
    
    print(f"✅ Loaded {loaded} drop-in programs ({skipped} skipped - no matching location)")
    return loaded

def load_registered_programs(conn):
    """Load registered programs CSV."""
    print("Loading registered programs...")
    df = pd.read_csv('data/raw_data/registered-programs.csv')
    
    loaded = 0
    skipped = 0
    
    with conn.cursor() as cur:
        for idx, row in df.iterrows():
            try:
                # Check if location exists
                cur.execute(
                    "SELECT 1 FROM locations WHERE location_id = %s",
                    (str(row['Location ID']),)
                )
                if not cur.fetchone():
                    skipped += 1
                    continue
                
                reg_date = pd.to_datetime(row['Registration Date'], errors='coerce') if pd.notna(row.get('Registration Date')) else None
                
                cur.execute("""
                    INSERT INTO programs_registered (
                        location_id, course_id, section, activity_title,
                        course_title, days_of_week, from_to,
                        start_hour, start_minute, end_hour, end_minute,
                        activity_url, min_age, max_age, program_category,
                        registration_date, status_info
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    str(row['Location ID']), row.get('Course_ID'),
                    row.get('Section'), row.get('Activity Title'),
                    row.get('Course Title'), row.get('Days of The Week'),
                    row.get('From To'),
                    int(row['Start Hour']) if pd.notna(row.get('Start Hour')) else None,
                    int(row['Start Min']) if pd.notna(row.get('Start Min')) else None,
                    int(row['End Hour']) if pd.notna(row.get('End Hour')) else None,
                    int(row['End Min']) if pd.notna(row.get('End Min')) else None,
                    row.get('Activity URL'),
                    int(row['Min Age']) if pd.notna(row.get('Min Age')) else None,
                    int(row['Max Age']) if pd.notna(row.get('Max Age')) else None,
                    row.get('Program Category'),
                    reg_date,
                    row.get('Status / Information')
                ))
                loaded += 1
                
                if loaded % 100 == 0:
                    conn.commit()
                    print(f"  Loaded {loaded}/{len(df)} programs...")
                    
            except Exception as e:
                print(f"  Error loading program: {e}")
        
        conn.commit()
    
    print(f"✅ Loaded {loaded} registered programs ({skipped} skipped)")
    return loaded

def load_facilities(conn):
    """Load facilities CSV."""
    print("Loading facilities...")
    df = pd.read_csv('data/raw_data/facilities.csv')
    
    loaded = 0
    skipped = 0
    
    with conn.cursor() as cur:
        for idx, row in df.iterrows():
            try:
                # Check if location exists
                cur.execute(
                    "SELECT 1 FROM locations WHERE location_id = %s",
                    (str(row['Location ID']),)
                )
                if not cur.fetchone():
                    skipped += 1
                    continue
                
                cur.execute("""
                    INSERT INTO facilities (
                        facility_id, location_id, facility_type, permit,
                        facility_type_code, facility_rating, asset_name
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    row.get('Facility ID'),
                    str(row['Location ID']),
                    row.get('Facility Type (Display Name)'),
                    row.get('Permit'),
                    row.get('FacilityType'),
                    row.get('Facility Rating'),
                    row.get('Asset Name')
                ))
                loaded += 1
                
                if loaded % 100 == 0:
                    conn.commit()
                    print(f"  Loaded {loaded}/{len(df)} facilities...")
                    
            except Exception as e:
                print(f"  Error loading facility: {e}")
        
        conn.commit()
    
    print(f"✅ Loaded {loaded} facilities ({skipped} skipped)")
    return loaded

def load_boundaries(conn):
    """Load ward boundaries from GeoJSON."""
    print("Loading ward boundaries...")
    
    with open('data/raw_data/city-wards-data-4326.geojson') as f:
        geojson = json.load(f)
    
    loaded = 0
    
    with conn.cursor() as cur:
        for feature in geojson['features']:
            try:
                props = feature['properties']
                geom_json = json.dumps(feature['geometry'])
                
                cur.execute("""
                    INSERT INTO wards (area_id, area_name, area_short_code, area_desc, geom)
                    VALUES (%s, %s, %s, %s, ST_GeomFromGeoJSON(%s))
                """, (
                    int(props.get('AREA_ID')) if props.get('AREA_ID') else None,
                    props.get('AREA_NAME'),
                    props.get('AREA_SHORT_CODE'),
                    props.get('AREA_DESC'),
                    geom_json
                ))
                loaded += 1
            except Exception as e:
                print(f"  Error loading ward: {e}")
        
        conn.commit()
    
    print(f"✅ Loaded {loaded} wards")
    return loaded

def run_qa_checks(conn):
    """Run comprehensive data quality checks."""
    print("\n📊 Running QA checks...")
    
    with conn.cursor() as cur:
        # Check 1: Locations with coordinates
        cur.execute("SELECT COUNT(*) as total, COUNT(geom) as with_geom FROM locations;")
        result = cur.fetchone()
        print(f"  ✓ Locations: {result[1]}/{result[0]} have coordinates ({result[1]/result[0]*100:.1f}%)")
        
        # Check 2: Programs per location
        cur.execute("""
            SELECT 
                COALESCE(l.location_name, l.asset_name) as name,
                COUNT(pd.id) as dropin_count,
                COUNT(pr.id) as registered_count
            FROM locations l
            LEFT JOIN programs_dropin pd ON l.location_id = pd.location_id
            LEFT JOIN programs_registered pr ON l.location_id = pr.location_id
            GROUP BY l.location_id, l.location_name, l.asset_name
            HAVING COUNT(pd.id) > 0 OR COUNT(pr.id) > 0
            ORDER BY (COUNT(pd.id) + COUNT(pr.id)) DESC
            LIMIT 5;
        """)
        print(f"\n  ✓ Top 5 locations by program count:")
        for row in cur.fetchall():
            print(f"    {row[0][:40]}: {row[1]} drop-in, {row[2]} registered")
        
        # Check 3: Districts
        cur.execute("""
            SELECT district, COUNT(*) as count
            FROM locations
            WHERE district IS NOT NULL
            GROUP BY district
            ORDER BY count DESC;
        """)
        print(f"\n  ✓ Locations by district:")
        for row in cur.fetchall():
            print(f"    {row[0]}: {row[1]} locations")
        
        # Check 4: Data completeness
        cur.execute("""
            SELECT 
                (SELECT COUNT(*) FROM locations) as locations,
                (SELECT COUNT(*) FROM programs_dropin) as dropin,
                (SELECT COUNT(*) FROM programs_registered) as registered,
                (SELECT COUNT(*) FROM facilities) as facilities,
                (SELECT COUNT(*) FROM wards) as wards;
        """)
        result = cur.fetchone()
        print(f"\n  ✓ Data summary:")
        print(f"    Locations: {result[0]}")
        print(f"    Drop-in programs: {result[1]}")
        print(f"    Registered programs: {result[2]}")
        print(f"    Facilities: {result[3]}")
        print(f"    Wards: {result[4]}")

if __name__ == '__main__':
    print("🚀 Starting optimized POC data load...\n")
    
    with psycopg.connect(DB_URL) as conn:
        setup_schema(conn)
        
        # Load in dependency order
        loc_count = load_locations(conn)
        ward_count = load_boundaries(conn)
        dropin_count = load_dropins(conn)
        registered_count = load_registered_programs(conn)
        facility_count = load_facilities(conn)
        
        run_qa_checks(conn)
        
        print(f"\n✅ POC database ready!")
        print(f"   No geocoding needed - all coordinates from GeoJSON!")