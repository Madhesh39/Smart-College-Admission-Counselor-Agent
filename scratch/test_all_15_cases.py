import asyncio
import sys
import os

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath("backend"))

from app.database import SessionLocal
from app.models.models import StudentProfile, College, Course
from app.agents.counselor_agent import CounselorAgent

async def run_all_tests():
    db = SessionLocal()
    agent = CounselorAgent(db)

    profile = db.query(StudentProfile).first()
    if not profile:
        profile = StudentProfile(
            user_id=1,
            full_name="Madhesh",
            email="madhesh@example.com",
            percentage_10th=88.5,
            percentage_12th=89.0,
            stream="Science",
            board="CBSE",
            exam_name="JEE Main",
            exam_score=85.0,
            rank=45000,
            max_budget=2.5,
            preferred_state="Tamil Nadu",
            preferred_city="Erode"
        )

    test_cases = [
        {
            "id": "TEST 1",
            "name": "State Hard Filter",
            "query": "Best colleges in Tamil Nadu",
            "check": lambda resp: "Tamil Nadu" in resp and "Maharashtra" not in resp and "Mumbai" not in resp
        },
        {
            "id": "TEST 2",
            "name": "City Hard Filter",
            "query": "Best colleges in Erode",
            "check": lambda resp: "Erode" in resp and "Mumbai" not in resp and "Chennai" not in resp
        },
        {
            "id": "TEST 3",
            "name": "District Hard Filter",
            "query": "Best colleges in Erode district",
            "check": lambda resp: "Erode" in resp and "Mumbai" not in resp
        },
        {
            "id": "TEST 4",
            "name": "City + Course Filter",
            "query": "Best CSE colleges in Erode",
            "check": lambda resp: "Erode" in resp and "Mumbai" not in resp
        },
        {
            "id": "TEST 5",
            "name": "Nearby Spatial Radius Search",
            "query": "Best colleges near Erode",
            "check": lambda resp: "Erode" in resp
        },
        {
            "id": "TEST 6",
            "name": "Out-of-State Filter",
            "query": "Best colleges in Maharashtra",
            "check": lambda resp: "Maharashtra" in resp and "Tamil Nadu" not in resp
        },
        {
            "id": "TEST 7",
            "name": "City Filter (Chennai)",
            "query": "Best colleges in Chennai",
            "check": lambda resp: "Chennai" in resp and "Mumbai" not in resp
        },
        {
            "id": "TEST 8",
            "name": "Budget Constraint Filter",
            "query": "Best engineering colleges under 2 lakh",
            "check": lambda resp: "matching colleges" in resp or "SAFE" in resp
        },
        {
            "id": "TEST 9",
            "name": "State + Course + Budget Filter",
            "query": "Best CSE colleges in Tamil Nadu under 2 lakh",
            "check": lambda resp: "Tamil Nadu" in resp and "Maharashtra" not in resp
        },
        {
            "id": "TEST 10",
            "name": "Profile Personalization",
            "query": "Best colleges for me",
            "check": lambda resp: "matching colleges" in resp or "SAFE" in resp
        },
        {
            "id": "TEST 11",
            "name": "Conversational Memory (Cheapest)",
            "query": "Which of these is cheapest?",
            "check": lambda resp: "Affordable" in resp or "Lakhs/year" in resp
        },
        {
            "id": "TEST 12",
            "name": "Conversational Location Switch",
            "query": "What about Erode?",
            "check": lambda resp: "Erode" in resp and "Mumbai" not in resp
        },
        {
            "id": "TEST 13",
            "name": "What-If Score Increase Analysis",
            "query": "What if my entrance score increases by 10?",
            "check": lambda resp: "What-If" in resp or "Score Increase" in resp
        },
        {
            "id": "TEST 14",
            "name": "India-Wide Search Scope",
            "query": "Best engineering colleges anywhere in India",
            "check": lambda resp: "across India" in resp or "matching colleges" in resp
        },
        {
            "id": "TEST 15",
            "name": "No Matching Result & No-Substitution Policy",
            "query": "Best CSE colleges in Dindigul",
            "check": lambda resp: ("Dindigul" in resp or "couldn't find" in resp) and "Mumbai" not in resp
        }
    ]

    print("\n============================================================")
    print("      SMART COLLEGE ADMISSION COUNSELOR AGENT TEST SUITE")
    print("============================================================\n")

    passed_count = 0

    for tc in test_cases:
        t_id = tc["id"]
        t_name = tc["name"]
        t_query = tc["query"]
        print(f"Executing [{t_id}] {t_name} (Query: '{t_query}')...")
        response = await agent.run(profile, t_query)

        first_few = "\n".join([line for line in response.split("\n") if line.strip()][:4])
        print(f"Response Snippet:\n{first_few}\n")

        assert tc["check"](response), f"Assertion failed for [{t_id}] {t_name}"
        print(f"✅ [{t_id}] {t_name} PASSED.")
        passed_count += 1
        print("-" * 60)

    print(f"\n============================================================")
    print(f"  ALL TEST CASES COMPLETED: {passed_count}/{len(test_cases)} PASSED 100%")
    print(f"============================================================\n")
    db.close()

if __name__ == "__main__":
    asyncio.run(run_all_tests())
