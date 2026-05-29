import re
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.bus_pass import BusPass
from app.models.user import User


class FraudDetector:
    """Fraud and duplicate detection system for bus pass applications."""

    @staticmethod
    def calculate_jaccard_similarity(text1: str, text2: str) -> float:
        """Calculate Jaccard similarity between two texts."""
        if not text1 or not text2:
            return 0.0

        # Clean and tokenize
        words1 = set(re.findall(r"\w+", text1.lower()))
        words2 = set(re.findall(r"\w+", text2.lower()))

        if not words1 or not words2:
            return 0.0

        intersection = words1.intersection(words2)
        union = words1.union(words2)

        return len(intersection) / len(union)

    @staticmethod
    def extract_id_number(ocr_text: str) -> str:
        """Helper to extract common document numbers (Aadhar, Student Roll, etc.) using regex."""
        if not ocr_text:
            return ""
        
        # Look for Aadhar number format (4 digits space/dash 4 digits space/dash 4 digits)
        aadhar_match = re.search(r"\b\d{4}\s?\d{4}\s?\d{4}\b", ocr_text)
        if aadhar_match:
            return aadhar_match.group(0).replace(" ", "")

        # Look for typical Roll Numbers or ID codes (alphanumeric length 8 to 12)
        id_match = re.search(r"\b[A-Z0-9]{8,12}\b", ocr_text)
        if id_match:
            return id_match.group(0)

        return ""

    @staticmethod
    def detect_fraud(db: Session, current_user: User, category: str, ocr_text: str) -> Dict[str, Any]:
        """
        Check database for potential duplicate/fraudulent applications.
        Returns:
            Dict containing:
                - fraud_risk_score (float, 0 to 1)
                - is_flagged (bool)
                - reasons (List[str])
        """
        reasons = []
        risk_score = 0.0

        # 1. Check if user already has an active or pending pass in the SAME category
        existing_pass = db.query(BusPass).filter(
            BusPass.user_id == current_user.id,
            BusPass.category == category,
            BusPass.status.in_(["pending", "approved"])
        ).first()

        if existing_pass:
            risk_score += 0.6
            reasons.append(f"User already has an active or pending pass application for category: {category}.")

        # Extract current document/ID number from OCR text
        current_id_num = FraudDetector.extract_id_number(ocr_text)

        # 2. Compare against all other applications in the DB for document similarity
        all_passes = db.query(BusPass).filter(BusPass.user_id != current_user.id).all()
        
        max_similarity = 0.0
        matching_pass_id = None
        id_match_found = False

        for past_pass in all_passes:
            if not past_pass.ocr_extracted_text:
                continue

            # Check for same ID document number
            if current_id_num:
                past_id_num = FraudDetector.extract_id_number(past_pass.ocr_extracted_text)
                if past_id_num and current_id_num == past_id_num:
                    id_match_found = True
                    matching_pass_id = past_pass.id
                    break

            # Check text similarity
            similarity = FraudDetector.calculate_jaccard_similarity(ocr_text, past_pass.ocr_extracted_text)
            if similarity > max_similarity:
                max_similarity = similarity
                matching_pass_id = past_pass.id

        if id_match_found:
            risk_score += 0.9
            reasons.append(f"Document ID matches an ID in a previous application (Pass ID: {matching_pass_id}).")
        elif max_similarity > 0.8:
            risk_score += 0.8
            reasons.append(f"High document similarity ({max_similarity:.2%}) with application Pass ID: {matching_pass_id}.")
        elif max_similarity > 0.5:
            risk_score += 0.4
            reasons.append(f"Moderate document similarity ({max_similarity:.2%}) with application Pass ID: {matching_pass_id}.")

        # Cap the risk score at 1.0
        risk_score = min(risk_score, 1.0)
        is_flagged = risk_score >= 0.5

        return {
            "fraud_risk_score": float(risk_score),
            "is_flagged": is_flagged,
            "reasons": reasons,
            "ocr_extracted_id": current_id_num
        }


fraud_detector = FraudDetector()
