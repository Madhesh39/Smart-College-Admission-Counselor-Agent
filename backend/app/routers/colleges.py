from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Any

from app.database import get_db
from app.models.models import College, Course, StudentProfile, SavedCollege, User
from app.schemas.schemas import (
    CollegeOut, SavedCollegeOut, SavedCollegeCreate, 
    EligibilityCheckRequest, EligibilityCheckResponse,
    ChancePredictRequest, ChancePredictResponse,
    CompareRequest, CompareResponse
)
from app.auth.auth_handler import get_current_user
from app.agents.orchestrator import AgentOrchestrator
from app.algorithms.recommender import calculate_match_score_deterministic

router = APIRouter(tags=["Colleges"])

@router.get("/colleges", response_model=List[CollegeOut])
def get_colleges(
    name: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    course_name: Optional[str] = None,
    max_fee: Optional[float] = None,
    college_type: Optional[str] = None,
    min_ranking: Optional[int] = None,
    min_package: Optional[float] = None,
    sort_by: Optional[str] = Query(None, pattern="^(fees|placement|ranking|name)$"),
    sort_dir: Optional[str] = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    query = db.query(College)
    
    if name:
        query = query.filter(College.name.ilike(f"%{name}%"))
    if state:
        query = query.filter(College.state.ilike(f"%{state}%"))
    if city:
        query = query.filter(College.city.ilike(f"%{city}%"))
    if college_type:
        query = query.filter(College.type.ilike(f"%{college_type}%"))
    if max_fee:
        query = query.filter(College.total_estimated_fee <= max_fee)
    if min_ranking:
        query = query.filter(College.ranking >= min_ranking)
    if min_package:
        query = query.filter(College.average_package >= min_package)
    if course_name:
        query = query.join(College.courses).filter(Course.name.ilike(f"%{course_name}%"))

    # Sorting
    if sort_by == "fees":
        query = query.order_by(College.total_estimated_fee.desc() if sort_dir == "desc" else College.total_estimated_fee.asc())
    elif sort_by == "placement":
        query = query.order_by(College.average_package.desc() if sort_dir == "desc" else College.average_package.asc())
    elif sort_by == "ranking":
        query = query.order_by(College.ranking.desc() if sort_dir == "desc" else College.ranking.asc())
    elif sort_by == "name":
        query = query.order_by(College.name.desc() if sort_dir == "desc" else College.name.asc())
        
    return query.all()

@router.get("/colleges/{id}", response_model=CollegeOut)
def get_college_by_id(id: int, db: Session = Depends(get_db)):
    college = db.query(College).filter(College.id == id).first()
    if not college:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"College with ID {id} not found"
        )
    return college

# --- Saved Colleges Operations ---

@router.get("/saved-colleges", response_model=List[SavedCollegeOut])
@router.get("/students/saved-colleges", response_model=List[SavedCollegeOut])
def get_saved_colleges(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        profile = StudentProfile(user_id=current_user.id, full_name=current_user.username, email=current_user.email, percentage_10th=80.0, percentage_12th=80.0, stream="Science", board="CBSE")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return db.query(SavedCollege).filter(SavedCollege.student_id == profile.id).all()

@router.post("/saved-colleges", response_model=SavedCollegeOut)
@router.post("/students/saved-colleges/{college_id}", response_model=SavedCollegeOut)
def save_college(
    college_id: Optional[int] = None,
    saved_data: Optional[SavedCollegeCreate] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        profile = StudentProfile(user_id=current_user.id, full_name=current_user.username, email=current_user.email, percentage_10th=80.0, percentage_12th=80.0, stream="Science", board="CBSE")
        db.add(profile)
        db.commit()
        db.refresh(profile)

    target_college_id = college_id or (saved_data.college_id if saved_data else None)
    if not target_college_id:
        raise HTTPException(status_code=400, detail="College ID is required.")

    existing = db.query(SavedCollege).filter(
        SavedCollege.student_id == profile.id,
        SavedCollege.college_id == target_college_id
    ).first()
    
    if existing:
        return existing
        
    new_saved = SavedCollege(
        student_id=profile.id,
        college_id=target_college_id
    )
    db.add(new_saved)
    db.commit()
    db.refresh(new_saved)
    return new_saved

@router.delete("/saved-colleges/{id}")
@router.delete("/students/saved-colleges/{id}")
def delete_saved_college(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        return {"message": "Profile not found"}
        
    saved = db.query(SavedCollege).filter(
        (SavedCollege.id == id) | (SavedCollege.college_id == id),
        SavedCollege.student_id == profile.id
    ).first()
    
    if saved:
        db.delete(saved)
        db.commit()
    return {"message": "College removed from shortlist"}

# --- Orchestrated Agent Actions ---

@router.post("/eligibility/check", response_model=EligibilityCheckResponse)
@router.post("/recommendations/eligibility/{college_id}", response_model=EligibilityCheckResponse)
async def check_eligibility(
    college_id: Optional[int] = None,
    req: Optional[EligibilityCheckRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        profile = StudentProfile(
            user_id=current_user.id,
            full_name=current_user.username,
            email=current_user.email,
            percentage_10th=80.0,
            percentage_12th=80.0,
            stream="Science",
            board="CBSE",
            exam_name="JEE Main",
            exam_score=85.0
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    target_college_id = college_id or (req.college_id if req else 1)
    target_course_id = req.course_id if req else 1

    orchestrator = AgentOrchestrator(db)
    result = await orchestrator.check_eligibility(profile, target_college_id, target_course_id)
    return result

@router.post("/admission-chance/predict", response_model=ChancePredictResponse)
async def predict_admission_chance(
    req: ChancePredictRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Student profile required.")

    # Apply temporary scores from request to simulate predictions
    profile.exam_name = req.exam_name
    profile.exam_score = req.exam_score

    orchestrator = AgentOrchestrator(db)
    result = await orchestrator.predict_admission_chance(profile, req.college_id, req.course_id)
    
    return {
        "chance": result["admission_chance"],
        "reason": result["reason"],
        "confidence": result["confidence"]
    }

@router.post("/colleges/compare")
async def compare_colleges(
    payload: Any = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        profile = StudentProfile(user_id=current_user.id, full_name=current_user.username, email=current_user.email, percentage_10th=80.0, percentage_12th=80.0, stream="Science", board="CBSE")
        db.add(profile)
        db.commit()
        db.refresh(profile)

    if isinstance(payload, list):
        college_ids = payload
    elif isinstance(payload, dict) and "college_ids" in payload:
        college_ids = payload["college_ids"]
    else:
        college_ids = [1, 2]

    course_name = profile.preferred_course or "Computer Science"
    course = db.query(Course).filter(Course.name.ilike(f"%{course_name}%")).first()
    if not course:
        course = db.query(Course).first()

    orchestrator = AgentOrchestrator(db)
    result = await orchestrator.compare_colleges(profile, college_ids, course.id if course else 1)
    return result
