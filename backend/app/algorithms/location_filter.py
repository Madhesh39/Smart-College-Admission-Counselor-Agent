import re
import logging
from typing import Optional, Dict, Any, List
from app.models.models import College, StudentProfile, Course

logger = logging.getLogger(__name__)

# State Aliases and Normalization Mapping (Supports all 28 States & 8 UTs)
STATE_MAPPING = {
    "tn": "Tamil Nadu",
    "tamil nadu": "Tamil Nadu",
    "tamilnadu": "Tamil Nadu",
    "tamil nadu state": "Tamil Nadu",
    "mh": "Maharashtra",
    "maharashtra": "Maharashtra",
    "maharastra": "Maharashtra",
    "maharashtra state": "Maharashtra",
    "ka": "Karnataka",
    "karnataka": "Karnataka",
    "karnatak": "Karnataka",
    "karnataka state": "Karnataka",
    "dl": "Delhi",
    "delhi": "Delhi",
    "new delhi": "Delhi",
    "wb": "West Bengal",
    "west bengal": "West Bengal",
    "bengal": "West Bengal",
    "rj": "Rajasthan",
    "rajasthan": "Rajasthan",
    "pb": "Punjab",
    "punjab": "Punjab",
    "up": "Uttar Pradesh",
    "uttar pradesh": "Uttar Pradesh",
    "gj": "Gujarat",
    "gujarat": "Gujarat",
    "kl": "Kerala",
    "kerala": "Kerala",
    "ap": "Andhra Pradesh",
    "andhra pradesh": "Andhra Pradesh",
    "andhra": "Andhra Pradesh",
    "ts": "Telangana",
    "telangana": "Telangana",
    "mp": "Madhya Pradesh",
    "madhya pradesh": "Madhya Pradesh",
    "hr": "Haryana",
    "haryana": "Haryana",
    "br": "Bihar",
    "bihar": "Bihar",
    "or": "Odisha",
    "odisha": "Odisha",
    "orissa": "Odisha",
    "as": "Assam",
    "assam": "Assam",
    "py": "Puducherry",
    "puducherry": "Puducherry",
    "pondicherry": "Puducherry",
    "ch": "Chandigarh",
    "chandigarh": "Chandigarh",
}

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
    "dindigul district": ("Dindigul", "Tamil Nadu"),
    "karur district": ("Karur", "Tamil Nadu"),
    "namakkal district": ("Namakkal", "Tamil Nadu"),
    "kanchipuram district": ("Kanchipuram", "Tamil Nadu"),
    "mumbai district": ("Mumbai", "Maharashtra"),
    "pune district": ("Pune", "Maharashtra"),
    "bengaluru district": ("Bengaluru", "Karnataka"),
    "bangalore district": ("Bengaluru", "Karnataka"),
}

# City Aliases and Normalization Mapping -> (Normalized City, Normalized State)
CITY_MAPPING = {
    # Tamil Nadu Cities
    "erode": ("Erode", "Tamil Nadu"),
    "perundurai": ("Erode", "Tamil Nadu"),
    "sathyamangalam": ("Erode", "Tamil Nadu"),
    "thindal": ("Erode", "Tamil Nadu"),
    "coimbatore": ("Coimbatore", "Tamil Nadu"),
    "covai": ("Coimbatore", "Tamil Nadu"),
    "chennai": ("Chennai", "Tamil Nadu"),
    "madras": ("Chennai", "Tamil Nadu"),
    "madurai": ("Madurai", "Tamil Nadu"),
    "tiruchirappalli": ("Tiruchirappalli", "Tamil Nadu"),
    "trichy": ("Tiruchirappalli", "Tamil Nadu"),
    "salem": ("Salem", "Tamil Nadu"),
    "tiruppur": ("Tiruppur", "Tamil Nadu"),
    "vellore": ("Vellore", "Tamil Nadu"),
    "thanjavur": ("Thanjavur", "Tamil Nadu"),
    "dindigul": ("Dindigul", "Tamil Nadu"),
    "karur": ("Karur", "Tamil Nadu"),
    "namakkal": ("Namakkal", "Tamil Nadu"),

    # Other Major Indian Cities
    "mumbai": ("Mumbai", "Maharashtra"),
    "bombay": ("Mumbai", "Maharashtra"),
    "pune": ("Pune", "Maharashtra"),
    "nagpur": ("Nagpur", "Maharashtra"),
    "bengaluru": ("Bengaluru", "Karnataka"),
    "bangalore": ("Bengaluru", "Karnataka"),
    "mangaluru": ("Mangaluru", "Karnataka"),
    "mangalore": ("Mangaluru", "Karnataka"),
    "surathkal": ("Mangaluru", "Karnataka"),
    "manipal": ("Manipal", "Karnataka"),
    "pilani": ("Pilani", "Rajasthan"),
    "kolkata": ("Kolkata", "West Bengal"),
    "patiala": ("Patiala", "Punjab"),
    "kanpur": ("Kanpur", "Uttar Pradesh"),
    "trivandrum": ("Trivandrum", "Kerala"),
    "thiruvananthapuram": ("Trivandrum", "Kerala"),
}

# Course Alias Mapping
COURSE_MAPPING = {
    "cse": "Computer Science and Engineering",
    "computer science": "Computer Science and Engineering",
    "computer science engineering": "Computer Science and Engineering",
    "cs": "Computer Science and Engineering",
    "ece": "Electronics and Communication Engineering",
    "electronics": "Electronics and Communication Engineering",
    "eee": "Electrical and Electronics Engineering",
    "electrical": "Electrical and Electronics Engineering",
    "mechanical": "Mechanical Engineering",
    "mech": "Mechanical Engineering",
    "civil": "Civil Engineering",
    "it": "Information Technology",
    "information technology": "Information Technology",
    "ai": "Artificial Intelligence and Data Science",
    "ai & ml": "Artificial Intelligence and Machine Learning",
    "aiml": "Artificial Intelligence and Machine Learning",
    "data science": "Artificial Intelligence and Data Science",
    "biotechnology": "Biotechnology Engineering",
    "biotech": "Biotechnology Engineering",
    "robotics": "Robotics and Automation",
    "bca": "Bachelor of Computer Applications (BCA)",
    "bba": "Bachelor of Business Administration (BBA)",
    "mba": "Master of Business Administration (MBA)",
    "mca": "Master of Computer Applications (MCA)",
}

def normalize_state(state_name: Optional[str]) -> Optional[str]:
    if not state_name:
        return None
    s = state_name.strip().lower()
    return STATE_MAPPING.get(s, state_name.strip().title())

def normalize_city(city_name: Optional[str]) -> Optional[str]:
    if not city_name:
        return None
    c = city_name.strip().lower()
    if c in CITY_MAPPING:
        return CITY_MAPPING[c][0]
    return city_name.strip().title()

def extract_query_constraints(query: str, profile: Optional[StudentProfile] = None) -> Dict[str, Any]:
    """
    Extracts explicit location, course, budget, and scope constraints from user query text.
    """
    q_lower = query.lower().strip()
    
    extracted_state = None
    extracted_district = None
    extracted_city = None
    extracted_course = None
    extracted_budget = None
    explicit_location = False
    explicit_district = False
    explicit_course = False
    explicit_budget = False
    anywhere_in_india = False

    # Check explicit nationwide clearing phrase
    if any(phrase in q_lower for phrase in [
        "anywhere in india", "across india", "all india", "all over india", 
        "in india", "nationwide", "pan india", "any state", "countrywide"
    ]):
        anywhere_in_india = True

    # 1. State extraction FIRST (prevents multi-word states like "Tamil Nadu" being misparsed)
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

    # 3. City extraction (if district wasn't explicit and state didn't consume city name)
    if not extracted_district:
        for city_alias, (norm_city, norm_state) in CITY_MAPPING.items():
            pattern = r'\b' + re.escape(city_alias) + r'\b'
            if re.search(pattern, q_lower):
                extracted_city = norm_city
                extracted_state = norm_state
                explicit_location = True
                break

    # Dynamic city match via prepositions if not in mapping dictionary
    if not extracted_city and not extracted_district and not extracted_state and not anywhere_in_india:
        match = re.search(r'\b(?:in|near|at|around|for)\s+([a-zA-Z]+)(?:\b|\?|\s)', q_lower)
        if match:
            candidate = match.group(1).lower()
            ignored_words = {
                "india", "my", "our", "the", "a", "an", "this", "that", "best", "top", "cse", "ece", "mech", 
                "it", "engineering", "college", "colleges", "budget", "me", "tamil", "nadu", "pradesh", 
                "maharashtra", "karnataka", "kerala", "delhi"
            }
            if candidate not in ignored_words:
                if candidate in CITY_MAPPING:
                    extracted_city, extracted_state = CITY_MAPPING[candidate]
                else:
                    extracted_city = candidate.title()
                    extracted_state = "Tamil Nadu"
                explicit_location = True

    # Override state/city if explicitly requested nationwide without specific location
    if anywhere_in_india and not extracted_city and not extracted_district and not (extracted_state and any(s in q_lower for s in ["tamil nadu", "maharashtra", "karnataka", "delhi"])):
        extracted_state = None
        extracted_district = None
        extracted_city = None
        explicit_location = False

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
            try:
                val = float(budget_match.group(1))
                if val >= 1000:
                    val = val / 100000.0
                if val <= 50.0:
                    extracted_budget = val
                    explicit_budget = True
            except ValueError:
                pass

    return {
        "state": extracted_state,
        "district": extracted_district,
        "city": extracted_city,
        "course": extracted_course,
        "max_budget": extracted_budget,
        "explicit_location": explicit_location,
        "explicit_district": explicit_district,
        "explicit_course": explicit_course,
        "explicit_budget": explicit_budget,
        "anywhere_in_india": anywhere_in_india
    }

def filter_colleges_by_constraints(
    colleges: List[College], 
    constraints: Dict[str, Any]
) -> List[College]:
    """
    Applies strict HARD constraint filtering on candidate colleges BEFORE recommendation scoring.
    """
    filtered = list(colleges)

    # 1. District Hard Filter
    if constraints.get("explicit_district") and constraints.get("district"):
        req_dist = constraints["district"].strip().lower()
        filtered = [
            c for c in filtered
            if (c.district and c.district.strip().lower() == req_dist) or
               (c.city and c.city.strip().lower() == req_dist)
        ]

    # 2. City Hard Filter (if explicit city specified)
    elif constraints.get("explicit_location") and constraints.get("city"):
        req_city = normalize_city(constraints["city"])
        filtered = [
            c for c in filtered 
            if normalize_city(c.city) == req_city
        ]

    # 3. State Hard Filter (if explicit state specified)
    elif constraints.get("explicit_location") and constraints.get("state"):
        req_state = normalize_state(constraints["state"])
        filtered = [
            c for c in filtered 
            if normalize_state(c.state) == req_state
        ]

    # 4. Budget Hard Filter
    if constraints.get("explicit_budget") and constraints.get("max_budget") is not None:
        budget_limit = float(constraints["max_budget"])
        filtered = [
            c for c in filtered 
            if c.total_estimated_fee <= budget_limit
        ]

    return filtered
