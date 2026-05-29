from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class Booking(Base):
    """Ticket booking model."""

    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    bus_id = Column(Integer, ForeignKey("buses.id"), nullable=False, index=True)
    
    # Journey details
    source = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)
    travel_date = Column(DateTime, nullable=False)
    
    # Seat
    seat_number = Column(String(5), nullable=True)
    passengers = Column(Integer, default=1)
    
    # Payment
    amount = Column(Float, nullable=False)
    payment_status = Column(String(20), default="pending")  # pending, paid, failed, refunded
    payment_method = Column(String(30), nullable=True)  # upi, card, netbanking
    transaction_id = Column(String(100), nullable=True)
    
    # Status
    status = Column(String(20), default="confirmed")  # confirmed, cancelled, completed
    
    # Timestamps
    booking_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="bookings")
    bus = relationship("Bus")
    ticket = relationship("Ticket", back_populates="booking", uselist=False)

    def __repr__(self):
        return f"<Booking {self.id} - {self.source} to {self.destination}>"


class Ticket(Base):
    """Digital ticket with QR code."""

    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), unique=True, nullable=False)
    
    # QR Data
    qr_data = Column(Text, nullable=False)
    qr_code_url = Column(String(500), nullable=True)
    
    # Ticket info
    ticket_number = Column(String(50), unique=True, nullable=False)
    
    # Status
    is_used = Column(String(20), default="unused")  # unused, used, expired
    
    # Timestamps
    issued_at = Column(DateTime, default=datetime.utcnow)
    used_at = Column(DateTime, nullable=True)

    # Relationships
    booking = relationship("Booking", back_populates="ticket")

    def __repr__(self):
        return f"<Ticket {self.ticket_number}>"
