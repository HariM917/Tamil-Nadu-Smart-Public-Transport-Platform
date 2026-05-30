from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class Bus(Base):
    """Bus entity for tracking and booking."""

    __tablename__ = "buses"

    id = Column(Integer, primary_key=True, index=True)
    bus_number = Column(String(20), unique=True, nullable=False, index=True)
    bus_name = Column(String(100), nullable=True)
    bus_type = Column(String(30), nullable=False, default="ordinary")  # ordinary, express, deluxe, ac
    
    # Route Link
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=True, index=True)
    route = relationship("Route", back_populates="buses")
    
    # Route Details (remains for compatibility/quick lookup)
    route_number = Column(String(20), nullable=True)
    route_name = Column(String(200), nullable=True)
    source = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)

    @property
    def stops(self):
        """Dynamic backward-compatible property for route stops."""
        if not self.route or not self.route.route_stops:
            return []
        return [
            {
                "name": rs.stop.stop_name,
                "lat": rs.stop.latitude,
                "lng": rs.stop.longitude,
                "order": rs.stop_order
            }
            for rs in self.route.route_stops
        ]
    
    # Capacity
    total_seats = Column(Integer, nullable=False, default=40)
    
    # Schedule
    departure_time = Column(String(10), nullable=True)  # "06:30"
    arrival_time = Column(String(10), nullable=True)  # "10:30"
    frequency_minutes = Column(Integer, nullable=True)  # For city buses
    
    # Current tracking
    current_lat = Column(Float, nullable=True, default=13.0827)  # Chennai default
    current_lng = Column(Float, nullable=True, default=80.2707)
    current_speed = Column(Float, nullable=True, default=0)
    heading = Column(Float, nullable=True, default=0)  # Direction in degrees
    last_updated = Column(DateTime, nullable=True)
    
    # Driver details
    driver_name = Column(String(100), nullable=True, default="Rajesh Kumar")
    driver_status = Column(String(50), nullable=True, default="Active") # Active, On Break, Resting
    
    # Status
    is_active = Column(Boolean, default=True)
    status = Column(String(20), default="idle")  # idle, running, maintenance
    
    # Fare
    base_fare = Column(Float, default=10.0)
    per_km_fare = Column(Float, default=1.5)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Bus {self.bus_number} - {self.route_name}>"
