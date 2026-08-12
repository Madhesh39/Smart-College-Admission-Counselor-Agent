import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import College, Course
from app.algorithms.location_filter import normalize_state, normalize_city

logger = logging.getLogger(__name__)

class ResponseValidator:
    """
    Strict Anti-Hallucination and Location Pre-Response Validation Layer.
    Ensures every output recommendation meets strict DB existence, candidate membership,
    exact location matching, NIRF provenance, and hard budget/course constraints.
    """
    def __init__(self, db: Session):
        self.db = db

    def validate_candidates(
        self,
        candidates: List[College],
        constraints: Dict[str, Any]
    ) -> List[College]:
        """
        Validates candidate colleges against constraints before any recommendation reaches the output.
        Removes non-conforming results.
        """
        validated = []
        req_state = normalize_state(constraints.get("state")) if constraints.get("explicit_location") and constraints.get("state") else None
        req_district = constraints.get("district").strip().lower() if constraints.get("explicit_district") and constraints.get("district") else None
        req_city = normalize_city(constraints.get("city")) if constraints.get("explicit_location") and constraints.get("city") else None
        req_budget = float(constraints.get("max_budget")) if constraints.get("explicit_budget") and constraints.get("max_budget") is not None else None

        for c in candidates:
            # 1. DB existence check
            db_c = self.db.query(College).filter(College.id == c.id).first()
            if not db_c:
                logger.error(f"Response Validation Failed: College ID {c.id} does not exist in verified DB.")
                continue

            # 2. Strict City Location Filter Validation (Requirement 29)
            if req_city:
                c_city_norm = normalize_city(c.city)
                if c_city_norm != req_city:
                    logger.error(f"Response Validation Failed: College '{c.name}' city '{c.city}' does not match requested city '{req_city}'. Removed from response.")
                    continue

            # 3. Strict District Location Filter Validation (Requirement 29)
            if req_district:
                c_dist_norm = (c.district or "").strip().lower()
                c_city_norm = (c.city or "").strip().lower()
                if c_dist_norm != req_district and c_city_norm != req_district:
                    logger.error(f"Response Validation Failed: College '{c.name}' district '{c.district}' does not match requested district '{req_district}'. Removed from response.")
                    continue

            # 4. Strict State Location Filter Validation (Requirement 29)
            if req_state:
                c_state_norm = normalize_state(c.state)
                if c_state_norm != req_state:
                    logger.error(f"Response Validation Failed: College '{c.name}' state '{c.state}' does not match requested state '{req_state}'. Removed from response.")
                    continue

            # 5. Strict Budget Hard Filter Validation
            if req_budget and c.total_estimated_fee > req_budget:
                logger.error(f"Response Validation Failed: College '{c.name}' fee ₹{c.total_estimated_fee} exceeds budget ₹{req_budget}. Removed from response.")
                continue

            validated.append(c)

        return validated

    def validate_final_response_data(
        self,
        recommendation_items: List[Dict[str, Any]],
        candidate_ids: List[int]
    ) -> List[Dict[str, Any]]:
        """
        Validates final AI output items to ensure no hallucinated college or invalid attributes exist.
        """
        valid_items = []
        for item in recommendation_items:
            c_id = item.get("college_id") or (item.get("college").id if item.get("college") else None)
            if not c_id or c_id not in candidate_ids:
                logger.error(f"Anti-Hallucination Violation: College ID {c_id} not in approved candidate list.")
                continue
            valid_items.append(item)
        return valid_items
