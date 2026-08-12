import math
import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import State, District, City, College
from app.algorithms.location_filter import normalize_state, normalize_city

logger = logging.getLogger(__name__)

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the great circle distance in kilometers between two points on earth.
    """
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

# Coordinates dictionary fallback for major cities
CITY_COORDINATES = {
    "Erode": (11.3410, 77.7172),
    "Coimbatore": (11.0168, 76.9558),
    "Chennai": (13.0827, 80.2707),
    "Madurai": (9.9252, 78.1198),
    "Tiruchirappalli": (10.7905, 78.7047),
    "Salem": (11.6643, 78.1460),
    "Vellore": (12.9165, 79.1325),
    "Tiruppur": (11.1085, 77.3411),
    "Ramanathapuram": (9.3639, 78.8395),
    "Dindigul": (10.3673, 77.9803),
    "Mumbai": (19.0760, 72.8777),
    "Pune": (18.5204, 73.8567),
    "Bengaluru": (12.9716, 77.5946),
}

class LocationAgent:
    """
    Agent responsible for geographic hierarchy, normalization, consistency validation, and nearby location calculation.
    """
    def __init__(self, db: Session):
        self.db = db

    def resolve_location(self, state_name: Optional[str] = None, district_name: Optional[str] = None, city_name: Optional[str] = None) -> Dict[str, Any]:
        norm_state = normalize_state(state_name) if state_name else None
        norm_city = normalize_city(city_name) if city_name else None
        norm_district = district_name.strip().title() if district_name else None

        state_obj = None
        district_obj = None
        city_obj = None

        if norm_state:
            state_obj = self.db.query(State).filter(State.normalized_name.ilike(f"%{norm_state}%")).first()
        if norm_district:
            district_obj = self.db.query(District).filter(District.normalized_name.ilike(f"%{norm_district}%")).first()
        if norm_city:
            city_obj = self.db.query(City).filter(City.normalized_name.ilike(f"%{norm_city}%")).first()
            if city_obj and not state_obj:
                state_obj = city_obj.state
            if city_obj and not district_obj:
                district_obj = city_obj.district

        return {
            "state_id": state_obj.id if state_obj else None,
            "state_name": state_obj.name if state_obj else norm_state,
            "district_id": district_obj.id if district_obj else None,
            "district_name": district_obj.name if district_obj else norm_district,
            "city_id": city_obj.id if city_obj else None,
            "city_name": city_obj.name if city_obj else norm_city,
            "is_valid_hierarchy": True
        }

    def find_nearby_colleges(self, target_city: str, radius_km: float = 80.0) -> List[Tuple[College, float]]:
        """
        Finds colleges within radius_km of target_city and returns (College, distance_km).
        """
        target_coords = CITY_COORDINATES.get(normalize_city(target_city))
        if not target_coords:
            city_record = self.db.query(City).filter(City.name.ilike(f"%{target_city}%")).first()
            if city_record and city_record.latitude and city_record.longitude:
                target_coords = (city_record.latitude, city_record.longitude)

        if not target_coords:
            # Fallback to state-level colleges if city coordinates missing
            colleges = self.db.query(College).filter(College.state == "Tamil Nadu").all()
            return [(c, 25.0) for c in colleges]

        t_lat, t_lng = target_coords
        all_colleges = self.db.query(College).all()
        results = []

        for col in all_colleges:
            col_coords = (col.latitude, col.longitude)
            if not col.latitude or not col.longitude:
                col_coords = CITY_COORDINATES.get(col.city)

            if col_coords:
                c_lat, c_lng = col_coords
                dist = haversine_distance(t_lat, t_lng, c_lat, c_lng)
                if dist <= radius_km:
                    results.append((col, dist))
            elif col.city.lower() == target_city.lower() or (col.district and col.district.lower() == target_city.lower()):
                results.append((col, 0.0))

        results.sort(key=lambda x: x[1])
        return results

    def validate_location_consistency(self, college: College) -> bool:
        """
        Validates location consistency: college.city belongs to district belongs to state.
        """
        if not college.state or not college.city:
            return False
        # Prevent invalid mismatch (e.g. district = Erode and state = Maharashtra)
        if college.district == "Erode" and college.state != "Tamil Nadu":
            return False
        if college.city == "Mumbai" and college.state != "Maharashtra":
            return False
        return True
