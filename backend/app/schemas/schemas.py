from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field("student", pattern="^(student|admin)$")

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# --- Student Profile Schemas ---
class StudentProfileBase(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    percentage_10th: float
    percentage_12th: float
    cgpa: Optional[float] = None
    stream: str
    board: str
    physics_marks: Optional[float] = 90.0
    chemistry_marks: Optional[float] = 90.0
    maths_marks: Optional[float] = 90.0
    tnea_cutoff: Optional[float] = 180.0
    community: Optional[str] = "OC"
    exam_name: Optional[str] = "TNEA Cutoff"
    exam_score: Optional[float] = 180.0
    percentile: Optional[float] = None
    rank: Optional[int] = None
    preferred_course: Optional[str] = None
    preferred_branch: Optional[str] = None
    preferred_state: Optional[str] = None
    preferred_city: Optional[str] = None
    max_budget: Optional[float] = None
    hostel_required: bool = False
    government_private_preference: str = "any"
    career_interests: Optional[List[str]] = None

class StudentProfileCreate(StudentProfileBase):
    pass

class StudentProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    percentage_10th: Optional[float] = None
    percentage_12th: Optional[float] = None
    cgpa: Optional[float] = None
    stream: Optional[str] = None
    board: Optional[str] = None
    physics_marks: Optional[float] = None
    chemistry_marks: Optional[float] = None
    maths_marks: Optional[float] = None
    tnea_cutoff: Optional[float] = None
    community: Optional[str] = None
    exam_name: Optional[str] = None
    exam_score: Optional[float] = None
    percentile: Optional[float] = None
    rank: Optional[int] = None
    preferred_course: Optional[str] = None
    preferred_branch: Optional[str] = None
    preferred_state: Optional[str] = None
    preferred_city: Optional[str] = None
    max_budget: Optional[float] = None
    hostel_required: Optional[bool] = None
    government_private_preference: Optional[str] = None
    career_interests: Optional[List[str]] = None

class StudentProfileOut(StudentProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Course Schemas ---
class CourseBase(BaseModel):
    name: str
    department: str
    duration: str
    eligibility_description: Optional[str] = None
    entrance_exam: Optional[str] = None
    minimum_percentage: float = 50.0
    career_opportunities: Optional[List[str]] = None
    description: Optional[str] = None

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    duration: Optional[str] = None
    eligibility_description: Optional[str] = None
    entrance_exam: Optional[str] = None
    minimum_percentage: Optional[float] = None
    career_opportunities: Optional[List[str]] = None
    description: Optional[str] = None

class CourseOut(CourseBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- College Schemas ---
class CollegeBase(BaseModel):
    name: str
    university: Optional[str] = None
    location: str
    state: str
    district: Optional[str] = None
    city: str
    type: str
    established_year: Optional[int] = None
    ranking: Optional[int] = None
    accreditation: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    city_id: Optional[int] = None
    nirf_year: Optional[int] = 2024
    nirf_category: Optional[str] = "Engineering"
    nirf_rank: Optional[int] = None
    nirf_score: Optional[float] = None
    nirf_source: Optional[str] = "NIRF Official 2024"
    tuition_fee: float
    hostel_fee: float
    total_estimated_fee: float
    placement_percentage: Optional[float] = None
    average_package: Optional[float] = None
    highest_package: Optional[float] = None
    median_package: Optional[float] = None
    hostel_facility: bool = False
    library_facility: bool = False
    labs_facility: bool = False
    sports_facility: bool = False
    transport_facility: bool = False

class CollegeCreate(CollegeBase):
    pass

class CollegeUpdate(BaseModel):
    name: Optional[str] = None
    university: Optional[str] = None
    location: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    type: Optional[str] = None
    established_year: Optional[int] = None
    ranking: Optional[int] = None
    accreditation: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    city_id: Optional[int] = None
    nirf_year: Optional[int] = None
    nirf_category: Optional[str] = None
    nirf_rank: Optional[int] = None
    nirf_score: Optional[float] = None
    nirf_source: Optional[str] = None
    tuition_fee: Optional[float] = None
    hostel_fee: Optional[float] = None
    total_estimated_fee: Optional[float] = None
    placement_percentage: Optional[float] = None
    average_package: Optional[float] = None
    highest_package: Optional[float] = None
    median_package: Optional[float] = None
    hostel_facility: Optional[bool] = None
    library_facility: Optional[bool] = None
    labs_facility: Optional[bool] = None
    sports_facility: Optional[bool] = None
    transport_facility: Optional[bool] = None

class CollegeOut(CollegeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    courses: List[CourseOut] = []

    class Config:
        from_attributes = True

# --- Cutoff Schemas ---
class CutoffBase(BaseModel):
    college_id: int
    course_id: int
    year: int
    exam: str
    category: str
    cutoff_score: Optional[float] = None
    cutoff_rank: Optional[int] = None
    minimum_percentage: Optional[float] = None

class CutoffCreate(CutoffBase):
    pass

class CutoffOut(CutoffBase):
    id: int
    created_at: datetime
    college_name: Optional[str] = None
    course_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- Recommendation Schemas ---
class RecommendationOut(BaseModel):
    id: int
    student_id: int
    college_id: int
    college: CollegeOut
    match_score: float
    eligibility_status: str
    admission_chance: str
    classification: str
    reasons: List[str]
    warnings: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Saved College Schemas ---
class SavedCollegeCreate(BaseModel):
    college_id: int

class SavedCollegeOut(BaseModel):
    id: int
    student_id: int
    college_id: int
    college: CollegeOut
    created_at: datetime

    class Config:
        from_attributes = True

# --- Application Tracking Schemas ---
class ApplicationCreate(BaseModel):
    college_id: int
    course_id: int
    status: str = "Interested"
    application_date: Optional[str] = None
    notes: Optional[str] = None
    deadline: Optional[str] = None

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    application_date: Optional[str] = None
    notes: Optional[str] = None
    deadline: Optional[str] = None

class ApplicationOut(BaseModel):
    id: int
    student_id: int
    college_id: int
    course_id: int
    college: CollegeOut
    course: CourseOut
    status: str
    application_date: Optional[str] = None
    notes: Optional[str] = None
    deadline: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Chat/AI Counselor Schemas ---
class ChatMessageCreate(BaseModel):
    message: str

class ChatMessageOut(BaseModel):
    id: int
    session_id: int
    sender: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Counseling Session"

class ChatSessionOut(BaseModel):
    id: int
    student_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageOut] = []

    class Config:
        from_attributes = True

# --- Custom Form/Action Requests ---
class EligibilityCheckRequest(BaseModel):
    percentage_12th: float
    cgpa: Optional[float] = None
    exam_name: Optional[str] = None
    exam_score: Optional[float] = None
    college_id: int
    course_id: int

class EligibilityCheckResponse(BaseModel):
    eligible: str # 'Eligible', 'Not Eligible', 'Conditional'
    reasons: List[str]

class ChancePredictRequest(BaseModel):
    exam_name: str
    exam_score: float
    college_id: int
    course_id: int
    category: str = "General"

class ChancePredictResponse(BaseModel):
    chance: str # 'High', 'Moderate', 'Low'
    reason: str
    confidence: str

class WhatIfRequest(BaseModel):
    exam_score: Optional[float] = None
    percentage_12th: Optional[float] = None
    cgpa: Optional[float] = None
    max_budget: Optional[float] = None
    preferred_state: Optional[str] = None
    preferred_course: Optional[str] = None

class WhatIfCollegeResult(BaseModel):
    college_id: int
    college_name: str
    before_match_score: float
    after_match_score: float
    before_chance: str
    after_chance: str
    before_eligibility: str
    after_eligibility: str

class WhatIfResponse(BaseModel):
    results: List[WhatIfCollegeResult]

class CompareRequest(BaseModel):
    college_ids: List[int]

class CompareResponse(BaseModel):
    colleges: List[Dict[str, Any]]
    ai_summary: str

# --- Admin Statistics ---
class AdminStatistics(BaseModel):
    total_students: int
    total_colleges: int
    total_courses: int
    total_cutoffs: int
    total_applications: int
    applications_by_status: Dict[str, int]
