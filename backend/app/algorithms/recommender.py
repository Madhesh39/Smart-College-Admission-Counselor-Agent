import logging
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.models import College, Course, Cutoff, StudentProfile
from app.config import settings

logger = logging.getLogger(__name__)

def check_eligibility_deterministic(
    profile: StudentProfile, 
    college: College, 
    course: Course, 
    db: Session
) -> Tuple[str, List[str]]:
    """
    Checks if a student is eligible for a specific college and course.
    Returns: (status, reasons)
    Status: 'Eligible', 'Not Eligible', 'Conditional'
    """
    reasons = []
    status = "Eligible"

    # Rule 1: Check 12th board percentage requirement
    min_pct = course.minimum_percentage or 50.0
    if profile.percentage_12th < min_pct:
        status = "Not Eligible"
        reasons.append(
            f"Your 12th percentage ({profile.percentage_12th}%) is below the course minimum requirement ({min_pct}%)."
        )
    else:
        reasons.append(
            f"Your 12th percentage ({profile.percentage_12th}%) meets the minimum requirement ({min_pct}%)."
        )

    # Rule 2: Check entrance exam requirement
    course_exam = course.entrance_exam
    if course_exam:
        if not profile.exam_name:
            # Conditional eligibility if they haven't taken the exam but meet the board requirements
            status = "Conditional"
            reasons.append(
                f"This course requires the {course_exam} exam. Your profile doesn't list an entrance exam. Eligibility is conditional on passing {course_exam}."
            )
        elif profile.exam_name.lower() != course_exam.lower():
            status = "Not Eligible"
            reasons.append(
                f"This course requires the {course_exam} exam, but you took {profile.exam_name}."
            )
        else:
            reasons.append(
                f"You have taken the required entrance exam: {profile.exam_name}."
            )

    # Rule 3: Check cutoff requirements if they took the correct exam
    if course_exam and profile.exam_name and profile.exam_name.lower() == course_exam.lower() and profile.exam_score:
        # Get historical cutoffs
        cutoffs = db.query(Cutoff).filter(
            Cutoff.college_id == college.id,
            Cutoff.course_id == course.id,
            Cutoff.exam == profile.exam_name
        ).all()

        if cutoffs:
            # Look for student's category or fall back to general
            category = "General"
            # In a real app we'd map categories. Let's look for matching category
            matched_cutoff = None
            for c in cutoffs:
                if c.category.lower() == "general": # fallback
                    matched_cutoff = c
                # if student has a category we would match it here.
            
            if matched_cutoff:
                if matched_cutoff.cutoff_score and profile.exam_score < matched_cutoff.cutoff_score:
                    # Not eligible or low chance? Cutoff is usually for admission, but sometimes it is an eligibility threshold.
                    # We will flag it as conditional/low chance. Let's make it conditional or Eligible since cutoffs fluctuate.
                    # Standard college admissions allow applications even if slightly below, but let's label it as Eligible
                    # with a warning, or Conditional. Let's say Eligible but warn them.
                    reasons.append(
                        f"Your entrance score ({profile.exam_score}) is below the historical general cutoff ({matched_cutoff.cutoff_score}) for {college.name}."
                    )
                else:
                    reasons.append(
                        f"Your entrance score ({profile.exam_score}) is above or equal to the historical cutoff ({matched_cutoff.cutoff_score if matched_cutoff else 'N/A'})."
                    )
        else:
            reasons.append("No historical cutoff data available for this combination.")

    return status, reasons

def estimate_admission_chance_deterministic(
    profile: StudentProfile,
    college: College,
    course: Course,
    db: Session
) -> Tuple[str, str, str]:
    """
    Estimates the chance of admission based on historical cutoff score/rank.
    Returns: (chance, reason, confidence)
    chance: 'High', 'Moderate', 'Low'
    """
    if not course.entrance_exam:
        # Non-exam courses, base on 12th percentage
        diff = profile.percentage_12th - (course.minimum_percentage or 50.0)
        if diff >= 20:
            return "High", "Your 12th percentage is significantly above the minimum eligibility criteria.", "High"
        elif diff >= 5:
            return "Moderate", "Your 12th percentage is safely above the minimum eligibility criteria.", "Medium"
        else:
            return "Low", "Your 12th percentage is close to the minimum eligibility criteria.", "Medium"

    # Exam-based courses
    if not profile.exam_name or profile.exam_name.lower() != course.entrance_exam.lower():
        return "Low", f"You have not taken or listed the required entrance exam ({course.entrance_exam}).", "High"

    # Get the latest cutoff year
    latest_cutoff = db.query(Cutoff).filter(
        Cutoff.college_id == college.id,
        Cutoff.course_id == course.id,
        Cutoff.exam == profile.exam_name
    ).order_by(Cutoff.year.desc()).first()

    if not latest_cutoff:
        # Fall back to percentage-based check
        diff = profile.percentage_12th - (course.minimum_percentage or 50.0)
        if diff >= 15:
            return "High", "No cutoff data found, but your 12th percentage is high.", "Low"
        elif diff >= 5:
            return "Moderate", "No cutoff data found, but your academic scores are average.", "Low"
        else:
            return "Low", "No cutoff data found and your academic scores are near the minimum.", "Low"

    # We have historical cutoff
    student_cutoff_score = profile.tnea_cutoff or profile.exam_score
    if latest_cutoff.cutoff_score and student_cutoff_score:
        score_diff = student_cutoff_score - latest_cutoff.cutoff_score
        pct_diff = (score_diff / latest_cutoff.cutoff_score) * 100 if latest_cutoff.cutoff_score > 0 else 0

        if score_diff >= 5 or pct_diff >= 3:
            return "High", f"Your TNEA Cutoff mark ({student_cutoff_score:.2f}) is comfortably higher than the TNEA cutoff ({latest_cutoff.cutoff_score}) from {latest_cutoff.year}.", "High"
        elif score_diff >= -3 or pct_diff >= -2:
            return "Moderate", f"Your TNEA Cutoff mark ({student_cutoff_score:.2f}) is close to the TNEA cutoff ({latest_cutoff.cutoff_score}) from {latest_cutoff.year}.", "High"
        else:
            return "Low", f"Your TNEA Cutoff mark ({student_cutoff_score:.2f}) is lower than the TNEA cutoff ({latest_cutoff.cutoff_score}) from {latest_cutoff.year}.", "High"

    elif latest_cutoff.cutoff_rank and profile.rank:
        # Lower rank is better!
        rank_ratio = profile.rank / latest_cutoff.cutoff_rank if latest_cutoff.cutoff_rank > 0 else 1

        if rank_ratio <= 0.8:
            return "High", f"Your entrance rank ({profile.rank}) is significantly better than the latest cutoff rank ({latest_cutoff.cutoff_rank}) from {latest_cutoff.year}.", "High"
        elif rank_ratio <= 1.1:
            return "Moderate", f"Your entrance rank ({profile.rank}) is close to the latest cutoff rank ({latest_cutoff.cutoff_rank}) from {latest_cutoff.year}.", "High"
        else:
            return "Low", f"Your entrance rank ({profile.rank}) is higher than the latest cutoff rank ({latest_cutoff.cutoff_rank}) from {latest_cutoff.year}.", "High"

    return "Moderate", "Insufficient data to accurately calculate admission chances. Estimate based on general profile.", "Low"

def calculate_match_score_deterministic(
    profile: StudentProfile,
    college: College,
    course: Course,
    db: Session
) -> Dict[str, Any]:
    """
    Calculates a match score between 0 and 100 based on weighted metrics:
    - Academic Compatibility: 25%
    - Entrance Score Compatibility: 25%
    - Course Preference: 15%
    - Budget Compatibility: 10%
    - Location Preference: 10%
    - Placement Preference: 10%
    - Other Preferences: 5%
    """
    reasons = []
    warnings = []

    # 1. Academic Compatibility (25%)
    academic_score = 0.0
    # Average of 10th and 12th percentages
    avg_pct = (profile.percentage_10th + profile.percentage_12th) / 2.0
    if avg_pct >= 90:
        academic_score = 100.0
    elif avg_pct >= 75:
        academic_score = 85.0
    elif avg_pct >= 60:
        academic_score = 70.0
    else:
        academic_score = 50.0
    
    # Check course minimum percentage
    if profile.percentage_12th < (course.minimum_percentage or 50.0):
        academic_score = 20.0 # Heavy penalty
        warnings.append("Your 12th percentage does not meet the minimum requirement for this course.")
    else:
        reasons.append("Your academic scores align well with the college's requirements.")

    # 2. Entrance Score Compatibility (25%)
    entrance_score = 0.0
    if course.entrance_exam:
        # Compare with TNEA cutoff
        latest_cutoff = db.query(Cutoff).filter(
            Cutoff.college_id == college.id,
            Cutoff.course_id == course.id
        ).order_by(Cutoff.year.desc()).first()

        student_score = profile.tnea_cutoff or profile.exam_score
        if latest_cutoff:
            if latest_cutoff.cutoff_score and student_score:
                diff = student_score - latest_cutoff.cutoff_score
                if diff >= 0:
                    entrance_score = min(100.0, 85.0 + (diff / latest_cutoff.cutoff_score) * 15.0)
                    reasons.append(f"Your TNEA Cutoff mark ({student_score:.2f}) is above the dataset cutoff of {latest_cutoff.cutoff_score}.")
                else:
                    entrance_score = max(0.0, 85.0 + (diff / latest_cutoff.cutoff_score) * 100.0)
                    warnings.append(f"Your TNEA Cutoff mark ({student_score:.2f}) is below the dataset cutoff of {latest_cutoff.cutoff_score}.")
            else:
                entrance_score = 75.0
                reasons.append("TNEA Cutoff details provided, but cutoff history for this specific branch is unavailable.")
        else:
            entrance_score = 75.0
            reasons.append("TNEA Cutoff details provided, but cutoff history is unavailable.")
    else:
        # If no entrance exam is required, use 12th percentage as proxy for entrance compatibility
        entrance_score = academic_score
        reasons.append("No entrance exam is required for this course; admission is based on board percentages.")

    # 3. Course Preference (15%)
    course_score = 0.0
    if profile.preferred_course and profile.preferred_course.lower() in course.name.lower():
        course_score = 100.0
        reasons.append(f"Offers your preferred course: {course.name}.")
    elif profile.preferred_branch and profile.preferred_branch.lower() in course.department.lower():
        course_score = 80.0
        reasons.append(f"Offers a course in your preferred branch: {course.department}.")
    else:
        course_score = 40.0
        warnings.append("This course is different from your specified course/branch preferences.")

    # 4. Budget Compatibility (10%)
    budget_score = 0.0
    total_fee = college.total_estimated_fee
    if profile.max_budget:
        if total_fee <= profile.max_budget:
            budget_score = 100.0
            reasons.append(f"Estimated fees ({total_fee:.2f} Lakhs) are within your maximum budget.")
        else:
            over_budget = total_fee - profile.max_budget
            # Calculate linear decay
            budget_score = max(0.0, 100.0 - (over_budget / profile.max_budget) * 100.0)
            warnings.append(f"Estimated fees ({total_fee:.2f} Lakhs) exceed your budget of {profile.max_budget:.2f} Lakhs.")
    else:
        budget_score = 80.0 # Neutral if no budget specified

    # 5. Location Preference (10%)
    location_score = 0.0
    loc_matched = False
    if profile.preferred_state and profile.preferred_state.lower() == college.state.lower():
        location_score += 50.0
        loc_matched = True
    if profile.preferred_city and profile.preferred_city.lower() == college.city.lower():
        location_score += 50.0
        loc_matched = True
        
    if loc_matched:
        reasons.append(f"Located in your preferred state/city: {college.city}, {college.state}.")
    else:
        if profile.preferred_state or profile.preferred_city:
            location_score = 30.0
            warnings.append("College location is outside your preferred location.")
        else:
            location_score = 80.0 # Neutral

    # 6. Placement Preference (10%)
    placement_score = 0.0
    avg_pkg = college.average_package or 0.0
    if avg_pkg >= 12.0:
        placement_score = 100.0
    elif avg_pkg >= 8.0:
        placement_score = 90.0
    elif avg_pkg >= 5.0:
        placement_score = 75.0
    else:
        placement_score = 50.0
        
    if college.placement_percentage and college.placement_percentage >= 90.0:
        placement_score = min(100.0, placement_score + 10.0)
        reasons.append(f"Excellent placement record: {college.placement_percentage}% placement rate and {avg_pkg} LPA average package.")
    elif college.placement_percentage:
        reasons.append(f"Consistent placement performance: {college.placement_percentage}% placement rate and {avg_pkg} LPA average package.")

    # 7. Other Preferences (5%)
    pref_score = 0.0
    pref_count = 0
    max_pref = 3

    # Govt/Private Preference
    if profile.government_private_preference and profile.government_private_preference.lower() != "any":
        if profile.government_private_preference.lower() == college.type.lower():
            pref_score += 33.3
            pref_count += 1
            reasons.append(f"Matches your preference for {college.type} colleges.")
        else:
            warnings.append(f"This is a {college.type} college, but you preferred a {profile.government_private_preference} college.")
    else:
        pref_score += 33.3 # Neutral
        
    # Hostel Requirement
    if profile.hostel_required:
        if college.hostel_facility:
            pref_score += 33.3
            pref_count += 1
            reasons.append("Hostel facilities are available.")
        else:
            warnings.append("Hostel facilities are not available, but you require hostel accommodations.")
    else:
        pref_score += 33.3

    # Career Interests Match
    if profile.career_interests and college.description:
        matched_interests = [interest for interest in profile.career_interests if interest.lower() in college.description.lower()]
        if matched_interests:
            pref_score += 33.3
            reasons.append(f"Aligns with your career interests: {', '.join(matched_interests)}.")
        else:
            pref_score += 15.0
    else:
        pref_score += 33.3

    # Cap pref score at 100
    pref_score = min(100.0, pref_score)

    # Weighted calculation
    final_score = (
        (academic_score * settings.WEIGHT_ACADEMIC) +
        (entrance_score * settings.WEIGHT_ENTRANCE) +
        (course_score * settings.WEIGHT_COURSE) +
        (budget_score * settings.WEIGHT_BUDGET) +
        (location_score * settings.WEIGHT_LOCATION) +
        (placement_score * settings.WEIGHT_PLACEMENT) +
        (pref_score * settings.WEIGHT_PREFERENCE)
    )

    # Safely classify
    eligibility_status, eligibility_reasons = check_eligibility_deterministic(profile, college, course, db)
    chance, chance_reason, _ = estimate_admission_chance_deterministic(profile, college, course, db)

    # Classification: Safe, Target, Dream
    classification = "Target"
    if eligibility_status == "Not Eligible":
        classification = "Dream" # Or not classified, let's put Dream as a stretch or Not Recommended
        chance = "Low"
    else:
        if chance == "High" and final_score >= 75.0:
            classification = "Safe"
        elif chance == "Low" or final_score < 60.0:
            classification = "Dream"
        else:
            classification = "Target"

    return {
        "college_id": college.id,
        "course_id": course.id,
        "match_score": round(final_score, 1),
        "eligibility_status": eligibility_status,
        "admission_chance": chance,
        "classification": classification,
        "reasons": reasons[:5], # top 5 reasons
        "warnings": warnings
    }
