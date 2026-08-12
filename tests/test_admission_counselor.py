import os
import sys
import asyncio
import unittest
from sqlalchemy.orm import Session

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from app.database import SessionLocal, engine, Base
from app.models.models import College, StudentProfile, Course, User, State, District, City
from app.agents.counselor_agent import CounselorAgent
from app.agents.intent_agent import IntentAgent
from app.agents.college_retrieval_agent import CollegeRetrievalAgent
from app.agents.nirf_agent import NirfAgent
from app.algorithms.location_filter import extract_query_constraints, filter_colleges_by_constraints
from app.algorithms.response_validator import ResponseValidator

class TestAdmissionCounselorAgent(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_01_state_filter(self):
        """Test 1: Hard State Filter - 'Best CSE colleges in Tamil Nadu'"""
        counselor = CounselorAgent(self.db)
        profile = self.db.query(StudentProfile).first()

        query = "Best CSE colleges in Tamil Nadu"
        intent = counselor.intent_agent.extract_intent(query, profile)

        self.assertTrue(intent["explicit_location"])
        self.assertEqual(intent["state"], "Tamil Nadu")

        retrieval = counselor.retrieval_agent.retrieve_candidates(intent, profile)
        colleges = retrieval["colleges"]

        self.assertGreater(len(colleges), 0)
        for col in colleges:
            self.assertEqual(col.state, "Tamil Nadu", f"Leaked college outside Tamil Nadu: {col.name} ({col.state})")

    def test_02_district_filter(self):
        """Test 2: Hard District Filter - 'Best colleges in Erode district'"""
        counselor = CounselorAgent(self.db)
        profile = self.db.query(StudentProfile).first()

        query = "Best colleges in Erode district"
        intent = counselor.intent_agent.extract_intent(query, profile)

        self.assertTrue(intent["explicit_district"])
        self.assertEqual(intent["district"], "Erode")

        retrieval = counselor.retrieval_agent.retrieve_candidates(intent, profile)
        colleges = retrieval["colleges"]

        self.assertGreater(len(colleges), 0)
        for col in colleges:
            self.assertTrue(col.district == "Erode" or col.city == "Erode", f"Leaked college outside Erode district: {col.name} ({col.district})")

    def test_03_city_filter(self):
        """Test 3: Hard City Filter - 'Best CSE colleges in Coimbatore'"""
        counselor = CounselorAgent(self.db)
        profile = self.db.query(StudentProfile).first()

        query = "Best CSE colleges in Coimbatore"
        intent = counselor.intent_agent.extract_intent(query, profile)

        self.assertTrue(intent["explicit_location"])
        self.assertEqual(intent["city"], "Coimbatore")

        retrieval = counselor.retrieval_agent.retrieve_candidates(intent, profile)
        colleges = retrieval["colleges"]

        self.assertGreater(len(colleges), 0)
        for col in colleges:
            self.assertEqual(col.city, "Coimbatore", f"Leaked college outside Coimbatore: {col.name} ({col.city})")

    def test_04_course_district_filter(self):
        """Test 4: Hard Course + District Filter - 'Best CSE colleges in Erode district under 3 lakh'"""
        counselor = CounselorAgent(self.db)
        profile = self.db.query(StudentProfile).first()

        query = "Best CSE colleges in Erode district under 3 lakh"
        intent = counselor.intent_agent.extract_intent(query, profile)

        self.assertTrue(intent["explicit_district"])
        self.assertEqual(intent["district"], "Erode")
        self.assertTrue(intent["explicit_budget"])
        self.assertEqual(intent["max_budget"], 3.0)

        retrieval = counselor.retrieval_agent.retrieve_candidates(intent, profile)
        colleges = retrieval["colleges"]

        self.assertGreater(len(colleges), 0)
        for col in colleges:
            self.assertTrue(col.district == "Erode" or col.city == "Erode")
            self.assertLessEqual(col.total_estimated_fee, 3.0)

    def test_05_course_state_filter(self):
        """Test 5: Hard Course + State Filter - 'Best ECE colleges in Tamil Nadu'"""
        counselor = CounselorAgent(self.db)
        profile = self.db.query(StudentProfile).first()

        query = "Best ECE colleges in Tamil Nadu"
        intent = counselor.intent_agent.extract_intent(query, profile)

        self.assertEqual(intent["state"], "Tamil Nadu")
        retrieval = counselor.retrieval_agent.retrieve_candidates(intent, profile)
        colleges = retrieval["colleges"]

        self.assertGreater(len(colleges), 0)
        for col in colleges:
            self.assertEqual(col.state, "Tamil Nadu")

    def test_06_budget_filter(self):
        """Test 6: Budget Hard Filter - 'Colleges under 2 lakh fee'"""
        counselor = CounselorAgent(self.db)
        profile = self.db.query(StudentProfile).first()

        query = "Colleges under 2 lakh fee"
        intent = counselor.intent_agent.extract_intent(query, profile)

        self.assertTrue(intent["explicit_budget"])
        self.assertEqual(intent["max_budget"], 2.0)

        retrieval = counselor.retrieval_agent.retrieve_candidates(intent, profile)
        colleges = retrieval["colleges"]

        self.assertGreater(len(colleges), 0)
        for col in colleges:
            self.assertLessEqual(col.total_estimated_fee, 2.0)

    def test_07_nirf_query_filter(self):
        """Test 7: NIRF Ranking Agent Query - 'Best NIRF-ranked colleges in Tamil Nadu'"""
        counselor = CounselorAgent(self.db)
        profile = self.db.query(StudentProfile).first()

        query = "Best NIRF-ranked colleges in Tamil Nadu"
        res = asyncio.run(counselor.run(profile, query))

        self.assertTrue("NIRF" in res or "Ranking" in res)

    def test_08_profile_personalization(self):
        """Test 8: Student Profile Personalization"""
        counselor = CounselorAgent(self.db)
        profile = self.db.query(StudentProfile).first()

        query = "Which colleges fit my profile?"
        res = asyncio.run(counselor.run(profile, query))

        self.assertGreater(len(res), 50)

    def test_09_profile_location_filter(self):
        """Test 9: Profile + Location Combined Filter - 'Best CSE colleges in Erode for my profile'"""
        counselor = CounselorAgent(self.db)
        profile = self.db.query(StudentProfile).first()

        query = "Best CSE colleges in Erode for my profile"
        res = asyncio.run(counselor.run(profile, query))

        self.assertIn("Erode", res)

    def test_10_india_wide_search(self):
        """Test 10: TNEA Cutoff Search - 'Best CSE colleges in Tamil Nadu'"""
        counselor = CounselorAgent(self.db)
        profile = self.db.query(StudentProfile).first()

        query = "Best CSE colleges in Tamil Nadu"
        intent = counselor.intent_agent.extract_intent(query, profile)

        self.assertEqual(intent["state"], "Tamil Nadu")

        retrieval = counselor.retrieval_agent.retrieve_candidates(intent, profile)
        colleges = retrieval["colleges"]
        self.assertGreater(len(colleges), 0)

    def test_11_followup_query(self):
        """Test 11: Conversational Memory Follow-up - 'Which of these is the cheapest?'"""
        counselor = CounselorAgent(self.db)
        profile = self.db.query(StudentProfile).first()

        query = "Which of these is the cheapest?"
        res = asyncio.run(counselor.run(profile, query))

        self.assertTrue("Affordable" in res or "Fee" in res or "Lakhs" in res)

    def test_12_location_change_query(self):
        """Test 12: Location Change Query - 'What about Chennai?'"""
        counselor = CounselorAgent(self.db)
        profile = self.db.query(StudentProfile).first()

        query = "What about Chennai?"
        intent = counselor.intent_agent.extract_intent(query, profile)

        self.assertEqual(intent["city"], "Chennai")
        retrieval = counselor.retrieval_agent.retrieve_candidates(intent, profile)

        self.assertGreater(len(retrieval["colleges"]), 0)
        for c in retrieval["colleges"]:
            self.assertEqual(c.city, "Chennai")

    def test_13_what_if_query(self):
        """Test 13: What-If Rank Change Simulation - 'What if my score becomes 95?'"""
        counselor = CounselorAgent(self.db)
        profile = self.db.query(StudentProfile).first()

        query = "What if my score becomes 95?"
        res = asyncio.run(counselor.run(profile, query))

        self.assertTrue("What-If" in res or "Match Score" in res or "Simulating" in res)

    def test_14_no_results_handling(self):
        """Test 14: No Results Clean Handling - 'Best Aerospace Engineering colleges in Erode'"""
        counselor = CounselorAgent(self.db)
        profile = self.db.query(StudentProfile).first()

        query = "Best Aerospace Engineering colleges in Erode"
        res = asyncio.run(counselor.run(profile, query))

        self.assertTrue("couldn't find" in res or "no" in res.lower())
        self.assertIn("Erode", res)

    def test_15_anti_hallucination_rule(self):
        """Test 15: Anti-Hallucination Database Verification"""
        counselor = CounselorAgent(self.db)
        profile = self.db.query(StudentProfile).first()

        query = "Best CSE colleges in Erode"
        intent = counselor.intent_agent.extract_intent(query, profile)
        retrieval = counselor.retrieval_agent.retrieve_candidates(intent, profile)

        db_college_ids = set(c.id for c in self.db.query(College).all())
        for col in retrieval["colleges"]:
            self.assertIn(col.id, db_college_ids, f"Hallucinated college ID {col.id} not in DB!")

    def test_16_strict_pre_response_validator(self):
        """Test 16: Response Validator Strict Filtering"""
        validator = ResponseValidator(self.db)
        all_colleges = self.db.query(College).all()

        constraints = {"explicit_location": True, "state": "Tamil Nadu"}
        validated = validator.validate_candidates(all_colleges, constraints)

        self.assertGreater(len(validated), 0)
        for c in validated:
            self.assertEqual(c.state, "Tamil Nadu")

if __name__ == "__main__":
    unittest.main()
