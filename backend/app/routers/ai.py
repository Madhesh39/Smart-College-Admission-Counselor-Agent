from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.database import get_db
from app.models.models import ChatSession, ChatMessage, StudentProfile, User
from app.schemas.schemas import ChatSessionOut, ChatMessageOut, ChatMessageCreate, ChatSessionCreate
from app.auth.auth_handler import get_current_user
from app.agents.orchestrator import AgentOrchestrator
from app.agents.intent_agent import IntentAgent
from app.agents.college_retrieval_agent import CollegeRetrievalAgent

router = APIRouter(prefix="/ai", tags=["AI Counselor Chat"])

class AISearchQuery(BaseModel):
    query: str

@router.post("/search")
def natural_language_search(
    search_data: AISearchQuery,
    db: Session = Depends(get_db)
):
    """
    Natural Language Search API: Extracts intent & constraints, executes database retrieval,
    and returns structured intent analysis + candidates per Section 36 spec.
    """
    intent_agent = IntentAgent(db)
    retrieval_agent = CollegeRetrievalAgent(db)

    extracted_intent = intent_agent.extract_intent(search_data.query, None)
    retrieval_result = retrieval_agent.retrieve_candidates(extracted_intent, None)

    colleges_list = []
    for cd in retrieval_result["candidates"]:
        col = cd["college"]
        cutoffs_list = []
        for ctf in col.cutoffs[:15]:
            cutoffs_list.append({
                "course": ctf.course.name if ctf.course else "Engineering",
                "category": ctf.category,
                "year": ctf.year,
                "cutoff_score": ctf.cutoff_score,
                "exam": ctf.exam
            })
        colleges_list.append({
            "id": col.id,
            "name": col.name,
            "short_name": col.short_name,
            "location": col.location,
            "city": col.city,
            "district": col.district or col.city,
            "state": col.state,
            "type": col.type,
            "total_estimated_fee": col.total_estimated_fee,
            "average_package": col.average_package,
            "ranking": col.ranking,
            "source_name": col.source_name or "TNEA Verified Dataset (2024-2025)",
            "last_verified_at": str(col.last_verified_at or "2026-08-12")[:10],
            "cutoffs": cutoffs_list,
            "courses": [crs.name for crs in col.courses[:8]]
        })

    return {
        "intent": extracted_intent["intent"],
        "state": extracted_intent["state"],
        "district": extracted_intent["district"],
        "city": extracted_intent["city"],
        "course": extracted_intent["course"],
        "budget_max": extracted_intent["max_budget"],
        "use_student_profile": extracted_intent["use_student_profile"],
        "explicit_location": extracted_intent["explicit_location"],
        "candidates_found": len(colleges_list),
        "colleges": colleges_list
    }

@router.get("/chat/sessions", response_model=List[ChatSessionOut])
def get_chat_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        return []
    return db.query(ChatSession).filter(ChatSession.student_id == profile.id).order_by(ChatSession.updated_at.desc()).all()

@router.post("/chat/sessions", response_model=ChatSessionOut)
def create_chat_session(
    session_data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Please set up your profile first.")

    session = ChatSession(
        student_id=profile.id,
        title=session_data.title or "New Counseling Session"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.get("/chat/sessions/{session_id}", response_model=ChatSessionOut)
def get_chat_session_by_id(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Profile not found.")

    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.student_id == profile.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")
        
    return session

@router.post("/counselor/chat")
@router.post("/chat/{session_id}", response_model=ChatMessageOut)
async def chat_counselor(
    message_data: ChatMessageCreate,
    session_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        profile = StudentProfile(
            user_id=current_user.id,
            full_name=current_user.username,
            email=current_user.email,
            percentage_10th=80.0,
            percentage_12th=80.0,
            stream="Science",
            board="CBSE",
            exam_name="JEE Main",
            exam_score=85.0
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    if session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id,
            ChatSession.student_id == profile.id
        ).first()
    else:
        session = db.query(ChatSession).filter(ChatSession.student_id == profile.id).order_by(ChatSession.updated_at.desc()).first()

    if not session:
        session = ChatSession(
            student_id=profile.id,
            title="Admission Counseling Session"
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # Save student message
    student_msg = ChatMessage(
        session_id=session.id,
        sender="student",
        message=message_data.message
    )
    db.add(student_msg)
    db.commit()

    # Get history
    history = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).order_by(ChatMessage.created_at.asc()).all()

    # Call counselor agent via orchestrator
    orchestrator = AgentOrchestrator(db)
    ai_response = await orchestrator.chat_counselor(profile, message_data.message, session.id, history)

    # Save AI response
    ai_msg = ChatMessage(
        session_id=session.id,
        sender="ai",
        message=ai_response
    )
    db.add(ai_msg)
    
    import datetime
    session.updated_at = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(ai_msg)
    
    return ai_msg

@router.delete("/chat/sessions/{session_id}")
def delete_chat_session(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Profile not found.")

    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.student_id == profile.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    db.delete(session)
    db.commit()
    return {"message": "Chat session deleted"}
