import os
import csv
import re
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from app.db.session import engine, Base
from app.models.user import User
from app.models.bus import Bus
from app.core.security import hash_password

logger = logging.getLogger(__name__)


def init_db(db: Session) -> None:
    """Initialize database and seed initial admin user, test user, and real Chennai bus routes."""
    # Create all tables if they don't exist
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created.")

    # 1. Seed Admin User
    admin = db.query(User).filter(User.email == "admin@tn.gov.in").first()
    if not admin:
        admin = User(
            email="admin@tn.gov.in",
            phone="+919876543210",
            password_hash=hash_password("admin_password_123"),
            full_name="TN Admin Officer",
            role="admin",
            is_verified=True,
            city="Chennai"
        )
        db.add(admin)
        logger.info("Admin user seeded: admin@tn.gov.in / admin_password_123")
    else:
        logger.info("Admin user already exists.")

    # 2. Seed Mock Test User
    test_user = db.query(User).filter(User.email == "user@gmail.com").first()
    if not test_user:
        test_user = User(
            email="user@gmail.com",
            phone="+919999999999",
            password_hash=hash_password("user1234"),
            full_name="Karthik Rajan",
            role="user",
            is_verified=True,
            city="Chennai",
            date_of_birth=datetime(2000, 5, 15)
        )
        db.add(test_user)
        logger.info("Test user seeded: user@gmail.com / user1234")

    # 3. Seed Buses from Chennai Dataset CSVs
    logger.info("Parsing Chennai dataset CSVs to seed bus routes...")
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    archive_dir = os.path.join(project_root, "archive")
    stopdata_path = os.path.join(archive_dir, "stopdata.csv")
    routedata_path = os.path.join(archive_dir, "routedata1.csv")

    if not os.path.exists(stopdata_path) or not os.path.exists(routedata_path):
        logger.warning(f"Dataset files not found in {archive_dir}. Seeding default fallback buses.")
        seed_fallback_buses(db)
        db.commit()
        return

    try:
        # Load stops database
        stops_dict = {}
        with open(stopdata_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                stop_id = row.get("Stop_id") or row.get("\ufeffStop_id")
                if stop_id:
                    stops_dict[stop_id.strip()] = {
                        "name": row.get("Stop Name", "").strip(),
                        "lat": float(row.get("Lat", 13.0827)),
                        "lng": float(row.get("Lng", 80.2707))
                    }
        logger.info(f"Loaded {len(stops_dict)} bus stops from stopdata.csv")

        # Parse routes and create buses
        db.query(Bus).delete()  # Clear existing buses to avoid duplicates/stale mock data
        
        bus_count = 0
        with open(routedata_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                route_id = row.get("Route_Id")
                bus_details = row.get("bus_details", "")
                route_stops_str = row.get("route", "")
                
                if not route_id or not bus_details or not route_stops_str:
                    continue

                # Split route stops
                stop_ids = [sid.strip() for sid in route_stops_str.split(" ") if sid.strip()]
                resolved_stops = []
                for idx, sid in enumerate(stop_ids):
                    if sid in stops_dict:
                        stop_info = stops_dict[sid]
                        resolved_stops.append({
                            "name": stop_info["name"],
                            "lat": stop_info["lat"],
                            "lng": stop_info["lng"],
                            "order": idx + 1
                        })
                
                if not resolved_stops:
                    continue

                source = resolved_stops[0]["name"]
                destination = resolved_stops[-1]["name"]
                
                # Extract route number (e.g. "19B" from "19B-Towards-saidapet")
                route_num_match = re.match(r"^([A-Z0-9\-]+)", bus_details)
                route_number = route_num_match.group(1) if route_num_match else route_id
                
                # Format bus name cleanly
                bus_name = bus_details.replace("-Towards-", " towards ").replace("-", " ")
                
                # Determine bus type
                bus_type = "ordinary"
                if "ac" in bus_details.lower():
                    bus_type = "ac"
                elif "deluxe" in bus_details.lower() or "dlx" in bus_details.lower():
                    bus_type = "deluxe"
                elif "express" in bus_details.lower() or "exp" in bus_details.lower():
                    bus_type = "express"

                # Seed details
                bus_number = f"TN-01-N-{1000 + int(route_id)}"
                departure_times = ["06:00", "07:30", "08:15", "09:00", "10:30", "13:00", "15:30", "17:15", "18:45", "20:00"]
                dep_time = departure_times[i % len(departure_times)]
                
                # Simple schedule calculation: 20 mins per stop
                duration_mins = len(resolved_stops) * 4
                dep_hours, dep_mins = map(int, dep_time.split(":"))
                arr_mins = dep_mins + duration_mins
                arr_hours = (dep_hours + (arr_mins // 60)) % 24
                arr_mins = arr_mins % 60
                arr_time = f"{arr_hours:02d}:{arr_mins:02d}"

                # Calculate pricing
                base_fare = 10.0
                per_km_fare = 1.2
                if bus_type == "ac":
                    base_fare = 25.0
                    per_km_fare = 2.0
                elif bus_type == "deluxe":
                    base_fare = 18.0
                    per_km_fare = 1.6
                elif bus_type == "express":
                    base_fare = 15.0
                    per_km_fare = 1.4

                bus = Bus(
                    bus_number=bus_number,
                    bus_name=bus_name,
                    bus_type=bus_type,
                    route_number=route_number,
                    route_name=f"{source} - {destination}",
                    source=source,
                    destination=destination,
                    stops=resolved_stops,
                    total_seats=40,
                    departure_time=dep_time,
                    arrival_time=arr_time,
                    current_lat=resolved_stops[0]["lat"],
                    current_lng=resolved_stops[0]["lng"],
                    status="running" if i % 3 != 0 else "idle",
                    base_fare=base_fare,
                    per_km_fare=per_km_fare,
                    is_active=True
                )
                db.add(bus)
                bus_count += 1

        logger.info(f"Successfully seeded {bus_count} real Chennai bus routes from dataset.")
    except Exception as e:
        logger.error(f"Failed to parse and seed Chennai dataset: {e}. Falling back to default buses.")
        seed_fallback_buses(db)

    db.commit()


def seed_fallback_buses(db: Session):
    """Seed default backup buses if dataset files aren't found."""
    db.query(Bus).delete()
    buses = [
        Bus(
            bus_number="TN-01-AN-1234",
            bus_name="Chennai-Madurai Superfast",
            bus_type="express",
            route_number="EXP-101",
            route_name="Chennai Central - Madurai Mattuthavani",
            source="Chennai",
            destination="Madurai",
            departure_time="06:00",
            arrival_time="14:00",
            total_seats=40,
            base_fare=100.0,
            per_km_fare=1.8,
            current_lat=13.0827,
            current_lng=80.2707,
            status="idle",
            stops=[
                {"name": "Chennai Central", "lat": 13.0827, "lng": 80.2707, "order": 1},
                {"name": "Villupuram", "lat": 11.9401, "lng": 79.4861, "order": 2},
                {"name": "Trichy", "lat": 10.7905, "lng": 78.7047, "order": 3},
                {"name": "Madurai Mattuthavani", "lat": 9.9252, "lng": 78.1198, "order": 4}
            ]
        ),
        Bus(
            bus_number="TN-01-C-0017",
            bus_name="Route 17D City Service",
            bus_type="ordinary",
            route_number="17D",
            route_name="Chennai Central - Tambaram Depot",
            source="Chennai",
            destination="Tambaram",
            departure_time="05:00",
            arrival_time="23:00",
            total_seats=50,
            base_fare=10.0,
            per_km_fare=1.0,
            current_lat=13.0827,
            current_lng=80.2707,
            status="running",
            stops=[
                {"name": "Chennai Central", "lat": 13.0827, "lng": 80.2707, "order": 1},
                {"name": "Egmore", "lat": 13.0782, "lng": 80.2608, "order": 2},
                {"name": "T. Nagar", "lat": 13.0418, "lng": 80.2341, "order": 3},
                {"name": "Guindy", "lat": 13.0067, "lng": 80.2206, "order": 4},
                {"name": "Tambaram", "lat": 12.9238, "lng": 80.1214, "order": 5}
            ]
        )
    ]
    for b in buses:
        db.add(b)
    logger.info("Seeded fallback buses.")
