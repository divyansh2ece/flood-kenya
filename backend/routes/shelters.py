from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from db.supabase_client import get_supabase
from services.geocoding import haversine_km

router = APIRouter(prefix="/shelters", tags=["shelters"])


@router.get("/nearby")
async def get_nearby_shelters(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
    limit: int = Query(default=3, le=10),
):
    """Return N nearest active shelters to a given coordinate."""
    db = get_supabase()
    result = db.table("shelters").select("*").eq("is_active", True).execute()
    shelters = result.data or []

    # Calculate distance for each shelter
    for s in shelters:
        s["distance_km"] = round(haversine_km(lat, lng, s["lat"], s["lng"]), 2)

    shelters.sort(key=lambda s: s["distance_km"])
    return shelters[:limit]


@router.get("/county/{county}")
async def get_shelters_by_county(county: str):
    db = get_supabase()
    result = (
        db.table("shelters")
        .select("*")
        .eq("county", county)
        .eq("is_active", True)
        .execute()
    )
    return result.data or []


@router.get("/")
async def list_all_shelters():
    db = get_supabase()
    result = db.table("shelters").select("*").eq("is_active", True).execute()
    return result.data or []


@router.post("/")
async def add_shelter(shelter: dict):
    """Admin endpoint to add a new shelter."""
    db = get_supabase()
    result = db.table("shelters").insert(shelter).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save shelter")
    return result.data[0]
