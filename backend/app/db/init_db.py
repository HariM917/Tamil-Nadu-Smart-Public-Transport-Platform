import logging
from datetime import datetime
from sqlalchemy.orm import Session

from app.db.session import engine, Base
from app.models.user import User
from app.models.bus import Bus
from app.core.security import hash_password

logger = logging.getLogger(__name__)


def init_db(db: Session) -> None:
    """Initialize database and seed initial admin user and mock bus schedules."""
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

    # 3. Seed Buses
    existing_buses = db.query(Bus).count()
    if existing_buses == 0:
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
                bus_number="TN-37-BY-5678",
                bus_name="Coimbatore-Salem Express AC",
                bus_type="ac",
                route_number="AC-402",
                route_name="Coimbatore Gandhipuram - Salem Junction",
                source="Coimbatore",
                destination="Salem",
                departure_time="08:30",
                arrival_time="12:00",
                total_seats=36,
                base_fare=150.0,
                per_km_fare=2.5,
                current_lat=11.0168,
                current_lng=76.9558,
                status="idle",
                stops=[
                    {"name": "Coimbatore Gandhipuram", "lat": 11.0168, "lng": 76.9558, "order": 1},
                    {"name": "Tiruppur", "lat": 11.1085, "lng": 77.3411, "order": 2},
                    {"name": "Erode", "lat": 11.3410, "lng": 77.7172, "order": 3},
                    {"name": "Salem Junction", "lat": 11.6643, "lng": 78.1460, "order": 4}
                ]
            ),
            Bus(
                bus_number="TN-19-M-2468",
                bus_name="ECR Deluxe Tourer",
                bus_type="deluxe",
                route_number="DLX-77",
                route_name="Koyambedu (Chennai) - Pondicherry Bus Stand",
                source="Chennai",
                destination="Pondicherry",
                departure_time="14:00",
                arrival_time="17:30",
                total_seats=42,
                base_fare=120.0,
                per_km_fare=1.6,
                current_lat=13.0689,
                current_lng=80.2033,
                status="idle",
                stops=[
                    {"name": "Koyambedu", "lat": 13.0689, "lng": 80.2033, "order": 1},
                    {"name": "Sholinganallur", "lat": 12.9010, "lng": 80.2279, "order": 2},
                    {"name": "Mahabalipuram", "lat": 12.6269, "lng": 80.1927, "order": 3},
                    {"name": "Pondicherry Bus Stand", "lat": 11.9416, "lng": 79.8083, "order": 4}
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
        
        for bus in buses:
            db.add(bus)
        logger.info(f"Seeded {len(buses)} active buses.")
    else:
        logger.info("Buses already seeded.")

    db.commit()
