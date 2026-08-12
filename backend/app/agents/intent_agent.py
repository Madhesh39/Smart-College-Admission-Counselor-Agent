import re
import logging
from typing import Dict, Any, Optional
from app.models.models import StudentProfile
from app.algorithms.location_filter import (
    STATE_MAPPING, 
    CITY_MAPPING, 
    COURSE_MAPPING,
    normalize_state,
    normalize_city
)

logger = logging.getLogger(__name__)

# District Aliases Mapping -> (Normalized District, State)
DISTRICT_MAPPING = {
    "erode district": ("Erode", "Tamil Nadu"),
    "erode dist": ("Erode", "Tamil Nadu"),
    "coimbatore district": ("Coimbatore", "Tamil Nadu"),
    "chennai district": ("Chennai", "Tamil Nadu"),
    "madurai district": ("Madurai", "Tamil Nadu"),
    "tiruchirappalli district": ("Tiruchirappalli", "Tamil Nadu"),
    "trichy district": ("Tiruchirappalli", "Tamil Nadu"),
    "salem district": ("Salem", "Tamil Nadu"),
    "vellore district": ("Vellore", "Tamil Nadu"),
    "tiruppur district": ("Tiruppur", "Tamil Nadu"),
    "ramanathapuram district": ("Ramanathapuram", "Tamil Nadu"),
    "dindigul district": ("Dindigul", "Tamil Nadu"),
}

class IntentAgent:
    """
    Agent responsible for extracting natural language intent, constraints, and scope from user query.
    """
    def __init__(self, db=None):
        self.db = db

    def extract_intent(self, query: str, profile: Optional[StudentProfile] = None) -> Dict[str, Any]:
        q_lower = query.lower().strip()

        # Intent detection
        is_followup_cheapest = any(phrase in q_lower for phrase in ["cheapest", "lowest fee", "least fee", "most affordable", "which is cheapest", "which of these is cheapest"])
        is_followup_placement = any(phrase in q_lower for phrase in ["best placement", "highest package", "top placement", "highest salary", "best salary"])
        is_followup_safest = any(phrase in q_lower for phrase in ["safest", "safest college", "highest chance", "easiest to get"])
        is_compare = any(k in q_lower for k in ["compare", "versus", "vs"])
        is_what_if = (any(k in q_lower for k in ["increase", "increases", "increased", "higher score", "plus", "more marks", "if my score", "score improves", "what if"])
                      and any(k in q_lower for k in ["score", "mark", "percentile", "rank", "what happens"]))
        is_course_query = any(k in q_lower for k in ["which course", "what course", "best course", "course for me", "recommend course", "degree", "branch"])
        is_nirf_query = any(k in q_lower for k in ["nirf", "nirf rank", "nirf-ranked", "nirf ranked", "highest nirf", "best nirf", "top nirf", "best ranking", "highest ranking"])

        intent_type = "college_recommendation"
        if is_followup_cheapest:
            intent_type = "followup_cheapest"
        elif is_followup_placement:
            intent_type = "followup_placement"
        elif is_followup_safest:
            intent_type = "followup_safest"
        elif is_compare:
            intent_type = "comparison"
        elif is_what_if:
            intent_type = "what_if"
        elif is_course_query:
            intent_type = "course_recommendation"
        elif is_nirf_query:
            intent_type = "nirf_recommendation"

        # Check explicit India-wide search
        anywhere_in_india = any(phrase in q_lower for phrase in [
            "anywhere in india", "across india", "all india", "all over india", 
            "in india", "nationwide", "pan india", "any state", "countrywide"
        ])

        # Check Nearby / Radius search
        nearby_search = False
        nearby_radius_km = 50.0
        if "near" in q_lower or "within" in q_lower or "around" in q_lower:
            if not any(k in q_lower for k in ["colleges in", "best college in"]):
                nearby_search = True
                radius_match = re.search(r'(\d+)\s*(?:km|kms|kilometers)', q_lower)
                if radius_match:
                    nearby_radius_km = float(radius_match.group(1))

        extracted_state = None
        extracted_district = None
        extracted_city = None
        extracted_course = None
        extracted_budget = None
        explicit_location = False
        explicit_district = False
        explicit_course = False
        explicit_budget = False

        # 1. State extraction FIRST (to prevent multi-word states like "Tamil Nadu" being split)
        for state_alias, norm_state in STATE_MAPPING.items():
            pattern = r'\b' + re.escape(state_alias) + r'\b'
            if re.search(pattern, q_lower):
                extracted_state = norm_state
                explicit_location = True
                break

        # 2. District extraction
        for dt_alias, (norm_dt, norm_st) in DISTRICT_MAPPING.items():
            pattern = r'\b' + re.escape(dt_alias) + r'\b'
            if re.search(pattern, q_lower):
                extracted_district = norm_dt
                extracted_state = norm_st
                explicit_district = True
                explicit_location = True
                break

        if not extracted_district:
            dt_match = re.search(r'\b([a-zA-Z]+)\s+district\b', q_lower)
            if dt_match:
                candidate = dt_match.group(1).title()
                extracted_district = candidate
                explicit_district = True
                explicit_location = True
                if candidate.lower() in CITY_MAPPING:
                    extracted_state = CITY_MAPPING[candidate.lower()][1]
                elif not extracted_state:
                    extracted_state = "Tamil Nadu"

        # 3. City extraction (only if district wasn't explicit and state didn't consume the city name)
        if not extracted_district:
            for city_alias, (norm_city, norm_state) in CITY_MAPPING.items():
                pattern = r'\b' + re.escape(city_alias) + r'\b'
                if re.search(pattern, q_lower):
                    extracted_city = norm_city
                    extracted_state = norm_state
                    explicit_location = True
                    break

        # Dynamic city match via prepositions if not in mapping dictionary and state was not explicit
        if not extracted_city and not extracted_district and not extracted_state:
            match = re.search(r'\b(?:in|near|at|around|for)\s+([a-zA-Z]+)(?:\b|\?|\s)', q_lower)
            if match:
                candidate = match.group(1).lower()
                ignored_words = {
                    "india", "my", "our", "the", "a", "an", "this", "that", "best", "top", "cse", "ece", "mech", 
                    "it", "engineering", "college", "colleges", "budget", "me", "tamil", "nadu", "pradesh", 
                    "maharashtra", "karnataka", "kerala", "delhi", "cutoff", "cutoffs", "mark", "marks", 
                    "psg", "ssn", "ceg", "cit", "mit", "rit", "tnea", "anna", "university", "admission", "rank", "score"
                }
                if candidate not in ignored_words:
                    if candidate in CITY_MAPPING:
                        extracted_city, extracted_state = CITY_MAPPING[candidate]
                        explicit_location = True
                    elif self.db:
                        from app.models.models import City
                        c_db = self.db.query(City).filter(City.normalized_name == candidate).first()
                        if c_db:
                            extracted_city = c_db.name
                            extracted_state = "Tamil Nadu"
                            explicit_location = True

        # 4. Course extraction
        for course_alias, norm_course in COURSE_MAPPING.items():
            pattern = r'\b' + re.escape(course_alias) + r'\b'
            if re.search(pattern, q_lower):
                extracted_course = norm_course
                explicit_course = True
                break

        # 5. Budget extraction
        if "my budget" in q_lower or "under my budget" in q_lower or "within my budget" in q_lower:
            explicit_budget = True
            if profile and profile.max_budget:
                extracted_budget = profile.max_budget
        else:
            budget_match = re.search(r'(?:under|below|within|budget of|max|less than)?\s*(\d+(?:\.\d+)?)\s*(?:lakhs?|lakh|l|lac|lacs|k|000)?', q_lower)
            if budget_match:
                val = float(budget_match.group(1))
                if val >= 1000:
                    val = val / 100000.0
                if val <= 50.0:
                    extracted_budget = val
                    explicit_budget = True

        use_student_profile = any(phrase in q_lower for phrase in ["for me", "my profile", "my rank", "my score", "can i get", "should i apply", "my budget"])

        return {
            "intent": intent_type,
            "raw_query": query,
            "state": extracted_state,
            "district": extracted_district,
            "city": extracted_city,
            "course": extracted_course,
            "max_budget": extracted_budget,
            "explicit_location": explicit_location,
            "explicit_district": explicit_district,
            "explicit_course": explicit_course,
            "explicit_budget": explicit_budget,
            "nearby_search": nearby_search,
            "nearby_radius_km": nearby_radius_km,
            "anywhere_in_india": anywhere_in_india,
            "use_student_profile": use_student_profile
        }
