from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.models.models import College, Course, StudentProfile
from app.algorithms.recommender import calculate_match_score_deterministic
from app.services.llm_service import call_llm

class RecommendationAgent:
    def __init__(self, db: Session):
        self.db = db

    async def run(self, profile: StudentProfile, college: College, course: Course) -> dict:
        # Step 1: Run deterministic match scoring
        result = calculate_match_score_deterministic(profile, college, course, self.db)
        
        # Step 2: Use AI to write a personalized explanation card if enabled
        ai_explanation = None
        system_prompt = (
            "You are a College Recommendation Agent. Your job is to explain WHY a college/course combination "
            "is recommended to a student, emphasizing their academic compatibility, budget, and location preferences."
        )
        reasons_str = "\n".join([f"- {r}" for r in result["reasons"]])
        warnings_str = "\n".join([f"- {w}" for w in result["warnings"]])
        
        user_prompt = (
            f"Student Profile:\n"
            f"- 12th Score: {profile.percentage_12th}%\n"
            f"- Exam: {profile.exam_name} (Score: {profile.exam_score}, Rank: {profile.rank})\n"
            f"- Preferred Course: {profile.preferred_course}\n"
            f"- Max Budget: {profile.max_budget} Lakhs\n"
            f"- Location Pref: {profile.preferred_city}, {profile.preferred_state}\n\n"
            f"College Details:\n"
            f"- Name: {college.name}\n"
            f"- Tuition Fee: {college.tuition_fee} Lakhs/yr, Hostel: {college.hostel_fee} Lakhs/yr\n"
            f"- Average Package: {college.average_package} LPA\n"
            f"- State: {college.state}, City: {college.city}\n\n"
            f"Recommendation Metrics:\n"
            f"- Match Score: {result['match_score']}/100\n"
            f"- Chance: {result['admission_chance']}\n"
            f"- Classification: {result['classification']}\n"
            f"- Deterministic Reasons:\n{reasons_str}\n"
            f"- Warnings:\n{warnings_str}\n\n"
            f"Please generate a compelling, professional explanation (max 100 words) summarizing why this college is "
            f"a good match or what factors they need to watch out for."
        )

        ai_explanation = await call_llm(system_prompt, user_prompt)
        
        # Add explanation to result
        result["ai_explanation"] = ai_explanation or (
            f"Recommended with a {result['match_score']}% profile match. "
            f"Key factors include your academic compatibility and budget. "
            f"Estimated admission chance is {result['admission_chance']}."
        )
        return result
