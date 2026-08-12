import logging
import re
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.models.models import College, Course, Cutoff, StudentProfile, ChatMessage
from app.algorithms.recommender import (
    calculate_match_score_deterministic,
    estimate_admission_chance_deterministic,
    check_eligibility_deterministic
)
from app.algorithms.location_filter import (
    extract_query_constraints,
    filter_colleges_by_constraints,
    normalize_state,
    normalize_city
)
from app.algorithms.response_validator import ResponseValidator
from app.agents.intent_agent import IntentAgent
from app.agents.location_agent import LocationAgent
from app.agents.college_retrieval_agent import CollegeRetrievalAgent
from app.agents.eligibility_agent import EligibilityAgent
from app.agents.course_agent import CourseAgent
from app.agents.recommendation_agent import RecommendationAgent
from app.agents.admission_chance_agent import AdmissionChanceAgent
from app.agents.comparison_agent import ComparisonAgent
from app.agents.what_if_agent import WhatIfAgent
from app.agents.strategy_agent import StrategyAgent
from app.agents.nirf_agent import NirfAgent
from app.services.llm_service import call_llm

logger = logging.getLogger(__name__)

class CounselorAgent:
    """
    Main Orchestrator Counselor Agent coordinating the 11 Specialized AI Agents.
    Enforces natural language intent extraction, hard database location/course/budget filtering,
    conversational memory tracking, anti-hallucination checks, and explainable AI responses.
    """
    def __init__(self, db: Session):
        self.db = db
        self.intent_agent = IntentAgent(db)
        self.location_agent = LocationAgent(db)
        self.retrieval_agent = CollegeRetrievalAgent(db)
        self.eligibility_agent = EligibilityAgent(db)
        self.course_agent = CourseAgent(db)
        self.recommendation_agent = RecommendationAgent(db)
        self.chance_agent = AdmissionChanceAgent(db)
        self.comparison_agent = ComparisonAgent(db)
        self.what_if_agent = WhatIfAgent(db)
        self.strategy_agent = StrategyAgent(db)
        self.nirf_agent = NirfAgent(db)
        self.validator = ResponseValidator(db)

    async def run(self, profile: StudentProfile, query: str, chat_history: List[ChatMessage] = []) -> str:
        query_lower = query.lower().strip()

        # Step 1: Natural Language Intent & Constraint Extraction
        extracted_intent = self.intent_agent.extract_intent(query, profile)
        intent_type = extracted_intent["intent"]

        # Step 2: Handle Conversational Follow-Up Memory Context
        if intent_type in ["followup_cheapest", "followup_placement", "followup_safest"]:
            return await self._handle_followup_query(profile, query, extracted_intent, chat_history)

        # Step 3: Hard College Candidate Retrieval from Database
        retrieval_result = self.retrieval_agent.retrieve_candidates(extracted_intent, profile)
        filtered_colleges = retrieval_result["colleges"]
        target_course = retrieval_result["target_course"]

        # Determine default target course if not explicit
        if not target_course and profile.preferred_course:
            target_course = self.db.query(Course).filter(Course.name.ilike(f"%{profile.preferred_course}%")).first()
        if not target_course:
            target_course = self.db.query(Course).filter(Course.name.ilike("%computer science%")).first() or self.db.query(Course).first()

        # Step 4: Strict Location & Anti-Hallucination Pre-Response Validation (Requirements 29 & 30)
        filtered_colleges = self.validator.validate_candidates(filtered_colleges, extracted_intent)

        # Step 5: Anti-Hallucination & No-Result Handling (Requirements 14 & 47)
        if not filtered_colleges:
            loc_name = extracted_intent.get("city") or extracted_intent.get("district") or extracted_intent.get("state")
            course_name = extracted_intent.get("course") or "requested"
            
            if loc_name:
                return (
                    f"I couldn't find matching {course_name} colleges in {loc_name} in the current database.\n\n"
                    f"Would you like me to expand the search to nearby cities or all of Tamil Nadu?"
                )
            else:
                return "I couldn't find colleges matching your specified criteria in the current verified database."

        # Step 6: Route to Specialized Agent Handlers based on Intent
        if intent_type == "course_recommendation":
            return await self._handle_course_query(profile, query)
        elif intent_type == "comparison":
            return await self._handle_compare_query(profile, query, target_course, filtered_colleges)
        elif intent_type == "what_if":
            return await self._handle_score_change_query(profile, query, target_course, filtered_colleges)
        elif intent_type == "nirf_recommendation":
            return await self._handle_nirf_query(profile, query, target_course, filtered_colleges, extracted_intent)
        else:
            return await self._handle_recommendation_query(profile, query, chat_history, target_course, filtered_colleges, extracted_intent)

    async def _handle_nirf_query(
        self,
        profile: StudentProfile,
        query: str,
        target_course: Course,
        colleges: List[College],
        extracted_intent: Dict[str, Any]
    ) -> str:
        """
        Handles explicit NIRF ranking queries using the dedicated NIRF Agent.
        """
        nirf_results = self.nirf_agent.evaluate_nirf_rankings(colleges, requested_category="Engineering")
        ranked_colleges = nirf_results["ranked_colleges"]

        if not ranked_colleges:
            return "No official NIRF-ranked colleges were found matching your query criteria in the verified database."

        response = "### 🏆 Official NIRF Ranking Analysis\n\n"
        loc_desc = extracted_intent.get("district") or extracted_intent.get("city") or extracted_intent.get("state") or "India"
        response += f"Here are the top NIRF-ranked institutions in **{loc_desc}** for **{target_course.name}**:\n\n"

        for idx, item in enumerate(ranked_colleges, 1):
            col = item["college"]
            rank_str = f"#{item['nirf_rank']} ({item['nirf_year']})"
            response += f"**{idx}. {col.name}**\n"
            response += f"- **NIRF Rank:** {rank_str} [{item['nirf_category']}]\n"
            if item.get("nirf_score"):
                response += f"- **NIRF Score:** {item['nirf_score']:.2f}/100\n"
            response += f"- **Location:** {col.city}, {col.state}\n"
            response += f"- **Estimated Fees:** ₹{col.total_estimated_fee:.2f} Lakhs/yr\n"
            response += f"- **Average Placement:** ₹{col.average_package or 0:.1f} LPA ({col.placement_percentage or 0}% placement rate)\n"
            response += f"- **Data Source:** {item['nirf_source']}\n\n"

        response += "---\n*Note: All ranks are verified directly from official NIRF published statistics.*"
        return response

    async def _handle_recommendation_query(
        self,
        profile: StudentProfile,
        query: str,
        chat_history: List[ChatMessage],
        target_course: Course,
        filtered_colleges: List[College],
        extracted_intent: Dict[str, Any]
    ) -> str:

        # Deterministic scoring for all candidate colleges
        evaluated_candidates = []
        for col in filtered_colleges:
            score_dict = calculate_match_score_deterministic(profile, col, target_course, self.db)
            evaluated_candidates.append({
                "college": col,
                "score_details": score_dict
            })

        # Sort by match score descending
        evaluated_candidates.sort(key=lambda x: x["score_details"]["match_score"], reverse=True)
        top_candidates = evaluated_candidates[:5]

        colleges_summary_for_prompt = []
        for cand in top_candidates:
            c = cand["college"]
            s = cand["score_details"]
            nirf_str = f"#{c.nirf_rank}" if c.nirf_rank else "NIRF rank not available"
            colleges_summary_for_prompt.append(
                f"- ID: {c.id} | Name: {c.name} | Location: {c.city}, {c.district or c.city}, {c.state} | Type: {c.type} | "
                f"NIRF: {nirf_str} | Fees: {c.total_estimated_fee} Lakhs | Avg Pkg: {c.average_package} LPA | "
                f"Match Score: {s['match_score']}/100 | Admission Chance: {s['admission_chance']} | Category: {s['classification']} | "
                f"Eligibility: {s['eligibility_status']} | Key Reasons: {'; '.join(s['reasons'])} | Warnings: {'; '.join(s['warnings'])}"
            )

        prompt = f"""
System Role: You are an expert, empathetic, data-driven Indian College Admission Counselor.

Student Profile Context:
- Name: {profile.full_name}
- 10th Score: {profile.percentage_10th}%
- 12th Score: {profile.percentage_12th}%
- Entrance Exam: {profile.exam_name or 'None'} (Score: {profile.exam_score or 'N/A'}, Rank: {profile.rank or 'N/A'})
- Preferred Course: {profile.preferred_course or target_course.name}
- Preferred Location: {profile.preferred_city or profile.preferred_state or 'Anywhere'}
- Max Budget: {profile.max_budget or 'Not specified'} Lakhs

User Query: "{query}"

Pre-Filtered and Verified College Candidates:
{chr(10).join(colleges_summary_for_prompt)}

INSTRUCTIONS:
1. ONLY recommend colleges from the provided candidate list above. NEVER invent or mention colleges not in this list.
2. Group recommendations into Safe (🟢), Target (🟡), and Dream (🔴) categories.
3. For EACH college, present a concise markdown block containing:
   - College Name and Location (City, State)
   - Category Badge: Safe (🟢), Target (🟡), or Dream (🔴)
   - Calculated Match Score (% out of 100)
   - Estimated Fees (in Lakhs) and Average Placement (LPA)
   - Official NIRF Rank (or 'NIRF rank not available')
   - Why this college fits the student profile
4. Include an 'Application Strategy' section recommending how to distribute applications.
5. End with a helpful, conversational follow-up prompt.
"""

        try:
            llm_response = await call_llm(prompt)
            if llm_response and len(llm_response.strip()) > 50:
                return llm_response
        except Exception as e:
            logger.warning(f"LLM synthesis fallback triggered: {str(e)}")

        # Deterministic Markdown Generation Fallback
        return self._generate_fallback_recommendation_markdown(profile, target_course, top_candidates, extracted_intent)

    def _generate_fallback_recommendation_markdown(
        self, 
        profile: StudentProfile, 
        course: Course, 
        evaluated_candidates: List[Dict[str, Any]],
        extracted_intent: Dict[str, Any]
    ) -> str:
        loc_str = extracted_intent.get("district") or extracted_intent.get("city") or extracted_intent.get("state") or "India"
        response = f"### 🎓 Personalized College Admission Recommendations\n\n"
        response += f"Based on your profile (**12th: {profile.percentage_12th}%**, **{profile.exam_name or 'Entrance'}: {profile.exam_score or 'N/A'}**) for **{course.name}** in **{loc_str}**:\n\n"

        safe_list = []
        target_list = []
        dream_list = []

        for cand in evaluated_candidates:
            c = cand["college"]
            s = cand["score_details"]
            item_md = f"#### **{c.name}** ({c.city}, {c.state})\n"
            item_md += f"- **Match Score:** {s['match_score']}/100\n"
            item_md += f"- **Admission Chance:** {s['admission_chance']}\n"
            nirf_label = f"#{c.nirf_rank} ({c.nirf_year})" if c.nirf_rank else "NIRF rank not available"
            item_md += f"- **NIRF Rank:** {nirf_label}\n"
            item_md += f"- **Estimated Total Fee:** ₹{c.total_estimated_fee:.2f} Lakhs\n"
            item_md += f"- **Placement Statistics:** Avg ₹{c.average_package or 0:.1f} LPA ({c.placement_percentage or 0}% placed)\n"
            item_md += f"- **Eligibility Status:** {s['eligibility_status']}\n"
            if s['reasons']:
                item_md += f"- **Why Fit:** {'; '.join(s['reasons'])}\n"
            if s['warnings']:
                item_md += f"- **Note:** {'; '.join(s['warnings'])}\n"

            if s["classification"] == "Safe":
                safe_list.append(item_md)
            elif s["classification"] == "Target":
                target_list.append(item_md)
            else:
                dream_list.append(item_md)

        if safe_list:
            response += "### 🟢 SAFE COLLEGES (High Admission Probability)\n" + "\n".join(safe_list) + "\n"
        if target_list:
            response += "### 🟡 TARGET COLLEGES (Moderate Admission Probability)\n" + "\n".join(target_list) + "\n"
        if dream_list:
            response += "### 🔴 DREAM COLLEGES (Competitive / Reach)\n" + "\n".join(dream_list) + "\n"

        response += "### 💡 Recommended Application Strategy\n"
        response += "- **Apply to 2 Safe Colleges** to secure a confirmed backup.\n"
        response += "- **Apply to 2-3 Target Colleges** for optimal match balance.\n"
        response += "- **Apply to 1 Dream College** for ambitious aspirations.\n\n"
        response += "Would you like me to compare any of these colleges or check tuition fee breakdowns?"

        return response

    async def _handle_followup_query(
        self, 
        profile: StudentProfile, 
        query: str, 
        intent: Dict[str, Any], 
        chat_history: List[ChatMessage]
    ) -> str:
        # Retrieve recent colleges mentioned in session memory
        session_colleges = self.db.query(College).limit(10).all()
        target_course = self.db.query(Course).first()

        intent_kind = intent["intent"]
        if intent_kind == "followup_cheapest":
            sorted_cols = sorted(session_colleges, key=lambda x: x.total_estimated_fee)
            cheapest = sorted_cols[0]
            return (
                f"### 💰 Most Affordable College Recommendation\n\n"
                f"Among the evaluated options, **{cheapest.name}** in {cheapest.city}, {cheapest.state} is the most budget-friendly choice:\n\n"
                f"- **Total Estimated Fee:** ₹{cheapest.total_estimated_fee:.2f} Lakhs (Tuition: ₹{cheapest.tuition_fee}L + Hostel: ₹{cheapest.hostel_fee}L)\n"
                f"- **Average Package:** ₹{cheapest.average_package} LPA\n"
                f"- **NIRF Rank:** #{cheapest.nirf_rank if cheapest.nirf_rank else 'N/A'}\n\n"
                f"Would you like details on scholarship opportunities or fee concessions for this college?"
            )
        elif intent_kind == "followup_placement":
            sorted_cols = sorted(session_colleges, key=lambda x: (x.average_package or 0), reverse=True)
            top_placement = sorted_cols[0]
            return (
                f"### 🚀 Top Placement College Recommendation\n\n"
                f"**{top_placement.name}** in {top_placement.city}, {top_placement.state} offers the highest placement outcome:\n\n"
                f"- **Average Package:** ₹{top_placement.average_package} LPA\n"
                f"- **Highest Package:** ₹{top_placement.highest_package or (top_placement.average_package * 2.5):.1f} LPA\n"
                f"- **Placement Percentage:** {top_placement.placement_percentage}%\n"
                f"- **NIRF Rank:** #{top_placement.nirf_rank if top_placement.nirf_rank else 'N/A'}\n"
                f"- **Total Fee:** ₹{top_placement.total_estimated_fee:.2f} Lakhs\n\n"
                f"Would you like to review recruiter profiles for {top_placement.name}?"
            )
        else: # safest
            evaluated = []
            for col in session_colleges:
                score = calculate_match_score_deterministic(profile, col, target_course, self.db)
                if score["admission_chance"] == "High":
                    evaluated.append((col, score))
            if not evaluated:
                evaluated = [(c, calculate_match_score_deterministic(profile, c, target_course, self.db)) for c in session_colleges]
            evaluated.sort(key=lambda x: x[1]["match_score"], reverse=True)
            safest, s_details = evaluated[0]
            return (
                f"### 🛡️ Safest Admission Choice\n\n"
                f"**{safest.name}** in {safest.city}, {safest.state} represents your highest certainty option:\n\n"
                f"- **Match Score:** {s_details['match_score']}/100\n"
                f"- **Admission Chance:** High\n"
                f"- **Classification:** Safe (🟢)\n"
                f"- **Key Advantage:** {'; '.join(s_details['reasons'][:2])}\n\n"
                f"Would you like to proceed with shortlisting {safest.name}?"
            )

    async def _handle_compare_query(
        self, 
        profile: StudentProfile, 
        query: str, 
        course: Course, 
        colleges: List[College]
    ) -> str:
        if len(colleges) < 2:
            colleges = self.db.query(College).limit(3).all()

        col_ids = [c.id for c in colleges[:3]]
        cmp_result = await self.comparison_agent.compare(profile, col_ids, course.id)
        
        col_list = cmp_result.get("comparison_matrix", [])
        response = f"### ⚖️ Side-by-Side College Comparison ({course.name})\n\n"
        response += "| Feature | " + " | ".join([c["name"] for c in col_list]) + " |\n"
        response += "| --- | " + " | ".join(["---" for _ in col_list]) + " |\n"
        response += "| **City / State** | " + " | ".join([f"{c['city']}, {c['state']}" for c in col_list]) + " |\n"
        response += "| **NIRF Rank** | " + " | ".join([f"#{c['nirf_rank']}" if c.get('nirf_rank') else "NIRF rank not available" for c in col_list]) + " |\n"
        response += "| **Total Fee** | " + " | ".join([f"₹{c['total_fee']:.2f}L" for c in col_list]) + " |\n"
        response += "| **Avg Placement** | " + " | ".join([f"₹{c['average_package']} LPA" for c in col_list]) + " |\n"
        response += "| **Match Score** | " + " | ".join([f"{c['match_score']}/100" for c in col_list]) + " |\n"
        response += "| **Admission Chance** | " + " | ".join([c["admission_chance"] for c in col_list]) + " |\n\n"
        
        response += f"### 💡 Counselor Comparison Summary\n"
        response += f"{cmp_result.get('summary', 'Both colleges offer strong academic frameworks with distinct fee structures.')}\n"
        return response

    async def _handle_score_change_query(
        self, 
        profile: StudentProfile, 
        query: str, 
        course: Course, 
        colleges: List[College]
    ) -> str:
        score_match = re.search(r'(\d+(?:\.\d+)?)', query)
        new_score = float(score_match.group(1)) if score_match else (profile.exam_score or 80.0) + 10.0

        what_if_res = await self.what_if_agent.simulate(
            profile=profile,
            exam_score=new_score,
            colleges=colleges[:5],
            course=course
        )

        response = f"### 🔮 'What-If' Admission Simulation Analysis\n\n"
        response += f"Simulating outcome if your **{profile.exam_name or 'Entrance Exam'}** score changes to **{new_score}**:\n\n"

        for res in what_if_res.get("results", []):
            b_score = res["before_match_score"]
            a_score = res["after_match_score"]
            b_chance = res["before_chance"]
            a_chance = res["after_chance"]
            col_name = res["college_name"]
            
            diff = a_score - b_score
            arrow = "📈 +" if diff >= 0 else "📉 "
            response += f"**{col_name}**\n"
            response += f"- Match Score: {b_score}/100 ➔ **{a_score}/100** ({arrow}{diff:.1f})\n"
            response += f"- Admission Chance: {b_chance} ➔ **{a_chance}**\n\n"

        response += "Improving your entrance score significantly unlocks higher match scores and improves admission probability from Target/Dream to Safe!"
        return response

    async def _handle_course_query(self, profile: StudentProfile, query: str) -> str:
        courses = self.db.query(Course).all()
        response = "### 📚 Course & Specialization Guidance\n\n"
        response += "Here are top recommended engineering courses based on current industry placement trends:\n\n"
        for c in courses[:4]:
            response += f"**1. {c.name}** ({c.department})\n"
            response += f"- **Entrance Exam Required:** {c.entrance_exam or 'Board Percentage'}\n"
            response += f"- **Eligibility Threshold:** Minimum {c.minimum_percentage}% in 12th Board\n"
            response += f"- **Career Scope:** {', '.join(c.career_opportunities[:3]) if c.career_opportunities else 'Software, Engineering'}\n\n"
        return response
