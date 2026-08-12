import re
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import College, Course, StudentProfile
from app.algorithms.recommender import (
    calculate_match_score_deterministic,
    estimate_admission_chance_deterministic
)

logger = logging.getLogger(__name__)

class WhatIfAgent:
    """
    Agent responsible for What-If scenario simulations (score increases, rank changes, budget modifications).
    """
    def __init__(self, db: Session):
        self.db = db

    async def run(
        self, 
        profile: StudentProfile, 
        query: str, 
        filtered_colleges: List[College], 
        target_course: Optional[Course]
    ) -> Dict[str, Any]:
        digits = re.findall(r'\b\d+\b', query)
        increment = float(digits[0]) if digits else 10.0

        current_score = profile.exam_score or 80.0
        new_score = current_score + increment

        sim_profile = StudentProfile(
            user_id=profile.user_id,
            full_name=profile.full_name,
            email=profile.email,
            percentage_10th=profile.percentage_10th,
            percentage_12th=profile.percentage_12th,
            cgpa=profile.cgpa,
            stream=profile.stream,
            board=profile.board,
            exam_name=profile.exam_name or "JEE Main",
            exam_score=new_score,
            rank=max(1, int(profile.rank * 0.8)) if profile.rank else None,
            max_budget=profile.max_budget,
            preferred_state=profile.preferred_state,
            preferred_city=profile.preferred_city,
            government_private_preference=profile.government_private_preference,
            hostel_required=profile.hostel_required
        )

        simulations = []
        for col in filtered_colleges[:5]:
            if not target_course:
                continue
            orig_m = calculate_match_score_deterministic(profile, col, target_course, self.db)
            sim_m = calculate_match_score_deterministic(sim_profile, col, target_course, self.db)

            orig_chance, _, _ = estimate_admission_chance_deterministic(profile, col, target_course, self.db)
            sim_chance, _, _ = estimate_admission_chance_deterministic(sim_profile, col, target_course, self.db)

            simulations.append({
                "college_name": col.name,
                "city": col.city,
                "state": col.state,
                "orig_score": orig_m["match_score"],
                "sim_score": sim_m["match_score"],
                "score_diff": round(sim_m["match_score"] - orig_m["match_score"], 1),
                "orig_chance": orig_chance,
                "sim_chance": sim_chance,
                "orig_classification": orig_m["classification"],
                "sim_classification": sim_m["classification"]
            })

        return {
            "increment": increment,
            "current_score": current_score,
            "new_score": new_score,
            "simulations": simulations
        }

    async def simulate(
        self,
        profile: StudentProfile,
        exam_score: float,
        colleges: List[College],
        course: Course
    ) -> Dict[str, Any]:
        """
        Direct score change simulation helper.
        """
        results = []
        sim_profile = StudentProfile(
            user_id=profile.user_id,
            full_name=profile.full_name,
            email=profile.email,
            percentage_10th=profile.percentage_10th,
            percentage_12th=profile.percentage_12th,
            stream=profile.stream,
            board=profile.board,
            exam_name=profile.exam_name or "JEE Main",
            exam_score=exam_score,
            rank=profile.rank,
            max_budget=profile.max_budget
        )
        for col in colleges:
            before_match = calculate_match_score_deterministic(profile, col, course, self.db)
            after_match = calculate_match_score_deterministic(sim_profile, col, course, self.db)
            results.append({
                "college_id": col.id,
                "college_name": col.name,
                "before_match_score": before_match["match_score"],
                "after_match_score": after_match["match_score"],
                "before_chance": before_match["admission_chance"],
                "after_chance": after_match["admission_chance"],
                "before_eligibility": before_match["eligibility_status"],
                "after_eligibility": after_match["eligibility_status"]
            })
        return {"results": results}
