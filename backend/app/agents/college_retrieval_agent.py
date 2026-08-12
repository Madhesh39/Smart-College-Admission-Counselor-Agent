import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import College, Course, StudentProfile
from app.algorithms.location_filter import (
    filter_colleges_by_constraints, 
    normalize_state, 
    normalize_city
)
from app.agents.location_agent import LocationAgent

logger = logging.getLogger(__name__)

class CollegeRetrievalAgent:
    """
    Agent responsible for executing hard-filtered database retrieval of institutions matching user constraints.
    """
    def __init__(self, db: Session):
        self.db = db
        self.location_agent = LocationAgent(db)

    def retrieve_candidates(
        self, 
        constraints: Dict[str, Any], 
        profile: Optional[StudentProfile] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Retrieves candidate colleges applying strict HARD filters before scoring.
        """
        query = self.db.query(College)
        all_colleges = query.all()

        # Location consistency check: Filter out any corrupted/mismatched records
        valid_colleges = [c for c in all_colleges if self.location_agent.validate_location_consistency(c)]

        raw_q = (constraints.get("raw_query") or "").lower()

        # 1. District Hard Filter
        if constraints.get("explicit_district") and constraints.get("district"):
            req_district = constraints["district"].strip().lower()
            filtered_candidates = [
                c for c in valid_colleges 
                if (c.district and c.district.strip().lower() == req_district) or 
                   (c.city and c.city.strip().lower() == req_district)
            ]
        # 2. City Hard Filter
        elif constraints.get("explicit_location") and constraints.get("city"):
            req_city = normalize_city(constraints["city"])
            filtered_candidates = [
                c for c in valid_colleges 
                if normalize_city(c.city) == req_city
            ]
        # 3. State Hard Filter
        elif constraints.get("explicit_location") and constraints.get("state"):
            req_state = normalize_state(constraints["state"])
            filtered_candidates = [
                c for c in valid_colleges 
                if normalize_state(c.state) == req_state
            ]
        elif constraints.get("nearby_search") and (constraints.get("city") or constraints.get("district")):
            target_loc = constraints.get("city") or constraints.get("district")
            radius = constraints.get("nearby_radius_km", 80.0)
            nearby_pairs = self.location_agent.find_nearby_colleges(target_loc, radius)
            filtered_candidates = [pair[0] for pair in nearby_pairs]
        else:
            filtered_candidates = valid_colleges

        # Specific College Name search matching
        if raw_q and not constraints.get("explicit_district") and not constraints.get("explicit_location"):
            stopwords = {
                "cutoff", "cutoffs", "marks", "score", "scores", "best", "top", "colleges", "college", 
                "technology", "engineering", "institute", "institution", "under", "lakh", "lakhs", "fee", "fees",
                "for", "the", "and", "in", "at", "of", "cse", "ece", "mech", "eee", "civil", "it", 
                "course", "branch", "admission", "admissions", "rank", "ranking", "tnea", "govt", "private",
                "chennai", "coimbatore", "erode", "madurai", "salem", "trichy", "tiruchirappalli", "vellore", "tiruppur"
            }
            tokens = [t for t in raw_q.split() if len(t) >= 3 and t not in stopwords]
            if tokens:
                matched_by_name = []
                for c in valid_colleges:
                    c_name_lower = c.name.lower()
                    c_short_lower = (c.short_name or "").lower()
                    if any(t in c_name_lower or (c_short_lower and t in c_short_lower) for t in tokens):
                        matched_by_name.append(c)
                if matched_by_name:
                    filtered_candidates = matched_by_name

        # 4. Budget Hard Filter
        if constraints.get("explicit_budget") and constraints.get("max_budget") is not None:
            budget_limit = float(constraints["max_budget"])
            filtered_candidates = [
                c for c in filtered_candidates 
                if c.total_estimated_fee <= budget_limit
            ]

        # 5. Course Hard Filter
        target_course = None
        if constraints.get("explicit_course") and constraints.get("course"):
            target_course = self.db.query(Course).filter(Course.name.ilike(f"%{constraints['course']}%")).first()

        if target_course and constraints.get("explicit_course"):
            course_offered = [
                c for c in filtered_candidates
                if any(crs.id == target_course.id for crs in c.courses)
            ]
            if course_offered:
                filtered_candidates = course_offered

        # Source Metadata enrichment
        candidate_data = []
        for c in filtered_candidates[:limit]:
            candidate_data.append({
                "college": c,
                "source_name": c.source_name or "AISHE",
                "data_confidence": c.data_confidence or "high",
                "last_verified_at": str(c.last_verified_at or "2026-08-11")[:10]
            })

        return {
            "candidates": candidate_data,
            "colleges": [cd["college"] for cd in candidate_data],
            "total_found": len(filtered_candidates),
            "target_course": target_course,
            "applied_constraints": constraints
        }
