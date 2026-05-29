from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base


class User(Base):
    """User model for authentication and profile management."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone = Column(String(15), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    date_of_birth = Column(DateTime, nullable=True)
    gender = Column(String(10), nullable=True)
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True, default="Chennai")
    role = Column(String(20), nullable=False, default="user")  # user, admin
    is_verified = Column(Boolean, default=False)
    aadhaar_number = Column(String(12), nullable=True, unique=True)
    aadhaar_verified = Column(Boolean, default=False)
    profile_image = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    bus_passes = relationship("BusPass", back_populates="user", lazy="dynamic", foreign_keys="[BusPass.user_id]")
    bookings = relationship("Booking", back_populates="user", lazy="dynamic")

    def __repr__(self):
        return f"<User {self.email or self.phone}>"
