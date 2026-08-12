from sqlalchemy.orm import Session
from typing import List
from app.models.models import Course, StudentProfile
from app.services.llm_service import call_llm

class CourseAgent:
    def __init__(self, db: Session):
        self.db = db

    async def run(self, profile: StudentProfile) -> List[dict]:
        # Step 1: Deterministic filter of courses by eligibility and stream
        # E.g. Engineering courses (CSE, Mech, Civil) usually require Science stream.
        all_courses = self.db.query(Course).all()
        recommended = []

        student_stream = (profile.stream or "").lower()
        interests = [i.lower() for i in (profile.career_interests or [])]

        for course in all_courses:
            score = 50.0 # Base compatibility score
            reasons = []

            # Stream compatibility rules
            if "science" in student_stream:
                if "engineering" in course.name.lower() or "technology" in course.name.lower() or "science" in course.name.lower():
                    score += 20
                    reasons.append("Your Science background matches engineering and technical requirements.")
            elif "commerce" in student_stream:
                if "business" in course.name.lower() or "finance" in course.name.lower() or "management" in course.name.lower():
                    score += 25
                    reasons.append("Your Commerce background aligns well with business and management fields.")
                elif "engineering" in course.name.lower() or "technology" in course.name.lower():
                    score -= 30 # Severe penalty for non-science in engineering
                    reasons.append("Engineering courses typically require a Science background.")

            # Career interests matching
            interest_matched = False
            for interest in interests:
                # check if interest is in career opportunities or description
                opps = [o.lower() for o in (course.career_opportunities or [])]
                if interest in course.name.lower() or interest in course.department.lower() or any(interest in o for o in opps):
                    score += 15
                    interest_matched = True
                    reasons.append(f"Matches your career interest in '{interest.capitalize()}'.")
            
            # 12th board score check
            if profile.percentage_12th >= course.minimum_percentage:
                score += 10
            else:
                score -= 20
                reasons.append(f"Your 12th board score is below the minimum required ({course.minimum_percentage}%).")

            if score >= 60.0:
                recommended.append({
                    "course": course,
                    "compatibility_score": min(100.0, score),
                    "reasons": reasons
                })

        # Sort by compatibility
        recommended.sort(key=lambda x: x["compatibility_score"], reverse=True)
        results = []

        # Step 2: Use AI to enrich course advice if enabled
        for item in recommended[:5]: # Top 5 courses
            c = item["course"]
            ai_advice = None
            
            system_prompt = (
                "You are an academic course counselor agent. Your task is to explain to a student "
                "why a specific academic course is a good fit for their academic background and career goals."
            )
            user_prompt = (
                f"Student stream: {profile.stream}, 12th percentage: {profile.percentage_12th}%\n"
                f"Student interests: {', '.join(profile.career_interests or [])}\n"
                f"Recommended Course: {c.name} ({c.department})\n"
                f"Career Opportunities: {', '.join(c.career_opportunities or [])}\n"
                f"Deterministic Reasons: {', '.join(item['reasons'])}\n\n"
                f"Write a 2-sentence explanation of why this course is suitable and what future careers it opens up."
            )

            ai_advice = await call_llm(system_prompt, user_prompt)

            results.append({
                "course_id": c.id,
                "course_name": c.name,
                "department": c.department,
                "duration": c.duration,
                "compatibility_score": item["compatibility_score"],
                "reasons": item["reasons"],
                "ai_explanation": ai_advice or f"{c.name} is recommended because it matches your academic profile and interests in {', '.join(profile.career_interests or [])}."
            })

        return results
