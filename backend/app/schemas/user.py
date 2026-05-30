import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=15, pattern=r"^\+?[1-9]\d{1,14}$")
    full_name: str
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = "Chennai"


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    full_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    profile_image: Optional[str] = None


class UserResponse(UserBase):
    id: int
    role: str
    is_verified: bool
    aadhaar_number: Optional[str] = None
    aadhaar_verified: Optional[bool] = False
    profile_image: Optional[str] = None
    created_at: datetime

    @field_validator("aadhaar_number", mode="before")
    @classmethod
    def mask_aadhaar_on_response(cls, v: Optional[str]) -> Optional[str]:
        """Expose only masked Aadhaar (XXXX XXXX 1234) in API responses."""
        if not v:
            return None
        digits = re.sub(r"\D", "", v)
        if len(digits) == 12:
            return f"XXXX XXXX {digits[-4:]}"
        if "XXXX" in str(v).upper():
            return v
        if len(digits) >= 4:
            return f"XXXX XXXX {digits[-4:]}"
        return v

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
