from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.models import College, Course, StudentProfile, Recommendation, User
from app.schemas.schemas import RecommendationOut, WhatIfRequest, WhatIfResponse, WhatIfCollegeResult
from app.auth.auth_handler import get_current_user
from app.agents.orchestrator import AgentOrchestrator
from app.algorithms.recommender import calculate_match_score_deterministic, estimate_admission_chance_deterministic

router = APIRouter(tags=["Recommendations"])

@router.post("/recommendations/generate", response_model=List[RecommendationOut])
async def generate_recommendations(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please set up your student profile first."
        )

    # Clear old recommendations
    db.query(Recommendation).filter(Recommendation.student_id == profile.id).delete()

    # Determine course focus
    pref_course_name = profile.preferred_course or "Computer Science"
    courses = db.query(Course).filter(Course.name.ilike(f"%{pref_course_name}%")).all()
    if not courses:
        courses = db.query(Course).all()
        
    colleges = db.query(College).all()
    
    orchestrator = AgentOrchestrator(db)
    new_recs = []

    # Calculate recommendations for all colleges and courses
    for college in colleges:
        for course in courses[:2]: # limit to first 2 matching courses to avoid combinatorial explosion
            # check if course is offered by college
            if course in college.courses:
                rec_data = await orchestrator.get_recommendation(profile, college.id, course.id)
                
                db_rec = Recommendation(
                    student_id=profile.id,
                    college_id=college.id,
                    match_score=rec_data["match_score"],
                    eligibility_status=rec_data["eligibility_status"],
                    admission_chance=rec_data["admission_chance"],
                    classification=rec_data["classification"],
                    reasons=rec_data["reasons"] + [rec_data.get("ai_explanation", "")],
                    warnings=rec_data["warnings"]
                )
                db.add(db_rec)
                new_recs.append(db_rec)

    db.commit()
    
    # Reload and return
    return db.query(Recommendation).filter(Recommendation.student_id == profile.id).all()

@router.get("/recommendations", response_model=List[RecommendationOut])
async def get_recommendations(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        return []
        
    recs = db.query(Recommendation).filter(Recommendation.student_id == profile.id).all()
    if not recs:
        # Generate on the fly
        recs = await generate_recommendations(current_user, db)
        
    return recs

@router.post("/what-if/analyze", response_model=WhatIfResponse)
@router.post("/recommendations/what-if", response_model=WhatIfResponse)
async def what_if_analyze(
    req: WhatIfRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Student profile not found.")

    # Create original vs simulated parameters
    orig_percentage = profile.percentage_12th
    orig_exam_score = profile.exam_score
    orig_cgpa = profile.cgpa
    orig_budget = profile.max_budget
    orig_state = profile.preferred_state
    orig_course_name = profile.preferred_course or "Computer Science"

    sim_percentage = req.percentage_12th if req.percentage_12th is not None else orig_percentage
    sim_exam_score = req.exam_score if req.exam_score is not None else orig_exam_score
    sim_cgpa = req.cgpa if req.cgpa is not None else orig_cgpa
    sim_budget = req.max_budget if req.max_budget is not None else orig_budget
    sim_state = req.preferred_state if req.preferred_state is not None else orig_state
    sim_course_name = req.preferred_course if req.preferred_course is not None else orig_course_name

    # Fetch Course
    course = db.query(Course).filter(Course.name.ilike(f"%{sim_course_name}%")).first()
    if not course:
        course = db.query(Course).first()
    
    orig_course = db.query(Course).filter(Course.name.ilike(f"%{orig_course_name}%")).first()
    if not orig_course:
        orig_course = db.query(Course).first()

    colleges = db.query(College).all()
    results = []

    # Create transient virtual profiles
    orig_profile = StudentProfile(
        percentage_10th=profile.percentage_10th,
        percentage_12th=orig_percentage,
        cgpa=orig_cgpa,
        stream=profile.stream,
        board=profile.board,
        exam_name="TNEA Cutoff",
        exam_score=orig_exam_score,
        tnea_cutoff=profile.tnea_cutoff or orig_exam_score,
        physics_marks=profile.physics_marks,
        chemistry_marks=profile.chemistry_marks,
        maths_marks=profile.maths_marks,
        community=profile.community,
        max_budget=orig_budget,
        preferred_state=orig_state,
        government_private_preference=profile.government_private_preference,
        hostel_required=profile.hostel_required
    )

    sim_profile = StudentProfile(
        percentage_10th=profile.percentage_10th,
        percentage_12th=sim_percentage,
        cgpa=sim_cgpa,
        stream=profile.stream,
        board=profile.board,
        exam_name="TNEA Cutoff",
        exam_score=sim_exam_score,
        tnea_cutoff=sim_exam_score,
        physics_marks=profile.physics_marks,
        chemistry_marks=profile.chemistry_marks,
        maths_marks=profile.maths_marks,
        community=profile.community,
        max_budget=sim_budget,
        preferred_state=sim_state,
        government_private_preference=profile.government_private_preference,
        hostel_required=profile.hostel_required
    )

    for college in colleges[:15]: # Limit to top 15 for analysis speed
        if not course or not orig_course:
            continue
            
        # Calculate before state
        before_match = calculate_match_score_deterministic(orig_profile, college, orig_course, db)
        before_chance, _, _ = estimate_admission_chance_deterministic(orig_profile, college, orig_course, db)

        # Calculate after state
        after_match = calculate_match_score_deterministic(sim_profile, college, course, db)
        after_chance, _, _ = estimate_admission_chance_deterministic(sim_profile, college, course, db)

        results.append(
            WhatIfCollegeResult(
                college_id=college.id,
                college_name=college.name,
                before_match_score=before_match["match_score"],
                after_match_score=after_match["match_score"],
                before_chance=before_chance,
                after_chance=after_chance,
                before_eligibility=before_match["eligibility_status"],
                after_eligibility=after_match["eligibility_status"]
            )
        )

    return {"results": results}
# We need to import Cutoff inside recommendations router or rely on recommender helper.
