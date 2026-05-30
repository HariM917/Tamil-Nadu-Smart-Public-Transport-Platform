from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class PassTypeInfo(BaseModel):
    category: str
    label: str
    emoji: str
    pricing: Dict[str, float]


class OCRPreviewResponse(BaseModel):
    ocr_name: Optional[str] = None
    ocr_dob: Optional[str] = None
    ocr_aadhaar: Optional[str] = None
    ocr_address: Optional[str] = None
    masked_aadhaar: Optional[str] = None


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


from app.schemas.user import UserResponse

class BusPassResponse(BusPassBase):
    id: int
    user_id: int
    document_url: Optional[str] = None
    bonafide_url: Optional[str] = None
    ocr_extracted_text: Optional[str] = Field(
        default=None, description="Raw OCR withheld in production responses"
    )
    ml_eligibility_score: Optional[float] = None
    fraud_risk_score: Optional[float] = None
    ml_verification_status: str
    ocr_name: Optional[str] = None
    ocr_dob: Optional[str] = None
    ocr_aadhaar: Optional[str] = None
    ocr_address: Optional[str] = None
    verification_score: Optional[float] = None
    verification_level: Optional[str] = None
    cross_validation_results: Optional[str] = None
    status: str
    admin_remarks: Optional[str] = None
    qr_code_url: Optional[str] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    amount: Optional[float] = None
    payment_status: str
    applied_at: datetime
    reviewed_at: Optional[datetime] = None
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True
