import re
from typing import Dict, Any, List
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session
from app.models.bus import Bus
from app.models.route import Route, Stop

# FAQ Knowledge Base for RAG Search
KNOWLEDGE_BASE = [
    {
        "category": "pass_rules",
        "question": "How do I apply for a student bus pass?",
        "answer": "To apply for a student pass (₹200/month), open Bus Pass, select Student Pass, fill the form, upload Aadhaar for OCR, then College ID and Bonafide. If verification score is ≥70%, pay online and receive your QR digital pass."
    },
    {
        "category": "pass_rules",
        "question": "எப்படி பஸ் பாஸ் பெறுவது?",
        "answer": "பஸ் பாஸ் பெற, 'Bus Pass' போர்ட்டலுக்குச் சென்று, உங்கள் ஆதார் அட்டை, கல்லூரி அடையாள அட்டை மற்றும் போனாபைட் சான்றிதழைப் பதிவேற்றவும். AI தானாகவே அதை சரிபார்த்து ஒப்புதல் வழங்கும். தமிழகத்தில் மாணவர்களுக்கு பஸ் பாஸ் முற்றிலும் இலவசம்."
    },
    {
        "category": "ticket_rules",
        "question": "How can I book a ticket online?",
        "answer": "You can book tickets by going to the 'Book Tickets' tab. Select your source, destination, travel date, choose from the interactive 40-seat grid, and make payments online via UPI or Card to generate a QR-coded digital ticket immediately."
    },
    {
        "category": "ticket_rules",
        "question": "டிக்கெட் புக் செய்வது எப்படி?",
        "answer": "இருக்கை முன்பதிவு செய்ய, 'Book Tickets' பகுதிக்குச் சென்று, புறப்படும் இடம் மற்றும் சேரும் இடத்தை தேர்வு செய்து, உங்கள் இருக்கையைத் தேர்ந்தெடுத்து, UPI அல்லது கார்டு மூலம் பணம் செலுத்தி உடனடி QR டிக்கெட்டைப் பெறலாம்."
    },
    {
        "category": "concession_rules",
        "question": "Who is eligible for senior citizen concessions?",
        "answer": "Senior citizens aged 60 and above are eligible for travel concessions. They can travel free in ordinary town services in Tamil Nadu (using tokens) or purchase subsidized passes by uploading their age proof document (Aadhaar)."
    },
    {
        "category": "concession_rules",
        "question": "முதியவர்களுக்கான பஸ் கட்டண சலுகைகள் என்ன?",
        "answer": "60 வயதுக்கு மேற்பட்ட மூத்த குடிமக்கள் தமிழகத்தில் சாதாரண நகரப் பேருந்துகளில் இலவசமாகப் பயணம் செய்யலாம் அல்லது ஆதார் அட்டையை பதிவேற்றி சலுகை கட்டண பாஸ்களைப் பெறலாம்."
    },
    {
        "category": "fare_rules",
        "question": "What is the bus ticket fare structure?",
        "answer": "The ticket fare starts at a base rate of ₹10 for ordinary city buses, ₹15 for Express, ₹18 for Deluxe, and ₹25 for Air Conditioned services. A kilometer fare rate ranging from ₹1.2 to ₹2.0/km is added depending on service class."
    },
    {
        "category": "fare_rules",
        "question": "பேருந்து கட்டணம் எவ்வளவு?",
        "answer": "சாதாரண பேருந்து கட்டணம் ₹10 முதல் தொடங்குகிறது. எக்ஸ்பிரஸ் ₹15, டீலக்ஸ் ₹18 மற்றும் ஏசி பேருந்து கட்டணம் ₹25 முதல் தொடங்குகிறது. கிலோமீட்டருக்கு ₹1.2 முதல் ₹2.0 வரை வசூலிக்கப்படுகிறது."
    },
    {
        "category": "support",
        "question": "What is the customer support contact info?",
        "answer": "For assistance, you can contact the MTC customer support cell at +91-9445030516 or email customercare@mtc.tn.gov.in. For emergency support, call the toll-free number 149."
    },
    {
        "category": "support",
        "question": "வாடிக்கையாளர் சேவை எண் என்ன?",
        "answer": "ஏதேனும் உதவிகளுக்கு, MTC வாடிக்கையாளர் சேவை எண்ணை +91-9445030516 தொடர்பு கொள்ளலாம் அல்லது customercare@mtc.tn.gov.in என்ற மின்னஞ்சல் முகவரிக்கு எழுதலாம். அவசர உதவிக்கு 149 என்ற இலவச எண்ணை அழைக்கவும்."
    }
]

# Intent Classifier Training Data
TRAINING_DATA = [
    ("how to apply for a student pass", "apply_pass"),
    ("apply pass", "apply_pass"),
    ("get digital bus pass concession", "apply_pass"),
    ("bonafide certificate and ID card upload for pass", "apply_pass"),
    ("பஸ் பாஸ் பெறுவது எப்படி", "apply_pass"),
    ("மாணவர் பஸ் பாஸ் அப்ளை செய்ய வேண்டும்", "apply_pass"),
    ("பாஸ் அப்ளை செய்வது எப்படி", "apply_pass"),
    
    ("where is bus 102", "track_bus"),
    ("track route 101CT location", "track_bus"),
    ("live tracking of bus number TN-01-N-1000", "track_bus"),
    ("when will route 101E arrive", "track_bus"),
    ("பேருந்து எங்கே இருக்கிறது", "track_bus"),
    ("102 பஸ் எங்கே இருக்கு", "track_bus"),
    ("பஸ் லொகேஷன் பார்க்க வேண்டும்", "track_bus"),
    
    ("book ticket online to Madurai", "book_ticket"),
    ("reserve seat 15 on ECR bus", "book_ticket"),
    ("booking seats status", "book_ticket"),
    ("டிக்கெட் முன்பதிவு செய்வது எப்படி", "book_ticket"),
    ("இருக்கை புக் செய்ய வேண்டும்", "book_ticket"),
    ("டிக்கெட் புக் பண்ணனும்", "book_ticket"),
    
    ("which bus goes to Kelambakkam", "route_search"),
    ("route from Poonamallee to Royapuram", "route_search"),
    ("bus number for BSNL office", "route_search"),
    ("கிளம்பாக்கம் செல்ல எந்த பேருந்து", "route_search"),
    ("பூந்தமல்லி போகும் பஸ் வழித்தடம்", "route_search"),
    ("வழித்தடம் 101 எங்கே செல்லும்", "route_search"),
    
    ("what is the bus fare for deluxe class", "fare_enquiry"),
    ("how much is ticket cost per kilometer", "fare_enquiry"),
    ("bus pass price list in chennai", "fare_enquiry"),
    ("டிக்கெட் விலை எவ்வளவு", "fare_enquiry"),
    ("பஸ் கட்டணம் என்ன", "fare_enquiry"),
    
    ("hello", "greetings"),
    ("hi", "greetings"),
    ("hey there", "greetings"),
    ("vanakkam", "greetings"),
    ("வணக்கம்", "greetings"),
    ("நன்றி", "greetings"),
    ("நல்வரவு", "greetings")
]

# Bilingual Stop Name Translations to scan database
TAMIL_STOP_MAP = {
    "திருவொற்றியூர்": "THIRUVOTRIYUR",
    "தங்கல்": "THANGAL",
    "அண்ணா நகர்": "ANNA NAGAR",
    "ராயபுரம்": "ROYAPURAM",
    "பாரிஸ்": "PARRYS",
    "சென்ட்ரல்": "CENTRAL",
    "அமிஞ்சிகரை": "AMINJIKARAI",
    "அரும்பாக்கம்": "ARUMBAKKAM",
    "நெற்குன்றம்": "NERKUNDRAM",
    "மதுரவாயல்": "MADURAVOYAL",
    "வானகரம்": "VAANAGARAM",
    "வேளப்பன்சாவடி": "VELAPPANCHAVADI",
    "குமணஞ்சாவடி": "KUMUNANCHAVADI",
    "பூந்தமல்லி": "POONAMALLEE",
    "கிளம்பாக்கம்": "KELAMBAKKAM",
    "திருவான்மியூர்": "THIRUVANMIYUR",
    "கந்தன்சாவடி": "KANDANCHAVADI",
    "பெருங்குடி": "PERUNGUDI",
    "துரைப்பாக்கம்": "THORAIPAKKAM",
    "மேட்டுக்குப்பம்": "METTUKUPPAM",
    "காரப்பாக்கம்": "KARAPAKKAM",
    "சோழிங்கநல்லூர்": "SHOLINGANALLUR",
    "செம்மஞ்சேரி": "SEMMANCHERI",
    "நாவலூர்": "NAVALUR",
    "சிறுசேரி": "SIRUSERI",
    "புதுப்பாக்கம்": "PUDUPAKKAM",
    "தீவு திடல்": "ISLAND GROUND",
    "தலைமை செயலகம்": "SECRETARIAT",
    "சேப்பாக்கம்": "CHEPAUK",
    "அடையார்": "ADYAR"
}

class ChatbotEngine:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(lowercase=True, token_pattern=r'(?u)\b\w+\b')
        self.classifier = LogisticRegression(max_iter=200)
        
        # Train intent classifier pipeline
        texts = [t[0] for t in TRAINING_DATA]
        intents = [t[1] for t in TRAINING_DATA]
        X_train = self.vectorizer.fit_transform(texts)
        self.classifier.fit(X_train, intents)

        # FAQ TF-IDF semantic search (local sklearn — no external APIs)
        self.faq_vectorizer = TfidfVectorizer(lowercase=True, token_pattern=r"(?u)\b\w+\b")
        faq_questions = [faq["question"] for faq in KNOWLEDGE_BASE]
        self.faq_matrix = self.faq_vectorizer.fit_transform(faq_questions)

    def query(self, user_query: str, db: Session) -> Dict[str, Any]:
        user_query_clean = user_query.strip()
        if not user_query_clean:
            return {
                "intent": "unknown",
                "response": "Please type a question, and I'll do my best to assist you."
            }

        # Predict intent
        query_vec = self.vectorizer.transform([user_query_clean])
        intent = self.classifier.predict(query_vec)[0]

        # ── 1. GREETINGS INTENT ──
        if intent == "greetings":
            return {
                "intent": "greetings",
                "response": "Vanakkam! வணக்கம்! I am MobiTN's AI Transport Assistant. 🚌\n\nHow can I help you today? You can ask me:\n• 'Which bus goes to Kelambakkam?'\n• 'How to apply for a student bus pass?'\n• 'Where is bus 102?'\n• 'What is the ticket fare structure?'"
            }

        # ── 2. ROUTE SEARCH / STOP DETECTION INTENT ──
        # Check if stops or routes are in the query regardless of classified intent
        stop_keywords = list(TAMIL_STOP_MAP.keys())
        detected_stops = []
        
        # Check Tamil stops translation
        for stop_t, stop_e in TAMIL_STOP_MAP.items():
            if stop_t in user_query_clean:
                detected_stops.append(stop_e)
        
        # Check English stops names in database
        db_stops = db.query(Stop.stop_name).all()
        for s_row in db_stops:
            s_name = s_row[0]
            if s_name.lower() in user_query_clean.lower() and s_name not in detected_stops:
                detected_stops.append(s_name)

        if detected_stops:
            # Query routes matching the detected stops
            matched_routes = []
            if len(detected_stops) >= 2:
                # Find route connecting source and destination stops
                src, dest = detected_stops[0], detected_stops[1]
                routes = db.query(Route).all()
                for r in routes:
                    stops = [rs.stop.stop_name for rs in r.route_stops]
                    if src in stops and dest in stops:
                        src_idx = stops.index(src)
                        dest_idx = stops.index(dest)
                        if src_idx < dest_idx:
                            matched_routes.append(r.route_no)
                
                if matched_routes:
                    route_list_str = ", ".join([f"Route {rno}" for rno in matched_routes])
                    return {
                        "intent": "route_search",
                        "response": f"Recommended Route(s) connecting {src} to {dest}: **{route_list_str}**.\n\nYou can view the full stages and timings for these routes on our 'Route Info' dashboard."
                    }
                else:
                    return {
                        "intent": "route_search",
                        "response": f"I found stops '{src}' and '{dest}' in our dataset, but we do not have a direct route connecting them in that direction. Try looking up connections on the 'Route Info' planner."
                    }
            else:
                # Single stop detected
                target_stop = detected_stops[0]
                routes = db.query(Route).join(Route.route_stops).join(Stop).filter(Stop.stop_name == target_stop).all()
                if routes:
                    route_nos = [r.route_no for r in routes]
                    route_list_str = ", ".join([f"Route {rno}" for rno in route_nos])
                    return {
                        "intent": "route_search",
                        "response": f"Bus stops matching '{target_stop}' are served by the following active route(s): **{route_list_str}**."
                    }

        # ── 3. TRACK BUS TELEMETRY INTENT ──
        # Scan for bus/route numbers in the query
        route_numbers = re.findall(r'\b\d{3}[a-zA-Z]*\b', user_query_clean)
        if route_numbers:
            target_route = route_numbers[0]
            bus = db.query(Bus).filter((Bus.route_number == target_route) | (Bus.bus_number.ilike(f"%{target_route}%"))).first()
            if bus:
                eta = len(bus.stops) * 2 # Mock ETA
                status_capital = bus.status.capitalize() if bus.status else "Running"
                
                # Fetch next stop from dynamic simulation
                next_stop = "Destination"
                if bus.stops:
                    next_stop = bus.stops[-1]["name"]
                
                return {
                    "intent": "track_bus",
                    "response": f"📍 **Live Status for Route {target_route}** ({bus.bus_number}):\n• **Status:** {status_capital}\n• **Speed:** {int(bus.current_speed or 30)} km/h\n• **Heading:** {int(bus.heading or 0)}°\n• **Next Stop:** {next_stop}\n• **Driver:** {bus.driver_name or 'Rajesh Kumar'}\n\nYou can track this bus visually on the 'Live Tracking' map."
                }

        # ── 4. RAG SEMANTIC SEARCH ON FAQ KNOWLEDGE BASE (TF-IDF) ──
        query_faq_vec = self.faq_vectorizer.transform([user_query_clean])
        similarities = cosine_similarity(query_faq_vec, self.faq_matrix).flatten()
        best_match_idx = int(np.argmax(similarities))
        best_score = float(similarities[best_match_idx])

        if best_score >= 0.25:
            matched_faq = KNOWLEDGE_BASE[best_match_idx]
            return {
                "intent": intent,
                "response": matched_faq["answer"]
            }

        # ── 5. DEFAULT FALLBACK RESPONSE ──
        return {
            "intent": "unknown",
            "response": "Vanakkam! I'm your custom-built AI Transport Assistant. I couldn't find a direct match for your question. You can ask me:\n• 'How can I get a student pass?'\n• 'Which bus goes to Kelambakkam?'\n• 'Where is bus 101?'\n• 'வணக்கம் (Vanakkam)'"
        }

# Singleton instance
chatbot_engine = ChatbotEngine()
