import time
import logging
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.models.models import College, Course, StudentProfile, AiAgentLog, ChatMessage
from app.agents.eligibility_agent import EligibilityAgent
from app.agents.recommendation_agent import RecommendationAgent
from app.agents.course_agent import CourseAgent
from app.agents.admission_chance_agent import AdmissionChanceAgent
from app.agents.comparison_agent import ComparisonAgent
from app.agents.strategy_agent import StrategyAgent
from app.agents.nirf_agent import NirfAgent
from app.agents.counselor_agent import CounselorAgent

logger = logging.getLogger(__name__)

class AgentOrchestrator:
    def __init__(self, db: Session):
        self.db = db

    async def log_agent_execution(
        self, 
        agent_name: str, 
        input_data: Any, 
        output_data: Any, 
        execution_time: float, 
        session_id: Optional[int] = None
    ):
        try:
            log = AiAgentLog(
                session_id=session_id,
                agent_name=agent_name,
                input_data=input_data,
                output_data=output_data,
                execution_time=execution_time
            )
            self.db.add(log)
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to write agent execution log: {str(e)}")
            self.db.rollback()

    async def check_eligibility(self, profile: StudentProfile, college_id: int, course_id: int) -> dict:
        start_time = time.time()
        college = self.db.query(College).filter(College.id == college_id).first()
        course = self.db.query(Course).filter(Course.id == course_id).first()
        
        if not college or not course:
            return {"error": "College or Course not found"}

        agent = EligibilityAgent(self.db)
        result = await agent.run(profile, college, course)
        
        execution_time = time.time() - start_time
        await self.log_agent_execution(
            agent_name="Eligibility Agent",
            input_data={"student_id": profile.id, "college_id": college_id, "course_id": course_id},
            output_data={"eligible": result["eligible"], "reasons": result["reasons"]},
            execution_time=execution_time
        )
        return result

    async def get_recommendation(self, profile: StudentProfile, college_id: int, course_id: int) -> dict:
        start_time = time.time()
        college = self.db.query(College).filter(College.id == college_id).first()
        course = self.db.query(Course).filter(Course.id == course_id).first()
        
        if not college or not course:
            return {"error": "College or Course not found"}

        agent = RecommendationAgent(self.db)
        result = await agent.run(profile, college, course)
        
        execution_time = time.time() - start_time
        await self.log_agent_execution(
            agent_name="Recommendation Agent",
            input_data={"student_id": profile.id, "college_id": college_id, "course_id": course_id},
            output_data={
                "match_score": result["match_score"],
                "eligibility": result["eligibility_status"],
                "chance": result["admission_chance"],
                "classification": result["classification"]
            },
            execution_time=execution_time
        )
        return result

    async def recommend_courses(self, profile: StudentProfile) -> List[dict]:
        start_time = time.time()
        agent = CourseAgent(self.db)
        result = await agent.run(profile)
        
        execution_time = time.time() - start_time
        await self.log_agent_execution(
            agent_name="Course Recommendation Agent",
            input_data={"student_id": profile.id},
            output_data={"recommendations_count": len(result)},
            execution_time=execution_time
        )
        return result

    async def predict_admission_chance(self, profile: StudentProfile, college_id: int, course_id: int) -> dict:
        start_time = time.time()
        college = self.db.query(College).filter(College.id == college_id).first()
        course = self.db.query(Course).filter(Course.id == course_id).first()
        
        if not college or not course:
            return {"error": "College or Course not found"}

        agent = AdmissionChanceAgent(self.db)
        result = await agent.run(profile, college, course)
        
        execution_time = time.time() - start_time
        await self.log_agent_execution(
            agent_name="Admission Chance Agent",
            input_data={"student_id": profile.id, "college_id": college_id, "course_id": course_id},
            output_data={"chance": result["admission_chance"], "confidence": result["confidence"]},
            execution_time=execution_time
        )
        return result

    async def compare_colleges(self, profile: StudentProfile, college_ids: List[int], course_id: int) -> dict:
        start_time = time.time()
        colleges = self.db.query(College).filter(College.id.in_(college_ids)).all()
        course = self.db.query(Course).filter(Course.id == course_id).first()
        
        if not colleges or not course:
            return {"error": "Colleges or Course not found"}

        agent = ComparisonAgent(self.db)
        result = await agent.run(profile, colleges, course)
        
        execution_time = time.time() - start_time
        await self.log_agent_execution(
            agent_name="College Comparison Agent",
            input_data={"student_id": profile.id, "college_ids": college_ids, "course_id": course_id},
            output_data={"compared_count": len(colleges)},
            execution_time=execution_time
        )
        return result

    async def generate_admission_strategy(self, profile: StudentProfile, course_id: int) -> dict:
        start_time = time.time()
        course = self.db.query(Course).filter(Course.id == course_id).first()
        colleges = self.db.query(College).all()
        
        if not course or not colleges:
            return {"error": "Course or Colleges data not found"}

        agent = StrategyAgent(self.db)
        result = await agent.run(profile, colleges, course)
        
        execution_time = time.time() - start_time
        await self.log_agent_execution(
            agent_name="Admission Strategy Agent",
            input_data={"student_id": profile.id, "course_id": course_id},
            output_data={
                "safe_count": len(result["safe_colleges"]),
                "target_count": len(result["target_colleges"]),
                "dream_count": len(result["dream_colleges"])
            },
            execution_time=execution_time
        )
        return result

    async def chat_counselor(
        self, 
        profile: StudentProfile, 
        query: str, 
        session_id: int, 
        chat_history: List[ChatMessage] = []
    ) -> str:
        start_time = time.time()
        agent = CounselorAgent(self.db)
        result = await agent.run(profile, query, chat_history)
        
        execution_time = time.time() - start_time
        await self.log_agent_execution(
            agent_name="AI Counselor Agent",
            input_data={"student_id": profile.id, "query": query},
            output_data={"response_length": len(result)},
            execution_time=execution_time,
            session_id=session_id
        )
        return result
