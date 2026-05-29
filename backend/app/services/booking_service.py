import uuid
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.booking import Booking, Ticket
from app.models.bus import Bus
from app.models.user import User
from app.schemas.booking import BookingCreate
from app.services.qr_service import qr_service

logger = logging.getLogger(__name__)


class BookingService:
    """Service to handle online bus ticket search, seat booking, payment placeholders, and ticket/QR generation."""

    @staticmethod
    def search_buses(db: Session, source: str, destination: str) -> List[Bus]:
        """
        Search for available buses running between source and destination.
        Matches direct source/destination OR intermediate stops.
        """
        if not source or not destination:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Source and destination are required."
            )

        # Retrieve all active buses
        buses = db.query(Bus).filter(Bus.is_active == True).all()
        matching_buses = []

        for bus in buses:
            # Case insensitive direct match
            source_match = bus.source.lower() == source.lower()
            dest_match = bus.destination.lower() == destination.lower()

            if source_match and dest_match:
                matching_buses.append(bus)
                continue

            # Intermediate stops search
            # Stops structure: [{"name": "Stop A", "lat": 12.3, "lng": 80.1, "order": 1}]
            if bus.stops:
                try:
                    stops_list = bus.stops if isinstance(bus.stops, list) else []
                    
                    # Find index of source and destination in stops list
                    source_idx = -1
                    dest_idx = -1

                    # Add source/destination as stops if not present to ease logic
                    all_points = [{"name": bus.source, "order": 0}]
                    for idx, s in enumerate(stops_list):
                        all_points.append({"name": s.get("name", ""), "order": idx + 1})
                    all_points.append({"name": bus.destination, "order": len(stops_list) + 1})

                    for idx, pt in enumerate(all_points):
                        name = pt.get("name", "").lower()
                        if name == source.lower():
                            source_idx = idx
                        if name == destination.lower():
                            dest_idx = idx

                    # If both exist and source is visited BEFORE destination
                    if source_idx != -1 and dest_idx != -1 and source_idx < dest_idx:
                        matching_buses.append(bus)
                except Exception as e:
                    logger.error(f"Error parsing stops for bus {bus.bus_number}: {e}")

        return matching_buses

    @staticmethod
    def get_booked_seats(db: Session, bus_id: int, travel_date: datetime) -> List[str]:
        """Get a list of seat numbers that are already booked for a bus on a specific date."""
        # Normalize date to start of day for simple comparison
        start_of_day = travel_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = travel_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        bookings = db.query(Booking).filter(
            Booking.bus_id == bus_id,
            Booking.travel_date.between(start_of_day, end_of_day),
            Booking.status == "confirmed"
        ).all()

        seats = []
        for b in bookings:
            if b.seat_number:
                # Support comma separated seat lists (e.g. "12,13")
                seats.extend([s.strip() for s in b.seat_number.split(",") if s.strip()])
        return seats

    @staticmethod
    def create_booking(db: Session, user: User, schema: BookingCreate) -> Booking:
        """Create a booking, verify seat availability, calculate fare, and generate QR code ticket."""
        bus = db.query(Bus).filter(Bus.id == schema.bus_id, Bus.is_active == True).first()
        if not bus:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bus not found or inactive."
            )

        # Validate travel date is in the future
        if schema.travel_date.date() < datetime.utcnow().date():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Travel date cannot be in the past."
            )

        # Check seat availability
        if schema.seat_number:
            requested_seats = [s.strip() for s in schema.seat_number.split(",") if s.strip()]
            booked_seats = BookingService.get_booked_seats(db, schema.bus_id, schema.travel_date)
            
            duplicate_seats = set(requested_seats).intersection(set(booked_seats))
            if duplicate_seats:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Seats {', '.join(duplicate_seats)} are already booked."
                )

        # Calculate fare (simple mock: base fare * passengers)
        # In a real app we might calculate fare between specific stops
        amount = bus.base_fare * schema.passengers

        # Create Booking
        db_booking = Booking(
            user_id=user.id,
            bus_id=bus.id,
            source=schema.source,
            destination=schema.destination,
            travel_date=schema.travel_date,
            seat_number=schema.seat_number,
            passengers=schema.passengers,
            amount=amount,
            payment_status="pending",
            payment_method=schema.payment_method,
            status="confirmed"
        )
        db.add(db_booking)
        db.commit()
        db.refresh(db_booking)

        # Auto create ticket with QR code
        ticket_number = f"TN-TKT-{uuid.uuid4().hex[:10].upper()}"
        qr_content = f"TICKET:{ticket_number}:{schema.source}->{schema.destination}:{schema.travel_date.strftime('%Y-%m-%d')}"
        qr_base64 = qr_service.generate_qr_base64(qr_content)

        db_ticket = Ticket(
            booking_id=db_booking.id,
            qr_data=qr_content,
            qr_code_url=qr_base64,
            ticket_number=ticket_number,
            is_used="unused"
        )
        db.add(db_ticket)
        db.commit()
        
        db.refresh(db_booking)
        return db_booking

    @staticmethod
    def pay_booking(db: Session, booking_id: int, user: User, transaction_id: str) -> Booking:
        """Mock payment processor. Transition booking payment_status to 'paid'."""
        booking = db.query(Booking).filter(
            Booking.id == booking_id, Booking.user_id == user.id
        ).first()

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found."
            )

        booking.payment_status = "paid"
        booking.transaction_id = transaction_id
        db.commit()
        db.refresh(booking)
        return booking

    @staticmethod
    def cancel_booking(db: Session, booking_id: int, user: User) -> Booking:
        """Cancel a booking, releasing seat and updating ticket status."""
        booking = db.query(Booking).filter(
            Booking.id == booking_id, Booking.user_id == user.id
        ).first()

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found."
            )

        if booking.travel_date < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Completed journeys cannot be cancelled."
            )

        booking.status = "cancelled"
        if booking.payment_status == "paid":
            booking.payment_status = "refunded"

        db.commit()
        db.refresh(booking)
        return booking


booking_service = BookingService()
