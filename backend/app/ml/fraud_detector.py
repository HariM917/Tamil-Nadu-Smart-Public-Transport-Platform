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
    def cross_validate_details(
        db: Session,
        user: User,
        category: str,
        ocr_details: dict,
        bonafide_details: dict = None,
        form_details: dict = None,
        college_ocr_details: dict = None,
    ) -> dict:
        """
        Cross validates details extracted from OCR against user profile registration details.
        Also performs multi-document checks for student passes.
        """
        import re
        flags = []
        
        # Helper to compute word token similarity
        def token_match_score(str1: str, str2: str) -> float:
            if not str1 or not str2:
                return 0.0
            words1 = set(re.findall(r"\w+", str1.lower()))
            words2 = set(re.findall(r"\w+", str2.lower()))
            if not words1 or not words2:
                return 0.0
            intersection = words1.intersection(words2)
            return len(intersection) / len(words1)

        # 1. Name Match (User Full Name vs ID Card OCR Name)
        name_score = token_match_score(user.full_name, ocr_details.get("name", ""))
        name_matched = name_score >= 0.7
        if not name_matched and user.full_name and ocr_details.get("name"):
            flags.append(f"Name Mismatch: Registered name is '{user.full_name}' but ID Card Name is '{ocr_details.get('name')}'.")

        # 2. DOB Match (User DOB vs ID Card OCR DOB)
        dob_matched = False
        dob_score = 0.0
        if user.date_of_birth and ocr_details.get("dob"):
            # Normalize dates
            user_dob_str = user.date_of_birth.strftime("%d-%m-%Y")
            ocr_dob_str = ocr_details.get("dob", "").replace("/", "-")
            
            if user_dob_str == ocr_dob_str:
                dob_matched = True
                dob_score = 1.0
            else:
                user_year = user.date_of_birth.year
                ocr_year_match = re.search(r"\b\d{4}\b", ocr_dob_str)
                if ocr_year_match and int(ocr_year_match.group(0)) == user_year:
                    dob_score = 0.5
                else:
                    flags.append(f"DOB Mismatch: Registered DOB is '{user_dob_str}' but ID Card DOB is '{ocr_dob_str}'.")
        else:
            dob_score = 0.0

        # 3. Aadhaar Match (User Registered Aadhaar vs ID Card OCR Aadhaar)
        aadhaar_matched = False
        aadhaar_score = 0.0
        if user.aadhaar_number and ocr_details.get("aadhaar"):
            from app.utils.aadhaar import last4

            last_4_user = last4(user.aadhaar_number)
            last_4_ocr = last4(ocr_details.get("aadhaar", ""))
            if last_4_user and last_4_ocr and last_4_user == last_4_ocr:
                aadhaar_matched = True
                aadhaar_score = 1.0
            else:
                flags.append("Aadhaar Number Mismatch: Registered Aadhaar does not match document Aadhaar.")

        # Application form vs Aadhaar OCR
        if form_details:
            form_name = form_details.get("full_name", "")
            if form_name and ocr_details.get("name"):
                if token_match_score(form_name, ocr_details.get("name", "")) < 0.7:
                    flags.append("Form/OCR Name Mismatch: Application name does not match Aadhaar document.")

            form_aadhaar = form_details.get("aadhaar_last4", "")
            if form_aadhaar and ocr_details.get("aadhaar"):
                from app.utils.aadhaar import last4 as l4

                if l4(form_aadhaar) != l4(ocr_details.get("aadhaar", "")):
                    flags.append("Form/OCR Aadhaar Mismatch: Entered Aadhaar does not match uploaded document.")

        # Default Verification Levels
        verification_level = "Level 3 — Fraud Detection"
        college_matched = False

        if category == "student":
            verification_level = "Level 5 — Multi-Document Verification"
            # Multi-document validation:
            # Check College ID Name vs Bonafide Name
            college_doc = college_ocr_details or ocr_details
            id_name = college_doc.get("name", "")
            bonafide_name = bonafide_details.get("name", "") if bonafide_details else ""
            
            name_id_bf_score = token_match_score(id_name, bonafide_name) if bonafide_name else 0.0
            bf_name_matched = name_id_bf_score >= 0.7 if bonafide_name else False
            
            if bonafide_details:
                if not bf_name_matched:
                    flags.append(f"Student Name Mismatch: College ID name ('{id_name}') does not match Bonafide certificate ('{bonafide_name}').")
                
                # College name match
                id_college = college_doc.get("college", "")
                bf_college = bonafide_details.get("college", "")
                college_score = token_match_score(id_college, bf_college) if id_college and bf_college else 0.0
                college_matched = college_score >= 0.5
                if not college_matched:
                    flags.append(f"College Mismatch: College ID institution ('{id_college}') does not match Bonafide certificate ('{bf_college}').")
            else:
                flags.append("Bonafide Missing: Student pass requires bonafide certificate.")

            bf_name_weight = 0.15 if bonafide_details else 0.0
            college_weight = 0.15 if bonafide_details else 0.0
            
            total_score = (
                (name_score * 0.3) +
                (dob_score * 0.2) +
                (aadhaar_score * 0.2) +
                (name_id_bf_score * bf_name_weight) +
                ((1.0 if college_matched else 0.0) * college_weight)
            ) * 100.0
        else:
            total_score = (
                (name_score * 0.4) +
                (dob_score * 0.3) +
                (aadhaar_score * 0.3)
            ) * 100.0

        verification_score = round(total_score, 1)

        return {
            "name_match": name_matched,
            "dob_match": dob_matched,
            "aadhaar_match": aadhaar_matched,
            "college_match": college_matched,
            "verification_score": verification_score,
            "verification_level": verification_level,
            "flags": flags
        }

    @staticmethod
    def detect_fraud(db: Session, current_user: User, category: str, ocr_text: str, ocr_details: dict) -> Dict[str, Any]:
        """
        Check database for potential duplicate/fraudulent applications.
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

        # 2. Check Multiple Applications limit
        total_user_passes = db.query(BusPass).filter(
            BusPass.user_id == current_user.id,
            BusPass.status.in_(["pending", "approved"])
        ).count()
        if total_user_passes >= 2:
            risk_score += 0.5
            reasons.append(f"Multiple Applications: User already has {total_user_passes} active/pending pass applications.")

        # 3. Check Duplicate Aadhaar & Mobile Checks using extracted Aadhaar
        extracted_aadhaar = ocr_details.get("aadhaar", "")
        # Extract last 4 digits
        last_4 = ""
        if extracted_aadhaar:
            last_4_match = re.search(r"\d{4}$", extracted_aadhaar)
            if last_4_match:
                last_4 = last_4_match.group(0)

        # Profile Aadhaar checks
        user_aadhaar = current_user.aadhaar_number or ""
        search_aadhaar_last_4 = user_aadhaar[-4:] if user_aadhaar else last_4

        if search_aadhaar_last_4:
            # Query users or passes with same Aadhaar last 4 digits
            other_user_same_aadhaar = db.query(User).filter(
                User.aadhaar_number.like(f"%{search_aadhaar_last_4}"),
                User.id != current_user.id
            ).first()
            if other_user_same_aadhaar:
                risk_score += 0.9
                reasons.append(f"Duplicate Aadhaar: Aadhaar number is registered to another user (User ID: {other_user_same_aadhaar.id}).")
                
                # Check Multiple Applications with Same Aadhaar but Different Mobile
                if other_user_same_aadhaar.phone != current_user.phone:
                    risk_score += 0.9
                    reasons.append(f"Multiple Applications Warning: Aadhaar is registered to User ID #{other_user_same_aadhaar.id} with a different mobile ({other_user_same_aadhaar.phone}).")

            # Check passes with same Aadhaar
            other_pass_same_aadhaar = db.query(BusPass).filter(
                BusPass.ocr_aadhaar.like(f"%{search_aadhaar_last_4}"),
                BusPass.user_id != current_user.id
            ).first()
            if other_pass_same_aadhaar:
                risk_score += 0.9
                reasons.append(f"Duplicate Aadhaar: Aadhaar matches pass application ID #{other_pass_same_aadhaar.id} by another user.")

        # 4. Check Duplicate Mobile
        if current_user.phone:
            other_user_same_phone = db.query(User).filter(
                User.phone == current_user.phone,
                User.id != current_user.id
            ).first()
            if other_user_same_phone:
                risk_score += 0.7
                reasons.append(f"Duplicate Mobile: Mobile number is registered to another user (User ID: {other_user_same_phone.id}).")

            other_pass_same_phone = db.query(BusPass).join(User, BusPass.user_id == User.id).filter(
                User.phone == current_user.phone,
                User.id != current_user.id
            ).first()
            if other_pass_same_phone:
                risk_score += 0.8
                reasons.append(f"Duplicate Mobile: Phone number is already associated with pass application ID: #{other_pass_same_phone.id} by another user.")

        # 5. Compare against all other applications in the DB for document similarity
        all_passes = db.query(BusPass).filter(BusPass.user_id != current_user.id).all()
        
        max_similarity = 0.0
        matching_pass_id = None
        id_match_found = False

        current_id_num = FraudDetector.extract_id_number(ocr_text)

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
            reasons.append(f"Document ID matches an ID in a previous application (Pass ID: #{matching_pass_id}).")
        elif max_similarity > 0.8:
            risk_score += 0.8
            reasons.append(f"High document similarity ({max_similarity:.2%}) with application Pass ID: #{matching_pass_id}.")
        elif max_similarity > 0.5:
            risk_score += 0.4
            reasons.append(f"Moderate document similarity ({max_similarity:.2%}) with application Pass ID: #{matching_pass_id}.")

        risk_score = min(risk_score, 1.0)
        is_flagged = risk_score >= 0.5

        return {
            "fraud_risk_score": float(risk_score),
            "is_flagged": is_flagged,
            "reasons": reasons,
            "ocr_extracted_id": current_id_num
        }


fraud_detector = FraudDetector()
