from typing import List, Optional
from pydantic import BaseModel


class RouteStopPoint(BaseModel):
    name: str
    lat: float
    lng: float
    order: int
    estimated_minutes: Optional[int] = None


class RouteSearchResult(BaseModel):
    route_no: str
    origin: str
    destination: str
    source_stop: str
    destination_stop: str
    stops_count: int
    distance_km: float
    eta_minutes: int
    stops: List[RouteStopPoint]


class RouteSummary(BaseModel):
    route_no: str
    origin: str
    destination: str
    total_stops: int
    stops: List[RouteStopPoint]
