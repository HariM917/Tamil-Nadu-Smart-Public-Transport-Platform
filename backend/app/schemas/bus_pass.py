from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class BusPassBase(BaseModel):
    category: str  # student, general, senior_citizen
    pass_type: str = "monthly"  # monthly, quarterly, annual
    document_type: str  # aadhar, student_id, senior_id


class BusPassCreate(BusPassBase):
    pass


class BusPassUpdate(BaseModel):
    status: Optional[str] = None
    admin_remarks: Optional[str] = None


class BusPassReview(BaseModel):
    status: str  # approved, rejected
    admin_remarks: Optional[str] = None


class BusPassResponse(BusPassBase):
    id: int
    user_id: int
    document_url: Optional[str] = None
    ocr_extracted_text: Optional[str] = None
    ml_eligibility_score: Optional[float] = None
    fraud_risk_score: Optional[float] = None
    ml_verification_status: str
    status: str
    admin_remarks: Optional[str] = None
    qr_code_url: Optional[str] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    amount: Optional[float] = None
    payment_status: str
    applied_at: datetime
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
