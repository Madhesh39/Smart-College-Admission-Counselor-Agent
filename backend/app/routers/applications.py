from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.models import Application, StudentProfile, User
from app.schemas.schemas import ApplicationOut, ApplicationCreate, ApplicationUpdate
from app.auth.auth_handler import get_current_user

router = APIRouter(prefix="/applications", tags=["Application Tracking"])

@router.get("", response_model=List[ApplicationOut])
def get_applications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        return []
    return db.query(Application).filter(Application.student_id == profile.id).all()

@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    app_data: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Please complete your student profile first.")

    # Check if application already exists for this college + course
    existing = db.query(Application).filter(
        Application.student_id == profile.id,
        Application.college_id == app_data.college_id,
        Application.course_id == app_data.course_id
    ).first()
    
    if existing:
        if app_data.status: existing.status = app_data.status
        if app_data.notes: existing.notes = app_data.notes
        if app_data.deadline: existing.deadline = app_data.deadline
        if app_data.application_date: existing.application_date = app_data.application_date
        db.commit()
        db.refresh(existing)
        return existing

    new_app = Application(
        student_id=profile.id,
        college_id=app_data.college_id,
        course_id=app_data.course_id,
        status=app_data.status,
        application_date=app_data.application_date,
        notes=app_data.notes,
        deadline=app_data.deadline
    )
    
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    return new_app

@router.put("/{id}", response_model=ApplicationOut)
def update_application(
    id: int,
    app_data: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Profile not found.")

    application = db.query(Application).filter(
        Application.id == id,
        Application.student_id == profile.id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application record not found.")

    update_dict = app_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(application, key, value)

    db.commit()
    db.refresh(application)
    return application

@router.delete("/{id}")
def delete_application(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Profile not found.")

    application = db.query(Application).filter(
        Application.id == id,
        Application.student_id == profile.id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application record not found.")

    db.delete(application)
    db.commit()
    return {"message": "Application removed from tracking list"}
