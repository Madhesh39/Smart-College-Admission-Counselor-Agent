from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, Table, DateTime, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# Association Table for College and Course (Many-to-Many)
college_courses = Table(
    'college_courses',
    Base.metadata,
    Column('college_id', Integer, ForeignKey('colleges.id', ondelete='CASCADE'), primary_key=True),
    Column('course_id', Integer, ForeignKey('courses.id', ondelete='CASCADE'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="student", nullable=False) # 'student' or 'admin'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    profile = relationship("StudentProfile", uselist=False, back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class State(Base):
    __tablename__ = "states"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    normalized_name = Column(String(100), nullable=False, index=True)
    state_code = Column(String(10), nullable=True)
    type = Column(String(50), default="STATE", nullable=False) # 'STATE', 'UNION_TERRITORY', 'COUNTRY'
    last_verified_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    districts = relationship("District", back_populates="state", cascade="all, delete-orphan")
    cities = relationship("City", back_populates="state", cascade="all, delete-orphan")
    colleges = relationship("College", back_populates="state_rel")

class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    normalized_name = Column(String(100), nullable=False, index=True)
    district_code = Column(String(10), nullable=True)
    state_id = Column(Integer, ForeignKey("states.id", ondelete="CASCADE"), nullable=False, index=True)
    last_verified_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    state = relationship("State", back_populates="districts")
    cities = relationship("City", back_populates="district", cascade="all, delete-orphan")
    colleges = relationship("College", back_populates="district_rel")

class City(Base):
    __tablename__ = "cities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    normalized_name = Column(String(100), nullable=False, index=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="SET NULL"), nullable=True, index=True)
    state_id = Column(Integer, ForeignKey("states.id", ondelete="CASCADE"), nullable=False, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    last_verified_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    district = relationship("District", back_populates="cities")
    state = relationship("State", back_populates="cities")
    colleges = relationship("College", back_populates="city_rel")

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Personal Info
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    date_of_birth = Column(String(20), nullable=True)
    gender = Column(String(20), nullable=True)

    # Academic Info
    percentage_10th = Column(Float, nullable=False)
    percentage_12th = Column(Float, nullable=False)
    cgpa = Column(Float, nullable=True)
    stream = Column(String(50), nullable=False)
    board = Column(String(50), nullable=False)

    # TNEA Subject Marks & Cutoff Calculation (Physics/2 + Chemistry/2 + Maths)
    physics_marks = Column(Float, nullable=True, default=90.0)
    chemistry_marks = Column(Float, nullable=True, default=90.0)
    maths_marks = Column(Float, nullable=True, default=90.0)
    tnea_cutoff = Column(Float, nullable=True, default=180.0)
    community = Column(String(20), nullable=True, default="OC") # OC, BC, BCM, MBC, SC, SCA, ST

    # Entrance Examination (TNEA Cutoff out of 200)
    exam_name = Column(String(50), nullable=True, default="TNEA Cutoff")
    exam_score = Column(Float, nullable=True, default=180.0)
    percentile = Column(Float, nullable=True)
    rank = Column(Integer, nullable=True)

    # Preferences
    preferred_course = Column(String(100), nullable=True)
    preferred_branch = Column(String(100), nullable=True)
    preferred_state = Column(String(50), nullable=True)
    preferred_district = Column(String(50), nullable=True)
    preferred_city = Column(String(50), nullable=True)
    max_budget = Column(Float, nullable=True)
    hostel_required = Column(Boolean, default=False)
    government_private_preference = Column(String(20), default="any")

    # Career Interests
    career_interests = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="profile")
    recommendations = relationship("Recommendation", back_populates="student", cascade="all, delete-orphan")
    saved_colleges = relationship("SavedCollege", back_populates="student", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="student", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="student", cascade="all, delete-orphan")

class College(Base):
    __tablename__ = "colleges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True, index=True)
    short_name = Column(String(50), nullable=True)
    university = Column(String(200), nullable=True)
    location = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False, index=True)
    district = Column(String(50), nullable=True, index=True)
    city = Column(String(50), nullable=False, index=True)
    type = Column(String(50), nullable=False) # 'Government', 'Private', 'Semi-Govt'
    ownership = Column(String(50), nullable=True, default="Private")
    established_year = Column(Integer, nullable=True)
    ranking = Column(Integer, nullable=True) # Legacy rank field
    accreditation = Column(String(100), nullable=True) # e.g. NAAC A++
    website = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)

    # Location Foreign Keys & Coordinates
    country_id = Column(Integer, nullable=True, default=1)
    state_id = Column(Integer, ForeignKey("states.id", ondelete="SET NULL"), nullable=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="SET NULL"), nullable=True, index=True)
    city_id = Column(Integer, ForeignKey("cities.id", ondelete="SET NULL"), nullable=True, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Official NIRF Ranking Fields (Requirement 21)
    nirf_year = Column(Integer, nullable=True, default=2024)
    nirf_category = Column(String(50), nullable=True, default="Engineering")
    nirf_rank = Column(Integer, nullable=True, index=True)
    nirf_score = Column(Float, nullable=True)
    nirf_source = Column(String(100), nullable=True, default="NIRF Official 2024")
    nirf_last_verified = Column(DateTime(timezone=True), server_default=func.now())

    # Financial
    tuition_fee = Column(Float, nullable=False)
    hostel_fee = Column(Float, nullable=False)
    total_estimated_fee = Column(Float, nullable=False)

    # Placement Details
    placement_percentage = Column(Float, nullable=True)
    average_package = Column(Float, nullable=True)
    highest_package = Column(Float, nullable=True)
    median_package = Column(Float, nullable=True)

    # Facilities
    hostel_facility = Column(Boolean, default=False)
    library_facility = Column(Boolean, default=False)
    labs_facility = Column(Boolean, default=False)
    sports_facility = Column(Boolean, default=False)
    transport_facility = Column(Boolean, default=False)

    # Credible Source Metadata (AISHE, NIRF, UGC)
    source_name = Column(String(100), nullable=True, default="AISHE")
    source_url = Column(String(255), nullable=True)
    data_type = Column(String(50), nullable=True, default="institution_directory")
    data_confidence = Column(String(20), nullable=True, default="high")
    last_verified_at = Column(DateTime(timezone=True), server_default=func.now())

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    state_rel = relationship("State", back_populates="colleges")
    district_rel = relationship("District", back_populates="colleges")
    city_rel = relationship("City", back_populates="colleges")
    courses = relationship("Course", secondary=college_courses, back_populates="colleges")
    cutoffs = relationship("Cutoff", back_populates="college", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="college", cascade="all, delete-orphan")
    saved_by = relationship("SavedCollege", back_populates="college", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="college", cascade="all, delete-orphan")

    __table_args__ = (
        Index('idx_college_state_district_city', 'state', 'district', 'city'),
        Index('idx_college_fee_nirf', 'total_estimated_fee', 'nirf_rank'),
        Index('idx_college_location_ids', 'state_id', 'district_id', 'city_id'),
    )

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True, index=True)
    department = Column(String(100), nullable=False)
    duration = Column(String(50), nullable=False)
    eligibility_description = Column(Text, nullable=True)
    entrance_exam = Column(String(50), nullable=True)
    minimum_percentage = Column(Float, default=50.0)
    career_opportunities = Column(JSON, nullable=True)
    description = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    colleges = relationship("College", secondary=college_courses, back_populates="courses")
    cutoffs = relationship("Cutoff", back_populates="course", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="course", cascade="all, delete-orphan")

class Cutoff(Base):
    __tablename__ = "cutoffs"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    exam = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False)
    cutoff_score = Column(Float, nullable=True)
    cutoff_rank = Column(Integer, nullable=True)
    minimum_percentage = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    college = relationship("College", back_populates="cutoffs")
    course = relationship("Course", back_populates="cutoffs")

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    match_score = Column(Float, nullable=False)
    eligibility_status = Column(String(50), nullable=False)
    admission_chance = Column(String(20), nullable=False)
    classification = Column(String(20), nullable=False)
    reasons = Column(JSON, nullable=True)
    warnings = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    student = relationship("StudentProfile", back_populates="recommendations")
    college = relationship("College", back_populates="recommendations")

class SavedCollege(Base):
    __tablename__ = "saved_colleges"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("StudentProfile", back_populates="saved_colleges")
    college = relationship("College", back_populates="saved_by")

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="Interested", nullable=False)
    application_date = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    deadline = Column(String(50), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    student = relationship("StudentProfile", back_populates="applications")
    college = relationship("College", back_populates="applications")
    course = relationship("Course", back_populates="applications")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), default="New Counseling Session", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    student = relationship("StudentProfile", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    agent_logs = relationship("AiAgentLog", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    sender = Column(String(20), nullable=False) # 'student' or 'ai'
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("ChatSession", back_populates="messages")

class AiAgentLog(Base):
    __tablename__ = "ai_agent_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    agent_name = Column(String(50), nullable=False)
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    execution_time = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("ChatSession", back_populates="agent_logs")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="notifications")
