from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.bus_pass import BusPass
from app.schemas.bus_pass import BusPassResponse
from app.services.pass_service import pass_service

router = APIRouter()


@router.post("/apply", response_model=BusPassResponse, status_code=status.HTTP_201_CREATED)
def apply_pass(
    category: str = Form(...),
    pass_type: str = Form("monthly"),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Apply for a new digital bus pass with supporting documents."""
    # Simple input validation
    valid_categories = ["student", "general", "senior_citizen"]
    if category not in valid_categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}"
        )

    return pass_service.apply_for_pass(
        db=db,
        user=current_user,
        category=category,
        pass_type=pass_type,
        document_type=document_type,
        file=file
    )


@router.get("/my-passes", response_model=List[BusPassResponse])
def get_my_passes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve list of passes applied for by the current user."""
    return db.query(BusPass).filter(BusPass.user_id == current_user.id).order_by(BusPass.applied_at.desc()).all()


@router.get("/status/{pass_id}", response_model=BusPassResponse)
def get_pass_status(
    pass_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check the processing status of a specific bus pass application."""
    bus_pass = db.query(BusPass).filter(
        BusPass.id == pass_id, BusPass.user_id == current_user.id
    ).first()
    
    if not bus_pass:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bus pass application not found."
        )
    return bus_pass


@router.post("/renew/{pass_id}", response_model=BusPassResponse)
def renew_pass(
    pass_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Apply for renewal of an approved or expired bus pass."""
    return pass_service.renew_pass(db, pass_id, current_user)


@router.post("/{pass_id}/pay", response_model=BusPassResponse)
def pay_pass(
    pass_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Simulate online payment for an approved/pending pass."""
    return pass_service.confirm_payment(db, pass_id, current_user)
