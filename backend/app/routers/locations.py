from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.models import State, District, City

router = APIRouter(
    prefix="/locations",
    tags=["Locations"]
)

@router.get("/states")
def get_states(db: Session = Depends(get_db)):
    """
    Returns list of all Indian States and Union Territories.
    """
    states = db.query(State).order_by(State.name.asc()).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "normalized_name": s.normalized_name,
            "state_code": s.state_code,
            "type": s.type,
            "last_verified_at": s.last_verified_at
        }
        for s in states
    ]

@router.get("/districts")
def get_districts(
    state_id: Optional[int] = Query(None, description="Filter districts by state ID"),
    db: Session = Depends(get_db)
):
    """
    Returns list of Indian Districts, optionally filtered by state_id.
    """
    query = db.query(District)
    if state_id:
        query = query.filter(District.state_id == state_id)
    districts = query.order_by(District.name.asc()).all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "normalized_name": d.normalized_name,
            "state_id": d.state_id,
            "state_name": d.state.name if d.state else None,
            "last_verified_at": d.last_verified_at
        }
        for d in districts
    ]

@router.get("/cities")
def get_cities(
    district_id: Optional[int] = Query(None, description="Filter cities by district ID"),
    state_id: Optional[int] = Query(None, description="Filter cities by state ID"),
    db: Session = Depends(get_db)
):
    """
    Returns list of Indian Cities, optionally filtered by district_id or state_id.
    """
    query = db.query(City)
    if district_id:
        query = query.filter(City.district_id == district_id)
    if state_id:
        query = query.filter(City.state_id == state_id)
    cities = query.order_by(City.name.asc()).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "normalized_name": c.normalized_name,
            "district_id": c.district_id,
            "district_name": c.district.name if c.district else None,
            "state_id": c.state_id,
            "state_name": c.state.name if c.state else None,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "last_verified_at": c.last_verified_at
        }
        for c in cities
    ]
