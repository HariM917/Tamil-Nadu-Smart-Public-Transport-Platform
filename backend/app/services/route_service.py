"""Route search service — source to destination matching against PostgreSQL route tables."""
import math
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload

from app.models.route import Route, Stop, RouteStop


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two coordinates in kilometres."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _normalize(name: str) -> str:
    return name.strip().lower()


class RouteService:
    """Find routes connecting two stops with distance and ETA estimates."""

    @staticmethod
    def search_routes(db: Session, source: str, destination: str) -> List[Dict[str, Any]]:
        """
        Return routes where source appears before destination on the same route.
        Includes ordered stops, segment distance (km), and ETA (minutes).
        """
        if not source.strip() or not destination.strip():
            return []

        src_q = _normalize(source)
        dest_q = _normalize(destination)

        routes = (
            db.query(Route)
            .options(joinedload(Route.route_stops).joinedload(RouteStop.stop))
            .all()
        )

        results: List[Dict[str, Any]] = []

        for route in routes:
            ordered = sorted(route.route_stops, key=lambda rs: rs.stop_order)
            stop_names = [rs.stop.stop_name for rs in ordered]

            src_idx = next(
                (i for i, n in enumerate(stop_names) if src_q in _normalize(n)),
                None,
            )
            dest_idx = next(
                (i for i, n in enumerate(stop_names) if dest_q in _normalize(n)),
                None,
            )

            if src_idx is None or dest_idx is None or src_idx >= dest_idx:
                continue

            segment = ordered[src_idx : dest_idx + 1]
            distance_km = 0.0
            for i in range(len(segment) - 1):
                s1, s2 = segment[i].stop, segment[i + 1].stop
                distance_km += _haversine_km(s1.latitude, s1.longitude, s2.latitude, s2.longitude)

            # ETA: cumulative scheduled minutes between stops, minimum 10
            eta_minutes = sum(rs.estimated_minutes for rs in segment[1:]) or max(
                10, (dest_idx - src_idx) * 4
            )

            results.append(
                {
                    "route_no": route.route_no,
                    "origin": route.origin,
                    "destination": route.destination,
                    "source_stop": stop_names[src_idx],
                    "destination_stop": stop_names[dest_idx],
                    "stops_count": dest_idx - src_idx + 1,
                    "distance_km": round(distance_km, 2),
                    "eta_minutes": int(eta_minutes),
                    "stops": [
                        {
                            "name": rs.stop.stop_name,
                            "lat": rs.stop.latitude,
                            "lng": rs.stop.longitude,
                            "order": rs.stop_order,
                            "estimated_minutes": rs.estimated_minutes,
                        }
                        for rs in segment
                    ],
                }
            )

        results.sort(key=lambda r: (r["eta_minutes"], r["distance_km"]))
        return results

    @staticmethod
    def list_all_routes(db: Session) -> List[Dict[str, Any]]:
        """List all routes with stop summaries for dropdowns."""
        routes = (
            db.query(Route)
            .options(joinedload(Route.route_stops).joinedload(RouteStop.stop))
            .order_by(Route.route_no)
            .all()
        )
        out = []
        for route in routes:
            ordered = sorted(route.route_stops, key=lambda rs: rs.stop_order)
            out.append(
                {
                    "route_no": route.route_no,
                    "origin": route.origin,
                    "destination": route.destination,
                    "total_stops": route.total_stops or len(ordered),
                    "stops": [
                        {
                            "name": rs.stop.stop_name,
                            "lat": rs.stop.latitude,
                            "lng": rs.stop.longitude,
                            "order": rs.stop_order,
                        }
                        for rs in ordered
                    ],
                }
            )
        return out


route_service = RouteService()
