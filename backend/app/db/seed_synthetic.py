import random
import sys
import os
from datetime import datetime, timedelta
import json

# Add project root to python path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.bus_pass import BusPass
from app.core.security import hash_password
from app.ml.ocr_processor import ocr_processor
from app.ml.eligibility_model import eligibility_model
from app.ml.fraud_detector import fraud_detector

INDIAN_NAMES = [
    "Arun Kumar", "Priya Dharshini", "Ramesh Sundaram", "Divya Krishnan", 
    "Suresh Babu", "Anitha Rajan", "Karthik Raja", "Sandhya Mani", 
    "Vijay Selvam", "Meera Narayanan", "Rajesh Kannan", "Deepa Mohan",
    "Ganesh Moorthy", "Lakshmi Priya", "Senthil Kumar", "Kokila Vani",
    "Balaji R", "Saranya Devi", "Saravanan P", "Janani S",
    "Ramanathan K", "Chitra Devi", "Venkatesan M", "Uma Maheshwari",
    "Hariharan G", "Preethi R", "Manikandan A", "Suganya K",
    "Murugan T", "Nandhini S", "Arvind Swamy", "Vidya Sagar"
]

CITIES = ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem", "Tirunelveli", "Vellore"]
STREETS = ["Anna Salai", "MG Road", "Gandhi Nagar", "Kamarajar Street", "Netaji Road", "Nehru Street", "Bharathi Salai"]
COLLEGES = [
    "College of Engineering Guindy", 
    "Madras Institute of Technology", 
    "PSG College of Technology", 
    "Government College of Technology Coimbatore",
    "Thiagarajar College of Engineering",
    "Government College of Engineering Salem",
    "Alagappa Chettiar College of Engineering and Technology"
]

def generate_dob(category):
    current_year = datetime.utcnow().year
    if category == "senior_citizen":
        birth_year = random.randint(current_year - 80, current_year - 61)
    elif category == "student":
        birth_year = random.randint(current_year - 24, current_year - 17)
    else:
        birth_year = random.randint(current_year - 55, current_year - 25)
    
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    return datetime(birth_year, month, day)

def generate_aadhaar():
    parts = [f"{random.randint(1000, 9999)}" for _ in range(3)]
    return " ".join(parts)

def seed_synthetic_records(count: int = 100):
    db = SessionLocal()
    try:
        print(f"Starting seeding of {count} synthetic records...")
        
        # Keep track of generated Aadhaar numbers to inject duplicates
        aadhaar_pool = []
        for _ in range(20):
            aadhaar_pool.append(generate_aadhaar().replace(" ", ""))

        created_count = 0
        for i in range(count):
            category = random.choice(["student", "general", "senior_citizen"])
            name = random.choice(INDIAN_NAMES) + f" {chr(65 + random.randint(0, 25))}" # Add an initial
            dob = generate_dob(category)
            
            # Generate unique Aadhaar for the User model to satisfy database unique constraint
            aadhaar_num = generate_aadhaar().replace(" ", "")
            while aadhaar_num in aadhaar_pool:
                aadhaar_num = generate_aadhaar().replace(" ", "")
            aadhaar_pool.append(aadhaar_num)

            # Generate phone
            phone = f"+91{random.randint(6000000000, 9999999999)}"
            
            # Create user
            email_prefix = name.lower().replace(" ", "") + f"{random.randint(10, 99)}"
            user = User(
                email=f"{email_prefix}@gmail.com",
                phone=phone,
                password_hash=hash_password("user1234"),
                full_name=name,
                date_of_birth=dob,
                gender=random.choice(["Male", "Female"]),
                aadhaar_number=aadhaar_num,
                aadhaar_verified=True,
                is_verified=True,
                city=random.choice(CITIES),
                address=f"{random.randint(1, 150)}, {random.choice(STREETS)}, {random.choice(CITIES)}, Tamil Nadu - {random.randint(600001, 600099)}"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # Create BusPass Application
            pass_type = random.choice(["monthly", "quarterly", "annual"])
            doc_type = "student_id" if category == "student" else ("senior_id" if category == "senior_citizen" else "aadhar")
            
            # Generate OCR text (8% chance of duplicate Aadhaar in document OCR)
            ocr_aadhaar_num = aadhaar_num
            if random.random() < 0.08 and len(aadhaar_pool) > 1:
                ocr_aadhaar_num = random.choice(aadhaar_pool[:-1])

            ocr_name = name
            # 5% chance of OCR Name mismatch
            if random.random() < 0.05:
                ocr_name = name.split(" ")[0] + " Kumar" # Wrong initial/lastname

            ocr_dob = dob.strftime("%d-%m-%Y")
            # 5% chance of DOB mismatch
            if random.random() < 0.05:
                ocr_dob = (dob - timedelta(days=365)).strftime("%d-%m-%Y")

            ocr_aadhaar_formatted = f"XXXX XXXX {ocr_aadhaar_num[-4:]}"
            ocr_text = (
                f"GOVERNMENT OF INDIA\n"
                f"UNIQUE IDENTIFICATION AUTHORITY OF INDIA\n"
                f"To, {ocr_name}\n"
                f"{user.address}\n"
                f"DOB: {ocr_dob}\n"
                f"{ocr_aadhaar_formatted}\n"
                f"HELP: 1947"
            )

            # OCR Details dict
            ocr_details = {
                "name": ocr_name,
                "dob": ocr_dob,
                "aadhaar": ocr_aadhaar_formatted,
                "address": user.address,
                "college": random.choice(COLLEGES) if category == "student" else ""
            }

            # Student multi-doc validation details
            bonafide_details = None
            if category == "student":
                bf_college = ocr_details["college"]
                # 5% chance of college mismatch
                if random.random() < 0.05:
                    bf_college = random.choice(COLLEGES)
                
                bf_name = ocr_name
                # 5% chance of bonafide name mismatch
                if random.random() < 0.05:
                    bf_name = ocr_name.split(" ")[0] + " Sundar"

                bonafide_details = {
                    "name": bf_name,
                    "dob": ocr_dob,
                    "aadhaar": ocr_aadhaar_formatted,
                    "address": user.address,
                    "college": bf_college
                }

            # Run Cross-Validation
            cross_val = fraud_detector.cross_validate_details(
                db=db,
                user=user,
                category=category,
                ocr_details=ocr_details,
                bonafide_details=bonafide_details
            )

            # Calculate Age
            age = (datetime.utcnow() - dob).days // 365
            
            # ML Eligibility
            is_student = (category == "student")
            income = 15000.0 if is_student else 45000.0
            distance = random.uniform(2.0, 25.0)
            
            is_eligible, ml_score = eligibility_model.predict_eligibility(
                age=age,
                is_student=is_student,
                monthly_income=income,
                distance_km=distance
            )

            # Fraud Check
            fraud_result = fraud_detector.detect_fraud(db, user, category, ocr_text, ocr_details)

            # Determine ML verification status
            validation_failed = len(cross_val["flags"]) > 0
            if fraud_result["is_flagged"] or validation_failed or not is_eligible:
                ml_status = "flagged"
            else:
                ml_status = "passed"

            # Pricing
            amount = 1000.0 if category == "general" else 0.0
            if pass_type == "quarterly":
                amount *= 2.5
            elif pass_type == "annual":
                amount *= 8.0

            # Construct admin remarks
            remarks = f"AI {cross_val['verification_level']}: {cross_val['verification_score']}% Match. Verification: {ml_status.upper()}. "
            if cross_val["flags"]:
                remarks += "Flags: " + ", ".join(cross_val["flags"]) + ". "
            if fraud_result["reasons"]:
                remarks += "Fraud: " + ", ".join(fraud_result["reasons"]) + ". "
            if not cross_val["flags"] and not fraud_result["reasons"]:
                remarks += "No anomalies detected."

            # Date Applied
            days_ago = random.randint(1, 14)
            applied_date = datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 23))

            # Status distribution
            status_opts = ["pending", "approved", "rejected"]
            status_weights = [0.4, 0.5, 0.1] # Mostly pending/approved for review
            status = random.choices(status_opts, weights=status_weights)[0]

            db_pass = BusPass(
                user_id=user.id,
                category=category,
                pass_type=pass_type,
                document_url=f"/uploads/mock_id_card_{i}.jpg",
                bonafide_url=f"/uploads/mock_bonafide_{i}.jpg" if category == "student" else None,
                document_type=doc_type,
                ocr_extracted_text=ocr_text,
                ocr_name=ocr_details.get("name"),
                ocr_dob=ocr_details.get("dob"),
                ocr_aadhaar=ocr_details.get("aadhaar"),
                ocr_address=ocr_details.get("address"),
                verification_score=cross_val["verification_score"],
                verification_level=cross_val["verification_level"],
                cross_validation_results=json.dumps(cross_val),
                ml_eligibility_score=ml_score,
                fraud_risk_score=fraud_result["fraud_risk_score"],
                ml_verification_status=ml_status,
                status=status,
                amount=amount,
                payment_status="paid" if amount == 0.0 or status == "approved" else "pending",
                admin_remarks=remarks,
                applied_at=applied_date,
                created_at=applied_date
            )
            
            if status == "approved":
                db_pass.valid_from = applied_date + timedelta(days=1)
                db_pass.valid_until = db_pass.valid_from + timedelta(days=30 if pass_type == "monthly" else (90 if pass_type == "quarterly" else 365))
                db_pass.qr_code_data = f"TN-PASS-{db_pass.id}-{user.id}-{category}"
                # Set a basic mock qr code url
                db_pass.qr_code_url = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='black'/></svg>"

            db.add(db_pass)
            db.commit()
            created_count += 1

        print(f"Successfully seeded {created_count} synthetic users and pass applications!")
    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    count = 100
    if len(sys.argv) > 1:
        try:
            count = int(sys.argv[1])
        except ValueError:
            pass
    seed_synthetic_records(count)
