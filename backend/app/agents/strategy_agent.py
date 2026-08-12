from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.models.models import College, Course, StudentProfile
from app.algorithms.recommender import calculate_match_score_deterministic
from app.services.llm_service import call_llm

class StrategyAgent:
    def __init__(self, db: Session):
        self.db = db

    async def run(self, profile: StudentProfile, colleges: List[College], course: Course) -> dict:
        safe_list = []
        target_list = []
        dream_list = []

        # Categorize colleges
        for college in colleges:
            match_data = calculate_match_score_deterministic(profile, college, course, self.db)
            col_info = {
                "id": college.id,
                "name": college.name,
                "location": f"{college.city}, {college.state}",
                "match_score": match_data["match_score"],
                "admission_chance": match_data["admission_chance"],
                "reasons": match_data["reasons"]
            }
            
            classification = match_data["classification"]
            if classification == "Safe":
                safe_list.append(col_info)
            elif classification == "Target":
                target_list.append(col_info)
            else:
                dream_list.append(col_info)

        # Generate strategy text via AI if enabled
        ai_strategy = None
        system_prompt = (
            "You are an Admission Strategy Agent. Your role is to formulate a personalized college application "
            "strategy. Explain how the student should balance their applications between Safe, Target, and Dream colleges, "
            "and suggest how they can improve their credentials or approach deadlines."
        )

        safe_names = ", ".join([c["name"] for c in safe_list]) or "None available"
        target_names = ", ".join([c["name"] for c in target_list]) or "None available"
        dream_names = ", ".join([c["name"] for c in dream_list]) or "None available"

        user_prompt = (
            f"Student Profile:\n"
            f"- 12th Board Score: {profile.percentage_12th}%\n"
            f"- Entrance Exam: {profile.exam_name} (Score: {profile.exam_score}, Rank: {profile.rank})\n"
            f"- Max Budget: {profile.max_budget} Lakhs\n"
            f"- Course Interest: {course.name}\n\n"
            f"Classified Options:\n"
            f"- Safe Colleges (high chance, good match): {safe_names}\n"
            f"- Target Colleges (moderate chance, good match): {target_names}\n"
            f"- Dream Colleges (low chance/highly competitive): {dream_names}\n\n"
            f"Please write a cohesive 100-150 word application strategy plan. Explain why they should apply to "
            f"a mix of these, what order they should prioritize them, and what factors (like fees or hostel) they must weigh."
        )

        ai_strategy = await call_llm(system_prompt, user_prompt)

        if not ai_strategy:
            ai_strategy = (
                f"We recommend applying to a balanced mix of colleges: 1-2 Safe options ({safe_names}), "
                f"2 Target options ({target_names}), and 1 Dream option ({dream_names}) to maximize admission chances while "
                f"keeping options open. Always review specific deadlines and scholarship opportunities."
            )

        return {
            "safe_colleges": safe_list,
            "target_colleges": target_list,
            "dream_colleges": dream_list,
            "strategy_text": ai_strategy
        }
