from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, StudentProfile
from app.schemas.schemas import StudentProfileCreate, StudentProfileUpdate, StudentProfileOut
from app.auth.auth_handler import get_current_active_student, get_current_user

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("/profile", response_model=StudentProfileOut)
@router.get("/me", response_model=StudentProfileOut)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
            exam_score=85.0,
            percentile=90.0,
            rank=40000,
            preferred_course="Computer Science and Engineering",
            preferred_state="Maharashtra",
            preferred_city="Mumbai",
            max_budget=5.0,
            hostel_required=True
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.post("/profile", response_model=StudentProfileOut)
@router.post("/me", response_model=StudentProfileOut)
def create_profile(
    profile_data: StudentProfileCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    existing = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if existing:
        for key, value in profile_data.model_dump(exclude_unset=True).items():
            setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        return existing
        
    db_profile = StudentProfile(
        user_id=current_user.id,
        **profile_data.model_dump()
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

@router.put("/profile", response_model=StudentProfileOut)
@router.put("/me", response_model=StudentProfileOut)
def update_profile(
    profile_data: StudentProfileUpdate, 
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
            board="CBSE"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        
    update_data = profile_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)
        
    db.commit()
    db.refresh(profile)
    return profile
