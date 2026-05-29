from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.schemas.bus import BusResponse


class BookingBase(BaseModel):
    bus_id: int
    source: str
    destination: str
    travel_date: datetime
    seat_number: Optional[str] = None
    passengers: int = 1
    payment_method: Optional[str] = "upi"


class BookingCreate(BookingBase):
    pass


class TicketResponse(BaseModel):
    id: int
    booking_id: int
    qr_data: str
    qr_code_url: Optional[str] = None
    ticket_number: str
    is_used: str
    issued_at: datetime
    used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BookingResponse(BaseModel):
    id: int
    user_id: int
    bus_id: int
    source: str
    destination: str
    travel_date: datetime
    seat_number: Optional[str] = None
    passengers: int
    amount: float
    payment_status: str
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    status: str
    booking_date: datetime
    bus: Optional[BusResponse] = None
    ticket: Optional[TicketResponse] = None

    class Config:
        from_attributes = True
