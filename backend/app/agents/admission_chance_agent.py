from sqlalchemy.orm import Session
from app.models.models import College, Course, StudentProfile
from app.algorithms.recommender import estimate_admission_chance_deterministic
from app.services.llm_service import call_llm

class AdmissionChanceAgent:
    def __init__(self, db: Session):
        self.db = db

    async def run(self, profile: StudentProfile, college: College, course: Course) -> dict:
        # Step 1: Run deterministic analysis
        chance, reason, confidence = estimate_admission_chance_deterministic(profile, college, course, self.db)
        
        # Step 2: Enrich reasoning with AI if enabled
        ai_reason = None
        system_prompt = (
            "You are an Admission Chance Estimator Agent. Your job is to explain the admission chances "
            "for a student targeting a specific college program, using historical cutoff ranges. "
            "IMPORTANT: Do not present probability as guaranteed admission. "
            "Always include wording indicating this is an estimate based on historical/sample data."
        )
        user_prompt = (
            f"Student Profile:\n"
            f"- 12th Board: {profile.percentage_12th}%\n"
            f"- Entrance Exam: {profile.exam_name} (Score: {profile.exam_score}, Rank: {profile.rank})\n\n"
            f"College Program:\n"
            f"- College: {college.name}\n"
            f"- Course: {course.name}\n\n"
            f"Deterministic Estimation:\n"
            f"- Calculated Chance: {chance}\n"
            f"- Reason: {reason}\n"
            f"- Confidence level: {confidence}\n\n"
            f"Please write a 2-3 sentence analysis of this estimate, explaining what factors (like score margins "
            f"or board thresholds) influenced it. End with a standard disclaimer that this is based on historical/sample data."
        )

        ai_reason = await call_llm(system_prompt, user_prompt)

        return {
            "admission_chance": chance,
            "reason": ai_reason or f"{reason} (Estimated admission chance based on available historical data.)",
            "confidence": confidence,
            "disclaimer": "Estimated admission chance based on available historical data. Cutoffs change annually based on applicant pools."
        }
