from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.models.models import College, Course, StudentProfile, Cutoff
from app.algorithms.recommender import calculate_match_score_deterministic, estimate_admission_chance_deterministic
from app.services.llm_service import call_llm

class ComparisonAgent:
    def __init__(self, db: Session):
        self.db = db

    async def run(self, profile: StudentProfile, colleges: List[College], course: Course) -> dict:
        comparison_list = []
        
        for college in colleges:
            # Get match metrics
            match_data = calculate_match_score_deterministic(profile, college, course, self.db)
            chance, chance_reason, _ = estimate_admission_chance_deterministic(profile, college, course, self.db)

            # Get historical cutoff across college offered courses
            college_course_ids = [crs.id for crs in college.courses]
            cutoff_query = self.db.query(Cutoff).filter(Cutoff.college_id == college.id)
            if course and course.id in college_course_ids:
                cutoff_query = cutoff_query.filter(Cutoff.course_id == course.id)
            elif college_course_ids:
                cutoff_query = cutoff_query.filter(Cutoff.course_id.in_(college_course_ids))

            user_comm = (profile.community if profile and profile.community else "OC").upper()
            latest_cutoff = cutoff_query.filter(Cutoff.category == user_comm).order_by(Cutoff.year.desc()).first()
            if not latest_cutoff:
                latest_cutoff = cutoff_query.filter(Cutoff.category == "OC").order_by(Cutoff.year.desc()).first()
            if not latest_cutoff:
                latest_cutoff = self.db.query(Cutoff).filter(Cutoff.college_id == college.id).order_by(Cutoff.year.desc()).first()

            cutoff_str = "N/A"
            if latest_cutoff:
                if latest_cutoff.cutoff_score:
                    cutoff_str = f"{latest_cutoff.cutoff_score:.1f} / 200 ({latest_cutoff.category})"
                elif latest_cutoff.cutoff_rank:
                    cutoff_str = f"Rank {latest_cutoff.cutoff_rank}"

            comparison_list.append({
                "college_id": college.id,
                "name": college.name,
                "location": f"{college.city}, {college.state}",
                "fees": {
                    "tuition": college.tuition_fee,
                    "hostel": college.hostel_fee,
                    "total": college.total_estimated_fee
                },
                "ranking": college.ranking or "N/A",
                "placements": {
                    "placement_rate": f"{college.placement_percentage or 0}%",
                    "average_package": f"{college.average_package or 0} LPA",
                    "highest_package": f"{college.highest_package or 0} LPA"
                },
                "cutoff": cutoff_str,
                "student_metrics": {
                    "match_score": f"{match_data['match_score']}%",
                    "admission_chance": chance,
                    "classification": match_data["classification"]
                }
            })

        # Generate AI summary if enabled
        ai_summary = None
        system_prompt = (
            "You are a College Comparison Agent. Your role is to provide a brief, objective comparison summary "
            "of 2-3 colleges selected by a student for a specific program. Summarize key tradeoffs (e.g. fees vs placements vs location)."
        )
        
        col_summaries = []
        for c in comparison_list:
            col_summaries.append(
                f"- {c['name']}: Total Fees = {c['fees']['total']} Lakhs, Avg Package = {c['placements']['average_package']}, "
                f"NIRF Rank = {c['ranking']}, Match Score = {c['student_metrics']['match_score']}, "
                f"Admission Chance = {c['student_metrics']['admission_chance']}, Classification = {c['student_metrics']['classification']}."
            )
        col_data_str = "\n".join(col_summaries)

        user_prompt = (
            f"Student Profile details:\n"
            f"- 12th percentage: {profile.percentage_12th}%\n"
            f"- Entrance exam score: {profile.exam_score} ({profile.exam_name})\n"
            f"- Max Budget: {profile.max_budget} Lakhs\n\n"
            f"Target Course: {course.name}\n\n"
            f"Colleges to Compare:\n{col_data_str}\n\n"
            f"Please write a concise paragraph (100-150 words) comparing these colleges. "
            f"Recommend which college is best under what circumstances (e.g., best for budget, best for placements, or safest bet)."
        )

        ai_summary = await call_llm(system_prompt, user_prompt)

        if not ai_summary:
            # Fallback text summary
            fallback_parts = []
            for c in comparison_list:
                fallback_parts.append(
                    f"{c['name']} has a match score of {c['student_metrics']['match_score']} with a {c['student_metrics']['admission_chance']} chance. "
                    f"It costs {c['fees']['total']} Lakhs and offers an average placement package of {c['placements']['average_package']}."
                )
            ai_summary = " ".join(fallback_parts)

        return {
            "colleges": comparison_list,
            "ai_summary": ai_summary
        }
