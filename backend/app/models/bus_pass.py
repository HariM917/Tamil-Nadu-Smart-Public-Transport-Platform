from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class BusPass(Base):
    """Bus pass application and digital pass model."""

    __tablename__ = "bus_passes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Pass details
    category = Column(String(20), nullable=False)  # student, general, senior_citizen
    pass_type = Column(String(20), nullable=False, default="monthly")  # monthly, quarterly, annual
    
    # Document verification
    document_url = Column(String(500), nullable=True)
    document_type = Column(String(50), nullable=True)  # aadhar, student_id, senior_id
    
    # ML verification
    ocr_extracted_text = Column(Text, nullable=True)
    ml_eligibility_score = Column(Float, nullable=True)
    fraud_risk_score = Column(Float, nullable=True)
    ml_verification_status = Column(String(20), default="pending")  # pending, passed, flagged
    
    # Status
    status = Column(String(20), nullable=False, default="pending")  # pending, approved, rejected, expired
    admin_remarks = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # QR Code
    qr_code_data = Column(Text, nullable=True)
    qr_code_url = Column(String(500), nullable=True)
    
    # Validity
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    
    # Amount
    amount = Column(Float, nullable=True)
    payment_status = Column(String(20), default="pending")  # pending, paid, failed
    
    # Timestamps
    applied_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="bus_passes", foreign_keys=[user_id])

    @property
    def is_active(self):
        """Check if pass is currently valid."""
        if self.status != "approved":
            return False
        now = datetime.utcnow()
        return self.valid_from <= now <= self.valid_until if self.valid_from and self.valid_until else False

    def __repr__(self):
        return f"<BusPass {self.id} - {self.category} - {self.status}>"
