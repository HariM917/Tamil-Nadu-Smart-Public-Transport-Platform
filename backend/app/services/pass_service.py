import os
import uuid
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session

from app.models.bus_pass import BusPass
from app.models.user import User
from app.schemas.bus_pass import BusPassCreate, BusPassReview
from app.core.config import settings
from app.ml.ocr_processor import ocr_processor
from app.ml.eligibility_model import eligibility_model
from app.ml.fraud_detector import fraud_detector
from app.services.qr_service import qr_service

logger = logging.getLogger(__name__)


class PassService:
    """Service to handle bus pass applications, ML verification, document OCR, renewal, and approval."""

    @staticmethod
    def apply_for_pass(
        db: Session, user: User, category: str, pass_type: str, document_type: str, file: UploadFile
    ) -> BusPass:
        """Create a new bus pass application, trigger OCR, ML eligibility check, and fraud check."""
        
        # Save file to upload directory
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        
        try:
            with open(file_path, "wb") as f:
                f.write(file.file.read())
        except Exception as e:
            logger.error(f"Error saving uploaded file: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save uploaded document."
            )

        # 1. OCR text extraction
        ocr_text = ocr_processor.extract_text(file_path)

        # Calculate user age for ML features
        age = 25  # default
        if user.date_of_birth:
            age = (datetime.utcnow() - user.date_of_birth).days // 365

        # 2. ML Eligibility Check
        is_student = (category == "student")
        # For simulation, let's define dummy values for monthly income and distance
        income = 15000.0 if is_student else 45000.0
        distance = 12.0 # km
        
        is_eligible, ml_score = eligibility_model.predict_eligibility(
            age=age,
            is_student=is_student,
            monthly_income=income,
            distance_km=distance
        )

        # 3. Fraud / Duplicate Application Check
        fraud_result = fraud_detector.detect_fraud(db, user, category, ocr_text)

        # Determine ML verification status
        if fraud_result["is_flagged"]:
            ml_status = "flagged"
        elif is_eligible:
            ml_status = "passed"
        else:
            ml_status = "flagged"

        # Determine pass price
        amount = 1000.0  # standard General pass
        if category == "student":
            amount = 0.0  # Student passes are free in TN
        elif category == "senior_citizen":
            amount = 0.0  # Senior citizens get free travel on local buses or massive discount

        if pass_type == "quarterly":
            amount *= 2.5
        elif pass_type == "annual":
            amount *= 8.0

        # Create Pass application record
        db_pass = BusPass(
            user_id=user.id,
            category=category,
            pass_type=pass_type,
            document_url=f"/uploads/{unique_filename}",
            document_type=document_type,
            ocr_extracted_text=ocr_text,
            ml_eligibility_score=ml_score,
            fraud_risk_score=fraud_result["fraud_risk_score"],
            ml_verification_status=ml_status,
            status="pending",  # all passes start as pending for admin safety review
            amount=amount,
            payment_status="paid" if amount == 0.0 else "pending",
            admin_remarks=f"ML Verification: {ml_status.upper()}. Fraud risk: {fraud_result['fraud_risk_score']:.2f}. " + 
                          ", ".join(fraud_result["reasons"]) if fraud_result["reasons"] else "ML verified. No anomalies detected."
        )

        db.add(db_pass)
        db.commit()
        db.refresh(db_pass)
        return db_pass

    @staticmethod
    def review_pass(db: Session, pass_id: int, review: BusPassReview, admin: User) -> BusPass:
        """Approve or reject a bus pass application. Generate digital pass and QR code if approved."""
        db_pass = db.query(BusPass).filter(BusPass.id == pass_id).first()
        if not db_pass:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bus pass application not found."
            )

        db_pass.status = review.status
        db_pass.admin_remarks = review.admin_remarks
        db_pass.reviewed_by = admin.id
        db_pass.reviewed_at = datetime.utcnow()

        if review.status == "approved":
            # Set validity dates
            valid_days = 30
            if db_pass.pass_type == "quarterly":
                valid_days = 90
            elif db_pass.pass_type == "annual":
                valid_days = 365

            db_pass.valid_from = datetime.utcnow()
            db_pass.valid_until = datetime.utcnow() + timedelta(days=valid_days)
            
            # Auto-pay free passes, others require payment (or simulator flags as paid for checkout demo)
            if db_pass.amount == 0.0:
                db_pass.payment_status = "paid"
            
            # Generate QR Code Data
            qr_content = f"TN-PASS-{db_pass.id}-{db_pass.user_id}-{db_pass.category}-{db_pass.valid_until.strftime('%Y%m%d')}"
            db_pass.qr_code_data = qr_content
            db_pass.qr_code_url = qr_service.generate_qr_base64(qr_content)

        db.commit()
        db.refresh(db_pass)
        return db_pass

    @staticmethod
    def renew_pass(db: Session, pass_id: int, user: User) -> BusPass:
        """Renew an existing approved or expired pass."""
        db_pass = db.query(BusPass).filter(
            BusPass.id == pass_id, BusPass.user_id == user.id
        ).first()

        if not db_pass:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bus pass not found."
            )

        if db_pass.status not in ["approved", "expired"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only approved or expired passes can be renewed."
            )

        # Set status back to pending or approved directly if payment is simulated
        # In our case, we will submit it for direct approval (with mock auto-payment if they check out)
        db_pass.status = "pending"
        db_pass.payment_status = "pending" if db_pass.amount > 0 else "paid"
        db_pass.applied_at = datetime.utcnow()
        db_pass.valid_from = None
        db_pass.valid_until = None
        db_pass.qr_code_data = None
        db_pass.qr_code_url = None

        db.commit()
        db.refresh(db_pass)
        return db_pass

    @staticmethod
    def confirm_payment(db: Session, pass_id: int, user: User) -> BusPass:
        """Confirms payment for a pass application, making it active/approved."""
        db_pass = db.query(BusPass).filter(
            BusPass.id == pass_id, BusPass.user_id == user.id
        ).first()

        if not db_pass:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bus pass not found."
            )

        db_pass.payment_status = "paid"
        
        # If already approved by admin but pending payment, activate validity now
        if db_pass.status == "approved" and not db_pass.valid_from:
            valid_days = 30
            if db_pass.pass_type == "quarterly":
                valid_days = 90
            elif db_pass.pass_type == "annual":
                valid_days = 365

            db_pass.valid_from = datetime.utcnow()
            db_pass.valid_until = datetime.utcnow() + timedelta(days=valid_days)

            # Generate QR Code Data
            qr_content = f"TN-PASS-{db_pass.id}-{db_pass.user_id}-{db_pass.category}-{db_pass.valid_until.strftime('%Y%m%d')}"
            db_pass.qr_code_data = qr_content
            db_pass.qr_code_url = qr_service.generate_qr_base64(qr_content)

        db.commit()
        db.refresh(db_pass)
        return db_pass


pass_service = PassService()
