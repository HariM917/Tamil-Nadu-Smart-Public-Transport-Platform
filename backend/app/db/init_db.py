import os
import csv
import re
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from app.db.session import engine, Base
from app.models.user import User
from app.models.bus import Bus
from app.models.route import Route, Stop, RouteStop
from app.core.security import hash_password

logger = logging.getLogger(__name__)


def init_db(db: Session) -> None:
    """Initialize database and seed initial admin user, test user, and real Chennai bus routes."""
    # Create all tables if they don't exist
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created.")

    # Auto-migrate schemas for new columns
    from sqlalchemy import text
    try:
        db.execute(text("ALTER TABLE buses ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100) DEFAULT 'Rajesh Kumar';"))
        db.execute(text("ALTER TABLE buses ADD COLUMN IF NOT EXISTS driver_status VARCHAR(50) DEFAULT 'Active';"))
        db.execute(text("ALTER TABLE bus_passes ADD COLUMN IF NOT EXISTS bonafide_url VARCHAR(500);"))
        db.execute(text("ALTER TABLE bus_passes ADD COLUMN IF NOT EXISTS ocr_name VARCHAR(255);"))
        db.execute(text("ALTER TABLE bus_passes ADD COLUMN IF NOT EXISTS ocr_dob VARCHAR(100);"))
        db.execute(text("ALTER TABLE bus_passes ADD COLUMN IF NOT EXISTS ocr_aadhaar VARCHAR(100);"))
        db.execute(text("ALTER TABLE bus_passes ADD COLUMN IF NOT EXISTS ocr_address VARCHAR(500);"))
        db.execute(text("ALTER TABLE bus_passes ADD COLUMN IF NOT EXISTS verification_score FLOAT DEFAULT 0.0;"))
        db.execute(text("ALTER TABLE bus_passes ADD COLUMN IF NOT EXISTS verification_level VARCHAR(100);"))
        db.execute(text("ALTER TABLE bus_passes ADD COLUMN IF NOT EXISTS cross_validation_results TEXT;"))
        db.execute(text("ALTER TABLE buses ADD COLUMN IF NOT EXISTS route_id INTEGER;"))
        db.commit()
        logger.info("Database schema columns migrated successfully.")
    except Exception as e:
        db.rollback()
        logger.warning(f"Auto-migration note: {e}")

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
        logger.info("Test user seeded: user@gmail.com / user1234")    # 3. Seed Buses from routes.json
    logger.info("Importing routes.json to seed normalized routes, stops, and buses...")
    import json
    import random
    from app.models.route import Route, Stop, RouteStop
    
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    routes_json_path = os.path.join(project_root, "backend", "app", "db", "routes.json")
    if not os.path.exists(routes_json_path):
        # Fallback to local sibling path
        routes_json_path = os.path.join(os.path.dirname(__file__), "routes.json")

    if not os.path.exists(routes_json_path):
        logger.warning(f"Routes dataset not found in {routes_json_path}. No buses seeded.")
        return

    try:
        with open(routes_json_path, "r", encoding="utf-8") as f:
            routes_data = json.load(f)

        # Clear existing tables using TRUNCATE CASCADE to resolve foreign key constraints
        from sqlalchemy import text
        db.execute(text("TRUNCATE TABLE route_stops, buses, routes, stops CASCADE;"))
        db.commit()

        route_records = {}

        # Seed stops and routes
        for rdata in routes_data:
            route_no = rdata["route_no"]
            origin = rdata["origin"]
            destination = rdata["destination"]
            stops_list = rdata["stops"]

            # Create Route
            route = Route(
                route_no=route_no,
                origin=origin,
                destination=destination,
                total_stops=len(stops_list)
            )
            db.add(route)
            db.flush()
            route_records[route_no] = route

            # Create Stops and RouteStops
            for idx, sdata in enumerate(stops_list):
                stop_name = sdata["name"]
                lat = sdata["lat"]
                lng = sdata["lng"]

                # Check if Stop already exists
                stop = db.query(Stop).filter(Stop.stop_name == stop_name).first()
                if not stop:
                    stop = Stop(
                        stop_name=stop_name,
                        latitude=lat,
                        longitude=lng
                    )
                    db.add(stop)
                    db.flush()

                # Create RouteStop relationship
                route_stop = RouteStop(
                    route_id=route.id,
                    stop_id=stop.id,
                    stop_order=idx + 1,
                    estimated_minutes=5
                )
                db.add(route_stop)

        # Flush all routes, stops, and route stops to database so they are queryable
        db.flush()

        # Seed buses linked to routes
        bus_count = 0
        for idx, (route_no, route) in enumerate(route_records.items()):
            bus_number = f"TN-01-N-{1000 + idx}"
            bus_type = "ordinary"
            if "A" in route_no or "C" in route_no:
                bus_type = random.choice(["deluxe", "express", "ac"])

            drivers = [
                ("Rajesh Kumar", "Active"),
                ("Kannan Muthu", "Active"),
                ("Venkatesh S", "Active"),
                ("Arumugam P", "Active"),
                ("Selvam R", "On Break"),
                ("Murugan T", "Active"),
                ("Kathiravan G", "Active"),
                ("Murali Dharan", "Active")
            ]
            drv_name, drv_status = drivers[idx % len(drivers)]

            # Get first stop coordinates as start position
            first_stop_rs = route.route_stops[0]
            start_lat = first_stop_rs.stop.latitude
            start_lng = first_stop_rs.stop.longitude

            # Estimate duration: 4 mins per stop
            duration_mins = len(route.route_stops) * 4
            departure_times = ["06:00", "07:30", "08:15", "09:00", "10:30", "13:00", "15:30", "17:15", "18:45", "20:00"]
            dep_time = departure_times[idx % len(departure_times)]
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
                bus_name=f"Route {route_no} - {route.origin} towards {route.destination}",
                bus_type=bus_type,
                route_id=route.id,
                route_number=route_no,
                route_name=f"{route.origin} - {route.destination}",
                source=route.origin,
                destination=route.destination,
                total_seats=40,
                departure_time=dep_time,
                arrival_time=arr_time,
                current_lat=start_lat,
                current_lng=start_lng,
                status=drv_status.lower() if drv_status == "On Break" else "running",
                driver_name=drv_name,
                driver_status=drv_status,
                base_fare=base_fare,
                per_km_fare=per_km_fare,
                is_active=True
            )
            db.add(bus)
            bus_count += 1

        db.commit()
        logger.info(f"Successfully seeded {bus_count} normalized routes, stops, and buses.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed normalized routes/stops: {e}")
        raise
