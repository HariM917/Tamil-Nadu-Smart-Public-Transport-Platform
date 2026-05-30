from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.bus_pass import BusPass
from app.schemas.bus_pass import BusPassResponse, OCRPreviewResponse, PassTypeInfo
from app.services.pass_service import pass_service

router = APIRouter()

VALID_CATEGORIES = ["student", "general", "senior_citizen"]


@router.get("/types", response_model=List[PassTypeInfo])
def list_pass_types():
    """Return pass categories with monthly/quarterly/annual pricing (INR)."""
    return pass_service.get_pass_types()


@router.post("/ocr-aadhaar", response_model=OCRPreviewResponse)
def preview_aadhaar_ocr(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Wizard step: OCR extract name, DOB, masked Aadhaar from uploaded document."""
    return pass_service.preview_aadhaar_ocr(file)


@router.post("/apply", response_model=BusPassResponse, status_code=status.HTTP_201_CREATED)
def apply_pass(
    category: str = Form(...),
    pass_type: str = Form("monthly"),
    document_type: str = Form("aadhar"),
    full_name: str = Form(...),
    form_dob: Optional[str] = Form(None),
    aadhaar_last4: str = Form(..., min_length=4, max_length=4),
    aadhaar_file: UploadFile = File(...),
    college_id_file: UploadFile = File(None),
    bonafide_file: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Apply for a digital bus pass.
    Requires Aadhaar upload; students must also upload College ID + Bonafide.
    """
    if category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}",
        )
    if not current_user.aadhaar_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete Aadhaar verification in your profile before applying.",
        )

    return pass_service.apply_for_pass(
        db=db,
        user=current_user,
        category=category,
        pass_type=pass_type,
        document_type=document_type,
        aadhaar_file=aadhaar_file,
        full_name=full_name,
        form_dob=form_dob,
        aadhaar_last4=aadhaar_last4,
        college_id_file=college_id_file,
        bonafide_file=bonafide_file,
    )


@router.get("/my-passes", response_model=List[BusPassResponse])
def get_my_passes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(BusPass)
        .filter(BusPass.user_id == current_user.id)
        .order_by(BusPass.applied_at.desc())
        .all()
    )


@router.get("/status/{pass_id}", response_model=BusPassResponse)
def get_pass_status(
    pass_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bus_pass = (
        db.query(BusPass)
        .filter(BusPass.id == pass_id, BusPass.user_id == current_user.id)
        .first()
    )
    if not bus_pass:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    return bus_pass


@router.post("/renew/{pass_id}", response_model=BusPassResponse)
def renew_pass(
    pass_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return pass_service.renew_pass(db, pass_id, current_user)


@router.post("/{pass_id}/pay", response_model=BusPassResponse)
def pay_pass(
    pass_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return pass_service.confirm_payment(db, pass_id, current_user)
