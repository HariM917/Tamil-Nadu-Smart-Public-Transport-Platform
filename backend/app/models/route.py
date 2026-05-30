from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class Route(Base):
    """Normalized Route entity."""

    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    route_no = Column(String(20), unique=True, nullable=False, index=True)
    origin = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)
    total_stops = Column(Integer, nullable=False, default=0)

    # Relationships
    route_stops = relationship("RouteStop", back_populates="route", cascade="all, delete-orphan", order_by="RouteStop.stop_order")
    buses = relationship("Bus", back_populates="route")


class Stop(Base):
    """Normalized Stop entity representing a physical bus stop."""

    __tablename__ = "stops"

    id = Column(Integer, primary_key=True, index=True)
    stop_name = Column(String(150), unique=True, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)


class RouteStop(Base):
    """Association table linking routes to stops with order and timing."""

    __tablename__ = "route_stops"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    stop_id = Column(Integer, ForeignKey("stops.id"), nullable=False)
    stop_order = Column(Integer, nullable=False)
    estimated_minutes = Column(Integer, nullable=False, default=5)

    # Relationships
    route = relationship("Route", back_populates="route_stops")
    stop = relationship("Stop")
