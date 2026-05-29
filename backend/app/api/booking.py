from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.booking import Booking
from app.schemas.booking import BookingCreate, BookingResponse
from app.schemas.bus import BusResponse
from app.services.booking_service import booking_service

router = APIRouter()


@router.get("/search", response_model=List[BusResponse])
def search_buses(
    source: str = Query(...),
    destination: str = Query(...),
    db: Session = Depends(get_db)
):
    """Find available buses operating between a given source and destination."""
    return booking_service.search_buses(db, source, destination)


@router.get("/seats", response_model=List[str])
def get_seats(
    bus_id: int = Query(...),
    travel_date: str = Query(...),  # Format: "YYYY-MM-DD"
    db: Session = Depends(get_db)
):
    """Retrieve already booked seats for a bus on a specific travel date."""
    try:
        parsed_date = datetime.strptime(travel_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD."
        )
    return booking_service.get_booked_seats(db, bus_id, parsed_date)


@router.post("/create", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking_in: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reserve seats on a bus and generate a pending ticket."""
    return booking_service.create_booking(db, current_user, booking_in)


@router.post("/{booking_id}/pay", response_model=BookingResponse)
def pay_booking(
    booking_id: int,
    transaction_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process mock payment for a reserved ticket booking using transaction reference."""
    return booking_service.pay_booking(db, booking_id, current_user, transaction_id)


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a confirmed booking and request refund if already paid."""
    return booking_service.cancel_booking(db, booking_id, current_user)


@router.get("/history", response_model=List[BookingResponse])
def get_booking_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve history of all bookings made by the current logged-in passenger."""
    return db.query(Booking).filter(Booking.user_id == current_user.id).order_by(Booking.booking_date.desc()).all()


@router.get("/{booking_id}/ticket", response_model=BookingResponse)
def get_booking_ticket(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full passenger ticket receipt and QR validator code."""
    booking = db.query(Booking).filter(
        Booking.id == booking_id, Booking.user_id == current_user.id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found."
        )
    return booking
