import os
import pickle
import logging
import numpy as np
from typing import Tuple, Dict, Any

logger = logging.getLogger(__name__)

# Try to import scikit-learn
try:
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

MODEL_PATH = os.path.join(os.path.dirname(__file__), "eligibility_model.pkl")


class EligibilityModel:
    """ML Model to predict bus pass application eligibility and fraud detection using Scikit-learn."""

    def __init__(self):
        self.model = None
        self._initialize_model()

    def _initialize_model(self):
        """Load or train the ML model."""
        if not SKLEARN_AVAILABLE:
            logger.warning("Scikit-learn is not available. Using rule-based fallback.")
            return

        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    self.model = pickle.load(f)
                logger.info("Loaded pre-trained eligibility model.")
                return
            except Exception as e:
                logger.error(f"Error loading model: {e}")

        # Train a new simple model and save it
        self.train_and_save_model()

    def train_and_save_model(self):
        """Train a simple logistic regression model on simulated data and serialize it."""
        if not SKLEARN_AVAILABLE:
            return

        try:
            logger.info("Training new eligibility ML model...")
            # Generate simulated data: [age, is_student (0/1), monthly_income, commute_distance_km]
            # Classes: 1 (Eligible), 0 (Ineligible/Requires Review)
            np.random.seed(42)
            n_samples = 1000
            
            ages = np.random.randint(5, 80, n_samples)
            is_student = np.array([1 if age < 25 and np.random.rand() > 0.3 else 0 for age in ages])
            income = np.random.randint(5000, 100000, n_samples)
            distance = np.random.randint(1, 50, n_samples)
            
            X = np.column_stack((ages, is_student, income, distance))
            
            # Decision boundary simulation:
            # - Students and Senior citizens (age >= 60) are highly eligible
            # - Low income is highly eligible
            # - Long distance is highly eligible
            y = []
            for age, stud, inc, dist in X:
                score = 0
                if stud == 1:
                    score += 4
                if age >= 60:
                    score += 4
                if inc < 25000:
                    score += 3
                if dist > 15:
                    score += 2
                
                # Add some noise
                score += np.random.normal(0, 1.0)
                y.append(1 if score > 3.0 else 0)
                
            y = np.array(y)

            # Create pipeline
            pipeline = Pipeline([
                ('scaler', StandardScaler()),
                ('classifier', LogisticRegression(random_state=42))
            ])
            
            pipeline.fit(X, y)
            self.model = pipeline
            
            # Save the model
            with open(MODEL_PATH, "wb") as f:
                pickle.dump(pipeline, f)
            logger.info("Eligibility ML model trained and saved successfully.")
        except Exception as e:
            logger.error(f"Failed to train eligibility model: {e}")

    def predict_eligibility(self, age: int, is_student: bool, monthly_income: float, distance_km: float) -> Tuple[bool, float]:
        """
        Predict pass eligibility.
        Returns:
            Tuple[is_eligible (bool), probability/score (float)]
        """
        if SKLEARN_AVAILABLE and self.model:
            try:
                features = np.array([[age, 1 if is_student else 0, monthly_income, distance_km]])
                prob = self.model.predict_proba(features)[0][1]
                is_eligible = bool(prob >= 0.5)
                return is_eligible, float(prob)
            except Exception as e:
                logger.error(f"Error during ML prediction: {e}")

        # Fallback Rule-based Eligibility System
        score = 0.0
        if is_student:
            score += 0.5
        if age >= 60:
            score += 0.5
        if monthly_income < 30000:
            score += 0.3
        if distance_km > 10:
            score += 0.2
            
        score = min(score, 1.0)
        return score >= 0.5, score


eligibility_model = EligibilityModel()
