from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.models import Course, Cutoff
from app.schemas.schemas import CourseOut, CutoffOut

router = APIRouter(tags=["Courses & Cutoffs"])

@router.get("/courses", response_model=List[CourseOut])
def get_courses(db: Session = Depends(get_db)):
    return db.query(Course).all()

@router.get("/courses/{id}", response_model=CourseOut)
def get_course_by_id(id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with ID {id} not found"
        )
    return course

@router.get("/cutoffs", response_model=List[CutoffOut])
def get_cutoffs(db: Session = Depends(get_db)):
    cutoffs = db.query(Cutoff).all()
    
    # Add names dynamically for user-friendly UI display
    results = []
    for c in cutoffs:
        out = CutoffOut.model_validate(c)
        out.college_name = c.college.name
        out.course_name = c.course.name
        results.append(out)
        
    return results
