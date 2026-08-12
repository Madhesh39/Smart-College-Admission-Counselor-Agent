from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import json
import io

from app.database import get_db
from app.models.models import User, StudentProfile, College, Course, Cutoff, Application, State, District, City
from app.schemas.schemas import (
    AdminStatistics, StudentProfileOut, 
    CollegeCreate, CollegeUpdate, CollegeOut,
    CourseCreate, CourseUpdate, CourseOut,
    CutoffCreate, CutoffOut
)
from app.auth.auth_handler import get_current_active_admin
from app.algorithms.location_filter import normalize_state, normalize_city

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

@router.get("/statistics", response_model=AdminStatistics)
@router.get("/stats")
def get_system_statistics(
    current_admin: User = Depends(get_current_active_admin), 
    db: Session = Depends(get_db)
):
    total_students = db.query(StudentProfile).count()
    total_colleges = db.query(College).count()
    total_courses = db.query(Course).count()
    total_cutoffs = db.query(Cutoff).count()
    total_applications = db.query(Application).count()
    total_states = db.query(State).count()
    total_districts = db.query(District).count()

    apps = db.query(Application).all()
    status_counts = {}
    for app in apps:
        status_counts[app.status] = status_counts.get(app.status, 0) + 1

    return {
        "total_students": total_students,
        "total_colleges": total_colleges,
        "total_courses": total_courses,
        "total_cutoffs": total_cutoffs,
        "total_applications": total_applications,
        "total_states": total_states,
        "total_districts": total_districts,
        "applications_by_status": status_counts,
        "last_data_update": "2026-08-11"
    }

@router.post("/data/import")
async def import_college_data(
    payload: Dict[str, Any],
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    Import college records from JSON/CSV payload.
    Provides import summary: Total records, Imported, Updated, Skipped, Duplicates, Errors per Section 32 spec.
    """
    records = payload.get("records", [])
    if not isinstance(records, list):
        raise HTTPException(status_code=400, detail="Invalid payload format. Expected list of records under 'records'.")

    summary = {
        "total_records": len(records),
        "imported": 0,
        "updated": 0,
        "skipped": 0,
        "duplicates": 0,
        "errors": []
    }

    for idx, rec in enumerate(records, 1):
        try:
            name = rec.get("name")
            city = rec.get("city")
            state = rec.get("state")
            if not name or not city or not state:
                summary["errors"].append(f"Record #{idx}: Missing required fields (name, city, state)")
                summary["skipped"] += 1
                continue

            existing = db.query(College).filter(College.name.ilike(name.strip())).first()
            if existing:
                # Update existing record
                existing.location = rec.get("location", f"{city}, {state}")
                existing.city = city
                existing.state = state
                existing.district = rec.get("district", city)
                existing.type = rec.get("type", "Private")
                existing.tuition_fee = float(rec.get("tuition_fee", existing.tuition_fee))
                existing.hostel_fee = float(rec.get("hostel_fee", existing.hostel_fee))
                existing.total_estimated_fee = existing.tuition_fee + existing.hostel_fee
                existing.source_name = rec.get("source_name", "AISHE")
                summary["updated"] += 1
                summary["duplicates"] += 1
            else:
                # Create new record
                t_fee = float(rec.get("tuition_fee", 1.5))
                h_fee = float(rec.get("hostel_fee", 0.5))
                col = College(
                    name=name.strip(),
                    university=rec.get("university", "Affiliated University"),
                    location=rec.get("location", f"{city}, {state}"),
                    city=city,
                    district=rec.get("district", city),
                    state=state,
                    type=rec.get("type", "Private"),
                    tuition_fee=t_fee,
                    hostel_fee=h_fee,
                    total_estimated_fee=t_fee + h_fee,
                    average_package=float(rec.get("average_package", 4.5)),
                    ranking=rec.get("ranking"),
                    source_name=rec.get("source_name", "AISHE"),
                    data_type="institution_directory",
                    data_confidence="high"
                )
                db.add(col)
                summary["imported"] += 1

        except Exception as e:
            summary["errors"].append(f"Record #{idx} ('{rec.get('name', 'Unknown')}'): {str(e)}")
            summary["skipped"] += 1

    db.commit()
    return summary

@router.post("/data/locations/import")
async def import_location_master(
    payload: Dict[str, Any],
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    Import Location Master Data (States, Union Territories, Districts, Cities) independently per Section 33 spec.
    """
    states_list = payload.get("states", [])
    districts_list = payload.get("districts", [])
    cities_list = payload.get("cities", [])

    imported_states = 0
    imported_districts = 0
    imported_cities = 0

    for st in states_list:
        name = st.get("name")
        if name:
            existing = db.query(State).filter(State.name == name).first()
            if not existing:
                st_obj = State(
                    name=name,
                    normalized_name=st.get("normalized_name", name.lower()),
                    state_code=st.get("state_code"),
                    type=st.get("type", "STATE")
                )
                db.add(st_obj)
                imported_states += 1

    db.commit()

    for dt in districts_list:
        name = dt.get("name")
        st_name = dt.get("state_name")
        if name and st_name:
            st_obj = db.query(State).filter(State.name == st_name).first()
            if st_obj:
                existing = db.query(District).filter(District.name == name, District.state_id == st_obj.id).first()
                if not existing:
                    dt_obj = District(
                        name=name,
                        normalized_name=dt.get("normalized_name", name.lower()),
                        state_id=st_obj.id
                    )
                    db.add(dt_obj)
                    imported_districts += 1

    db.commit()

    return {
        "status": "success",
        "imported_states": imported_states,
        "imported_districts": imported_districts,
        "imported_cities": imported_cities
    }

@router.get("/students", response_model=List[StudentProfileOut])
def get_registered_students(
    current_admin: User = Depends(get_current_active_admin), 
    db: Session = Depends(get_db)
):
    return db.query(StudentProfile).all()

# --- Admin Colleges CRUD ---

@router.post("/colleges", response_model=CollegeOut, status_code=status.HTTP_201_CREATED)
def create_college(
    college_data: CollegeCreate,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(College).filter(College.name == college_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="College with this name already exists.")

    college = College(**college_data.model_dump())
    db.add(college)
    db.commit()
    db.refresh(college)
    return college

@router.put("/colleges/{id}", response_model=CollegeOut)
def update_college(
    id: int,
    college_data: CollegeUpdate,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    college = db.query(College).filter(College.id == id).first()
    if not college:
        raise HTTPException(status_code=404, detail="College not found.")

    update_dict = college_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(college, key, value)

    db.commit()
    db.refresh(college)
    return college

@router.delete("/colleges/{id}")
def delete_college(
    id: int,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    college = db.query(College).filter(College.id == id).first()
    if not college:
        raise HTTPException(status_code=404, detail="College not found.")

    db.delete(college)
    db.commit()
    return {"message": f"Successfully deleted college '{college.name}'"}

# --- Admin Courses CRUD ---

@router.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    course_data: CourseCreate,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Course).filter(Course.name == course_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Course with this name already exists.")

    course = Course(**course_data.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course

@router.put("/courses/{id}", response_model=CourseOut)
def update_course(
    id: int,
    course_data: CourseUpdate,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    update_dict = course_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(course, key, value)

    db.commit()
    db.refresh(course)
    return course

@router.delete("/courses/{id}")
def delete_course(
    id: int,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    db.delete(course)
    db.commit()
    return {"message": f"Successfully deleted course '{course.name}'"}

# --- Admin Cutoffs CRUD ---

@router.post("/cutoffs", response_model=CutoffOut, status_code=status.HTTP_201_CREATED)
def create_cutoff(
    cutoff_data: CutoffCreate,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    college = db.query(College).filter(College.id == cutoff_data.college_id).first()
    course = db.query(Course).filter(Course.id == cutoff_data.course_id).first()
    
    if not college or not course:
        raise HTTPException(status_code=400, detail="Specified College ID or Course ID does not exist.")

    cutoff = Cutoff(**cutoff_data.model_dump())
    db.add(cutoff)
    db.commit()
    db.refresh(cutoff)
    
    out = CutoffOut.model_validate(cutoff)
    out.college_name = college.name
    out.course_name = course.name
    return out

@router.delete("/cutoffs/{id}")
def delete_cutoff(
    id: int,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    cutoff = db.query(Cutoff).filter(Cutoff.id == id).first()
    if not cutoff:
        raise HTTPException(status_code=404, detail="Cutoff record not found.")

    db.delete(cutoff)
    db.commit()
    return {"message": "Cutoff record deleted"}
