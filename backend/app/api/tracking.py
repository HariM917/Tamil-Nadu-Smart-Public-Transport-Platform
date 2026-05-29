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
