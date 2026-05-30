import os
import uuid
import json
import logging
import re
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session

from app.models.bus_pass import BusPass
from app.models.user import User
from app.schemas.bus_pass import BusPassReview
from app.core.config import settings
from app.ml.ocr_processor import ocr_processor
from app.ml.eligibility_model import eligibility_model
from app.ml.fraud_detector import fraud_detector
from app.services.qr_service import qr_service
from app.utils.aadhaar import mask_aadhaar, last4

logger = logging.getLogger(__name__)

# Monthly base fares (INR) — Student ₹200, Adult (general) ₹1000, Senior ₹500
PASS_PRICING: Dict[str, Dict[str, float]] = {
    "student": {"monthly": 200.0, "quarterly": 500.0, "annual": 1800.0},
    "general": {"monthly": 1000.0, "quarterly": 2500.0, "annual": 9000.0},
    "senior_citizen": {"monthly": 500.0, "quarterly": 1250.0, "annual": 4500.0},
}

PASS_TYPE_LABELS = {
    "student": {"label": "Student Pass", "emoji": "🎓", "monthly_inr": 200},
    "general": {"label": "Adult Pass", "emoji": "👤", "monthly_inr": 1000},
    "senior_citizen": {"label": "Senior Citizen Pass", "emoji": "🧓", "monthly_inr": 500},
}

VERIFICATION_AUTO_APPROVE_THRESHOLD = 70.0


class PassService:
    """Bus pass applications: OCR, cross-validation, verification score, payment, QR issuance."""

    @staticmethod
    def get_pass_types() -> List[Dict[str, Any]]:
        """Public catalog of pass categories and pricing."""
        out = []
        for cat, meta in PASS_TYPE_LABELS.items():
            out.append(
                {
                    "category": cat,
                    "label": meta["label"],
                    "emoji": meta["emoji"],
                    "pricing": PASS_PRICING[cat],
                }
            )
        return out

    @staticmethod
    def _save_upload(file: UploadFile, prefix: str = "") -> str:
        """Persist upload and return public URL path."""
        file_ext = os.path.splitext(file.filename or "")[1] or ".jpg"
        unique_filename = f"{prefix}{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        try:
            with open(file_path, "wb") as f:
                f.write(file.file.read())
        except Exception as e:
            logger.error(f"Error saving uploaded file: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save uploaded document.",
            )
        return f"/uploads/{unique_filename}", file_path

    @staticmethod
    def preview_aadhaar_ocr(file: UploadFile) -> Dict[str, Any]:
        """OCR-only step for wizard — extract fields without creating a pass record."""
        _, file_path = PassService._save_upload(file, prefix="ocr_preview_")
        ocr_text = ocr_processor.extract_text(file_path)
        ocr_details = ocr_processor.parse_extracted_text(ocr_text)
        return {
            "ocr_name": ocr_details.get("name"),
            "ocr_dob": ocr_details.get("dob"),
            "ocr_aadhaar": ocr_details.get("aadhaar"),
            "ocr_address": ocr_details.get("address"),
            "masked_aadhaar": ocr_details.get("aadhaar"),
        }

    @staticmethod
    def _calculate_amount(category: str, pass_type: str) -> float:
        rates = PASS_PRICING.get(category, PASS_PRICING["general"])
        return float(rates.get(pass_type, rates["monthly"]))

    @staticmethod
    def apply_for_pass(
        db: Session,
        user: User,
        category: str,
        pass_type: str,
        document_type: str,
        aadhaar_file: UploadFile,
        full_name: Optional[str] = None,
        form_dob: Optional[str] = None,
        aadhaar_last4: Optional[str] = None,
        college_id_file: Optional[UploadFile] = None,
        bonafide_file: Optional[UploadFile] = None,
    ) -> BusPass:
        """
        Full bus pass workflow:
        Aadhaar OCR → form cross-check → student multi-doc → verification score → approve/pending → payment.
        """
        if category not in PASS_PRICING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid pass category.",
            )
        if pass_type not in ("monthly", "quarterly", "annual"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="pass_type must be monthly, quarterly, or annual.",
            )

        aadhaar_url, aadhaar_path = PassService._save_upload(aadhaar_file, prefix="aadhaar_")
        college_url = None
        bonafide_url = None

        if category == "student":
            if not college_id_file or not bonafide_file:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Student pass requires College ID and Bonafide Certificate uploads.",
                )
            college_url, college_path = PassService._save_upload(college_id_file, prefix="college_")
            bonafide_url, bonafide_path = PassService._save_upload(bonafide_file, prefix="bonafide_")
        else:
            college_path = None
            bonafide_path = None

        # ── OCR extraction ──
        aadhaar_text = ocr_processor.extract_text(aadhaar_path)
        ocr_details = ocr_processor.parse_extracted_text(aadhaar_text)

        college_ocr_details = {}
        bonafide_details = {}
        bonafide_text = ""
        if category == "student":
            college_text = ocr_processor.extract_text(college_path)
            college_ocr_details = ocr_processor.parse_extracted_text(college_text)
            bonafide_text = ocr_processor.extract_text(bonafide_path)
            bonafide_details = ocr_processor.parse_extracted_text(bonafide_text)

        form_details = {
            "full_name": full_name or user.full_name,
            "aadhaar_last4": aadhaar_last4 or last4(user.aadhaar_number),
        }

        cross_val = fraud_detector.cross_validate_details(
            db=db,
            user=user,
            category=category,
            ocr_details=ocr_details,
            bonafide_details=bonafide_details if category == "student" else None,
            form_details=form_details,
            college_ocr_details=college_ocr_details if category == "student" else None,
        )

        age = 25
        if user.date_of_birth:
            age = (datetime.utcnow() - user.date_of_birth).days // 365

        age_from_ocr = None
        year_match = re.search(r"\b(19\d{2}|20\d{2})\b", aadhaar_text)
        if year_match:
            age_from_ocr = datetime.utcnow().year - int(year_match.group(1))

        if category == "senior_citizen":
            if age < 60 or (age_from_ocr is not None and age_from_ocr < 60):
                cross_val["flags"].append(
                    f"Age Verification Failed: Senior pass requires age 60+ (profile: {age})."
                )

        is_student = category == "student"
        is_eligible, ml_score = eligibility_model.predict_eligibility(
            age=age,
            is_student=is_student,
            monthly_income=15000.0 if is_student else 45000.0,
            distance_km=12.0,
        )

        combined_ocr = aadhaar_text + bonafide_text
        fraud_result = fraud_detector.detect_fraud(db, user, category, combined_ocr, ocr_details)

        validation_failed = len(cross_val["flags"]) > 0
        ml_status = "passed"
        if fraud_result["is_flagged"] or validation_failed or not is_eligible:
            ml_status = "flagged"

        amount = PassService._calculate_amount(category, pass_type)
        verification_score = cross_val["verification_score"]
        auto_verified = (
            verification_score >= VERIFICATION_AUTO_APPROVE_THRESHOLD
            and ml_status == "passed"
            and not fraud_result["is_flagged"]
        )

        remarks = (
            f"AI {cross_val['verification_level']}: {verification_score}% match. "
            f"Verification: {ml_status.upper()}. "
        )
        if cross_val["flags"]:
            remarks += "Flags: " + ", ".join(cross_val["flags"]) + ". "
        if fraud_result["reasons"]:
            remarks += "Fraud: " + ", ".join(fraud_result["reasons"]) + ". "
        if auto_verified:
            remarks += "Auto-verified — proceed to payment."
        elif not cross_val["flags"] and not fraud_result["reasons"]:
            remarks += "Pending manual admin review."

        initial_status = "approved" if auto_verified else "pending"
        payment_status = "pending" if amount > 0 else "paid"

        db_pass = BusPass(
            user_id=user.id,
            category=category,
            pass_type=pass_type,
            document_url=aadhaar_url,
            bonafide_url=bonafide_url,
            document_type=document_type or "aadhar",
            ocr_extracted_text=None,
            ocr_name=ocr_details.get("name"),
            ocr_dob=ocr_details.get("dob"),
            ocr_aadhaar=ocr_details.get("aadhaar"),
            ocr_address=ocr_details.get("address"),
            verification_score=verification_score,
            verification_level=cross_val["verification_level"],
            cross_validation_results=json.dumps(cross_val),
            ml_eligibility_score=ml_score,
            fraud_risk_score=fraud_result["fraud_risk_score"],
            ml_verification_status=ml_status,
            status=initial_status,
            amount=amount,
            payment_status=payment_status,
            admin_remarks=remarks,
        )

        if auto_verified and amount == 0.0:
            PassService._activate_pass(db_pass)

        db.add(db_pass)
        db.commit()
        db.refresh(db_pass)
        return db_pass

    @staticmethod
    def _activate_pass(db_pass: BusPass) -> None:
        """Set validity window and QR for an approved, paid pass."""
        valid_days = 30
        if db_pass.pass_type == "quarterly":
            valid_days = 90
        elif db_pass.pass_type == "annual":
            valid_days = 365

        db_pass.valid_from = datetime.utcnow()
        db_pass.valid_until = datetime.utcnow() + timedelta(days=valid_days)
        qr_content = (
            f"TN-PASS-{db_pass.id}-{db_pass.user_id}-{db_pass.category}-"
            f"{db_pass.valid_until.strftime('%Y%m%d')}"
        )
        db_pass.qr_code_data = qr_content
        db_pass.qr_code_url = qr_service.generate_qr_base64(qr_content)

    @staticmethod
    def review_pass(db: Session, pass_id: int, review: BusPassReview, admin: User) -> BusPass:
        """Admin approve/reject — generates QR on approve when payment already completed."""
        db_pass = db.query(BusPass).filter(BusPass.id == pass_id).first()
        if not db_pass:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bus pass not found.")

        db_pass.status = review.status
        db_pass.admin_remarks = review.admin_remarks or db_pass.admin_remarks
        db_pass.reviewed_by = admin.id
        db_pass.reviewed_at = datetime.utcnow()

        if review.status == "approved":
            if db_pass.amount == 0.0:
                db_pass.payment_status = "paid"
            if db_pass.payment_status == "paid":
                PassService._activate_pass(db_pass)

        db.commit()
        db.refresh(db_pass)
        return db_pass

    @staticmethod
    def renew_pass(db: Session, pass_id: int, user: User) -> BusPass:
        db_pass = db.query(BusPass).filter(
            BusPass.id == pass_id, BusPass.user_id == user.id
        ).first()
        if not db_pass:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bus pass not found.")
        if db_pass.status not in ["approved", "expired"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only approved or expired passes can be renewed.",
            )

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
        """Mock payment — activates QR digital pass when approved."""
        db_pass = db.query(BusPass).filter(
            BusPass.id == pass_id, BusPass.user_id == user.id
        ).first()
        if not db_pass:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bus pass not found.")

        db_pass.payment_status = "paid"
        if db_pass.status == "approved" and not db_pass.qr_code_url:
            PassService._activate_pass(db_pass)

        db.commit()
        db.refresh(db_pass)
        return db_pass


pass_service = PassService()
