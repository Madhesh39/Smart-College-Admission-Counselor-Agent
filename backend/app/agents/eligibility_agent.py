from sqlalchemy.orm import Session
from app.models.models import College, Course, StudentProfile
from app.algorithms.recommender import check_eligibility_deterministic
from app.services.llm_service import call_llm

class EligibilityAgent:
    def __init__(self, db: Session):
        self.db = db

    async def run(self, profile: StudentProfile, college: College, course: Course) -> dict:
        # Step 1: Run deterministic analysis
        status, reasons = check_eligibility_deterministic(profile, college, course, self.db)
        
        # Step 2: If AI is enabled, enhance the explanation
        ai_explanation = None
        system_prompt = (
            "You are an Eligibility Agent for a College Admission Counselor platform. "
            "Your job is to provide a polite, professional, and clear natural-language explanation "
            "of a student's eligibility for a specific course at a college based on their profile data."
        )
        user_prompt = (
            f"Student Profile:\n"
            f"- 10th Score: {profile.percentage_10th}%\n"
            f"- 12th Score: {profile.percentage_12th}%\n"
            f"- Board: {profile.board}\n"
            f"- Stream: {profile.stream}\n"
            f"- Entrance Exam: {profile.exam_name or 'None'} (Score: {profile.exam_score or 'N/A'}, Percentile: {profile.percentile or 'N/A'}, Rank: {profile.rank or 'N/A'})\n\n"
            f"Target College & Course:\n"
            f"- College: {college.name} ({college.location}, {college.state})\n"
            f"- Course: {course.name} ({course.department})\n"
            f"- Course Minimum Req: {course.minimum_percentage}%\n"
            f"- Course Entrance Exam Req: {course.entrance_exam or 'None'}\n\n"
            f"Deterministic Check Result:\n"
            f"- Status: {status}\n"
            f"- Key points: {', '.join(reasons)}\n\n"
            f"Please write a concise 2-3 sentence explanation explaining the eligibility decision. "
            f"If the status is 'Conditional', clearly outline what conditions must be met."
        )

        ai_explanation = await call_llm(system_prompt, user_prompt)
        
        # Return structured output
        return {
            "eligible": status,
            "reasons": reasons,
            "ai_explanation": ai_explanation or " ".join(reasons)
        }
