from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class BusBase(BaseModel):
    bus_number: str
    bus_name: Optional[str] = None
    bus_type: str = "ordinary"  # ordinary, express, deluxe, ac
    route_number: Optional[str] = None
    route_name: Optional[str] = None
    source: str
    destination: str
    stops: Optional[List[Dict[str, Any]]] = None  # [{name, lat, lng, order}]
    total_seats: int = 40
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    frequency_minutes: Optional[int] = None
    base_fare: float = 10.0
    per_km_fare: float = 1.5
    driver_name: Optional[str] = "Rajesh Kumar"
    driver_status: Optional[str] = "Active"


class BusCreate(BusBase):
    pass


class BusUpdate(BaseModel):
    bus_name: Optional[str] = None
    bus_type: Optional[str] = None
    route_number: Optional[str] = None
    route_name: Optional[str] = None
    source: Optional[str] = None
    destination: Optional[str] = None
    stops: Optional[List[Dict[str, Any]]] = None
    total_seats: Optional[int] = None
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    frequency_minutes: Optional[int] = None
    base_fare: Optional[float] = None
    per_km_fare: Optional[float] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None
    driver_name: Optional[str] = None
    driver_status: Optional[str] = None


class BusGPSUpdate(BaseModel):
    current_lat: float
    current_lng: float
    current_speed: Optional[float] = 0.0
    heading: Optional[float] = 0.0
    status: Optional[str] = "running"
    driver_name: Optional[str] = None
    driver_status: Optional[str] = None


class BusResponse(BusBase):
    id: int
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    current_speed: Optional[float] = None
    heading: Optional[float] = None
    last_updated: Optional[datetime] = None
    is_active: bool
    status: str

    class Config:
        from_attributes = True
