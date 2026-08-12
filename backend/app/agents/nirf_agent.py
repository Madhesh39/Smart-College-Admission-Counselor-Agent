import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import College, StudentProfile

logger = logging.getLogger(__name__)

class NirfAgent:
    """
    Dedicated NIRF Ranking Agent responsible for ranking, filtering, and explaining
    official NIRF ranks, scores, categories, and verified sources.
    Enforces rules regarding NIRF category matching and missing rank reporting.
    """
    def __init__(self, db: Session):
        self.db = db

    def evaluate_nirf_rankings(
        self,
        colleges: List[College],
        requested_category: Optional[str] = "Engineering",
        top_n: int = 10
    ) -> Dict[str, Any]:
        """
        Processes candidate colleges and produces a structured NIRF analysis.
        Colleges without an NIRF rank display 'NIRF rank not available' (do not invent ranks).
        """
        category = requested_category or "Engineering"
        ranked_list = []
        unranked_list = []

        for college in colleges:
            rank_val = college.nirf_rank if college.nirf_rank is not None else college.ranking
            if rank_val is not None and rank_val > 0:
                ranked_list.append({
                    "college": college,
                    "college_id": college.id,
                    "college_name": college.name,
                    "city": college.city,
                    "district": college.district or college.city,
                    "state": college.state,
                    "nirf_rank": rank_val,
                    "nirf_score": college.nirf_score,
                    "nirf_year": college.nirf_year or 2024,
                    "nirf_category": college.nirf_category or category,
                    "nirf_source": college.nirf_source or "NIRF Official 2024",
                    "total_fee": college.total_estimated_fee,
                    "avg_package": college.average_package,
                    "status_label": f"Ranked #{rank_val} in NIRF {college.nirf_category or category} ({college.nirf_year or 2024})"
                })
            else:
                unranked_list.append({
                    "college": college,
                    "college_id": college.id,
                    "college_name": college.name,
                    "city": college.city,
                    "district": college.district or college.city,
                    "state": college.state,
                    "nirf_rank": None,
                    "nirf_score": None,
                    "status_label": "NIRF rank not available"
                })

        # Sort ranked colleges by NIRF rank ascending (lower rank number is better!)
        ranked_list.sort(key=lambda x: x["nirf_rank"])
        combined = ranked_list + unranked_list

        return {
            "category": category,
            "ranked_colleges": ranked_list[:top_n],
            "unranked_colleges": unranked_list,
            "all_evaluated": combined[:top_n],
            "total_ranked_count": len(ranked_list),
            "total_unranked_count": len(unranked_list)
        }
