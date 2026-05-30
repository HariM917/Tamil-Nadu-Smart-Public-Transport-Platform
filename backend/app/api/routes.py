"""Public route information APIs — source/destination search against PostgreSQL."""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.route import RouteSearchResult, RouteSummary
from app.services.route_service import route_service

router = APIRouter()


@router.get("/search", response_model=List[RouteSearchResult])
def search_routes(
    source: str = Query(..., min_length=2, description="Source stop name"),
    destination: str = Query(..., min_length=2, description="Destination stop name"),
    db: Session = Depends(get_db),
):
    """
    Find routes connecting source → destination (directional).
    Returns matching routes with stops, distance (km), and ETA (minutes).
    """
    return route_service.search_routes(db, source, destination)


@router.get("/list", response_model=List[RouteSummary])
def list_routes(db: Session = Depends(get_db)):
    """List all seeded routes with ordered stops."""
    return route_service.list_all_routes(db)


@router.get("/stops")
def list_stops(db: Session = Depends(get_db)):
    """Autocomplete helper — all stop names in the network."""
    from app.models.route import Stop

    stops = db.query(Stop.stop_name).order_by(Stop.stop_name).all()
    return [s[0] for s in stops]
