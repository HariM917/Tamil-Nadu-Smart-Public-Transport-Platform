from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.bus import Bus
from app.schemas.bus import BusResponse
from app.services.tracking_service import tracking_service

router = APIRouter()


@router.get("/list", response_model=List[BusResponse])
def list_buses(db: Session = Depends(get_db)):
    """List all available buses in the database."""
    return db.query(Bus).all()


@router.get("/search", response_model=List[BusResponse])
def search_buses(
    query: str = Query(..., description="Bus number, route number, source or destination"),
    db: Session = Depends(get_db)
):
    """Search for buses by matching bus number, route number, source, or destination."""
    search_query = f"%{query}%"
    return db.query(Bus).filter(
        Bus.is_active == True,
        (Bus.bus_number.ilike(search_query)) |
        (Bus.route_number.ilike(search_query)) |
        (Bus.source.ilike(search_query)) |
        (Bus.destination.ilike(search_query))
    ).all()


@router.get("/track/{bus_id}")
def track_bus(
    bus_id: int,
    destination: str = Query(None, description="Name of the stop/destination to calculate ETA to"),
    db: Session = Depends(get_db)
):
    """
    Trigger mock real-time GPS update step for a bus and return its 
    current location, heading, speed, and ETA predictions.
    """
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bus not found."
        )

    # Simulate GPS location movement step
    updated_bus = tracking_service.simulate_step(db, bus)

    # Predict ETA if destination provided, else use final destination
    target_dest = destination or bus.destination
    eta_info = tracking_service.get_eta_predictions(updated_bus, target_dest)

    # Convert bus model to Pydantic Response for cleanliness
    bus_response = BusResponse.from_orm(updated_bus)

    return {
        "bus": bus_response,
        "tracking": eta_info
    }


from app.schemas.bus import BusGPSUpdate
from datetime import datetime

@router.post("/{bus_id}/gps-update", response_model=BusResponse)
def gps_update(
    bus_id: int,
    gps_in: BusGPSUpdate,
    db: Session = Depends(get_db)
):
    """
    Simulated Bus GPS Device endpoint. Pushes coordinate, speed, 
    heading, and driver/status updates directly to the database.
    """
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bus not found."
        )

    bus.current_lat = gps_in.current_lat
    bus.current_lng = gps_in.current_lng
    if gps_in.current_speed is not None:
        bus.current_speed = gps_in.current_speed
    if gps_in.heading is not None:
        bus.heading = gps_in.heading
    if gps_in.status is not None:
        bus.status = gps_in.status
    if gps_in.driver_name is not None:
        bus.driver_name = gps_in.driver_name
    if gps_in.driver_status is not None:
        bus.driver_status = gps_in.driver_status
        
    bus.last_updated = datetime.utcnow()
    
    db.commit()
    db.refresh(bus)
    return bus


@router.get("/status/{bus_id}")
def get_bus_tracking_status(bus_id: int, db: Session = Depends(get_db)):
    """
    Get tracking status formatted specifically for the tracking system.
    """
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bus not found."
        )
    
    # Calculate ETA to final destination
    eta_info = tracking_service.get_eta_predictions(bus, bus.destination)
    
    return {
        "bus_number": bus.bus_number,
        "route_no": bus.route_number or bus.bus_number,
        "current_stop": eta_info.get("current_stop", "Unknown"),
        "next_stop": eta_info.get("next_stop", "Unknown"),
        "speed": int(bus.current_speed or 0),
        "eta": int(eta_info.get("eta_minutes", 0)),
        "status": bus.status.capitalize() if bus.status else "Idle"
    }
