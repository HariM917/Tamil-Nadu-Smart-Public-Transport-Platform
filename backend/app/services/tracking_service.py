import math
import random
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.bus import Bus
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class TrackingService:
    """Service to handle mock real-time GPS tracking and ETA predictions."""

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate the great-circle distance between two points in kilometers."""
        R = 6371.0  # Earth radius in kilometers

        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

        return R * c

    @staticmethod
    def simulate_step(db: Session, bus: Bus) -> Bus:
        """
        Simulate a step of movement along the bus's stops.
        If stops are defined, interpolate position. Otherwise, do a small random walk.
        """
        # Chennai default coords as fallback
        default_lat, default_lng = 13.0827, 80.2707

        if not bus.stops or len(bus.stops) < 2:
            # Small random walk to simulate motion around default
            lat = bus.current_lat or default_lat
            lng = bus.current_lng or default_lng
            
            # Change by up to ~100-200 meters
            lat += random.uniform(-0.001, 0.001)
            lng += random.uniform(-0.001, 0.001)
            
            bus.current_lat = lat
            bus.current_lng = lng
            bus.current_speed = random.uniform(20.0, 50.0)  # km/h
            bus.heading = random.uniform(0.0, 360.0)
            bus.last_updated = datetime.utcnow()
            db.commit()
            return bus

        stops = bus.stops if isinstance(bus.stops, list) else []
        n_stops = len(stops)

        # Dynamic simulation: use minutes of current hour to determine position along route
        now = datetime.utcnow()
        total_cycle_minutes = 60
        progress = (now.minute * 60 + now.second) / (total_cycle_minutes * 60.0)  # 0.0 to 1.0

        # Map progress to current stop segment
        segment_progress = progress * (n_stops - 1)
        current_segment_idx = int(segment_progress)
        next_segment_idx = min(current_segment_idx + 1, n_stops - 1)
        segment_t = segment_progress - current_segment_idx  # 0.0 to 1.0 within segment

        # Interpolate coordinates
        start_stop = stops[current_segment_idx]
        end_stop = stops[next_segment_idx]

        start_lat = float(start_stop.get("lat", default_lat))
        start_lng = float(start_stop.get("lng", default_lng))
        end_lat = float(end_stop.get("lat", default_lat))
        end_lng = float(end_stop.get("lng", default_lng))

        bus.current_lat = start_lat + (end_lat - start_lat) * segment_t
        bus.current_lng = start_lng + (end_lng - start_lng) * segment_t

        # Calculate bearing / heading
        d_lon = math.radians(end_lng - start_lng)
        lat1 = math.radians(start_lat)
        lat2 = math.radians(end_lat)
        y = math.sin(d_lon) * math.cos(lat2)
        x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(d_lon)
        bearing = math.degrees(math.atan2(y, x))
        bus.heading = (bearing + 360.0) % 360.0

        # Speed estimation
        bus.current_speed = random.uniform(25.0, 45.0) if current_segment_idx != next_segment_idx else 0.0
        bus.last_updated = datetime.utcnow()
        bus.status = "running" if bus.current_speed > 0 else "idle"

        db.commit()
        return bus

    @staticmethod
    def get_eta_predictions(bus: Bus, destination_name: str) -> Dict[str, Any]:
        """Calculate the ETA prediction from the bus's current location to a given destination stop."""
        if not bus.current_lat or not bus.current_lng:
            return {"eta_minutes": 15, "distance_km": 5.0, "message": "GPS signal unavailable"}

        # Find target stop coordinates
        dest_lat, dest_lng = None, None
        if bus.destination.lower() == destination_name.lower():
            # Match final destination
            # If stops list has details, take the last stop's coordinate. Otherwise use default estimation
            if bus.stops and len(bus.stops) > 0:
                last_stop = bus.stops[-1]
                dest_lat = float(last_stop.get("lat"))
                dest_lng = float(last_stop.get("lng"))
        elif bus.stops:
            for s in bus.stops:
                if s.get("name", "").lower() == destination_name.lower():
                    dest_lat = float(s.get("lat"))
                    dest_lng = float(s.get("lng"))
                    break

        if dest_lat is None or dest_lng is None:
            # Fallback estimation
            return {"eta_minutes": 10, "distance_km": 3.5, "message": "Estimated based on average route speed"}

        # Distance calculation
        dist = TrackingService.haversine_distance(
            bus.current_lat, bus.current_lng, dest_lat, dest_lng
        )

        # ETA calculation: distance / average city speed (30 km/h)
        avg_speed_kmh = bus.current_speed if bus.current_speed and bus.current_speed > 10 else 30.0
        time_hours = dist / avg_speed_kmh
        eta_minutes = math.ceil(time_hours * 60.0)

        # Add buffer for stops/traffic
        eta_minutes += 2

        return {
            "eta_minutes": eta_minutes,
            "distance_km": round(dist, 2),
            "current_speed_kmh": round(avg_speed_kmh, 1),
            "message": "Live tracking active"
        }


tracking_service = TrackingService()
