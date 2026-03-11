from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta, timezone

from db.supabase_client import get_supabase
from models.schemas import ReportCreate, ReportOut
from services.swahili_parser import parse_report
from services.geocoding import geocode_location
from services.notifier import send_sms_alert, send_email_alert, log_alert

router = APIRouter(prefix="/reports", tags=["reports"])

ALERT_SEVERITY_THRESHOLD = 4   # auto-alert if severity >= this
CLUSTER_RADIUS_MINUTES = 30    # duplicate window


@router.get("/healthdb")
async def health_db():
    """Test Supabase connection — visit /reports/healthdb to debug"""
    import os
    url  = os.getenv("SUPABASE_URL", "NOT SET")
    key  = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "NOT SET")
    info = {
        "supabase_url":  url,
        "key_set":       key != "NOT SET",
        "key_prefix":    key[:12] + "..." if key != "NOT SET" else "NOT SET",
    }
    try:
        db = get_supabase()
        result = db.table("flood_reports").select("id").limit(3).execute()
        info["db_status"]    = "connected"
        info["sample_rows"]  = len(result.data or [])
        info["sample_ids"]   = [r["id"] for r in (result.data or [])]
    except Exception as e:
        info["db_status"] = "FAILED"
        info["db_error"]  = str(e)
    return info


@router.post("/", response_model=dict)
async def create_report(body: ReportCreate):
    try:
        db = get_supabase()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB init failed: {e}")

    # If raw_message provided but no parsed fields, auto-parse it
    if body.raw_message and not body.location:
        parsed = parse_report(body.raw_message)
        if parsed.location and not body.location:
            body.location = parsed.location
        if parsed.county and not body.county:
            body.county = parsed.county
        if parsed.severity > body.severity:
            body.severity = parsed.severity
        if parsed.water_level and not body.water_level:
            body.water_level = parsed.water_level
        if parsed.needs_rescue:
            body.needs_rescue = True
        if parsed.infrastructure and not body.infrastructure:
            body.infrastructure = parsed.infrastructure
        if parsed.language:
            body.language = parsed.language

    # Geocode if lat/lng missing
    if (body.lat is None or body.lng is None) and body.location:
        coords = await geocode_location(body.location)
        if coords:
            body.lat, body.lng = coords
    elif (body.lat is None or body.lng is None) and body.county:
        coords = await geocode_location(body.county)
        if coords:
            body.lat, body.lng = coords

    # Save to DB
    row = {
        "source":           body.source,
        "language":         body.language,
        "raw_message":      body.raw_message,
        "location":         body.location,
        "county":           body.county,
        "lat":              body.lat,
        "lng":              body.lng,
        "severity":         body.severity,
        "water_level":      body.water_level,
        "needs_rescue":     body.needs_rescue,
        "infrastructure":   body.infrastructure or [],
        "reporter_contact": body.reporter_contact,
    }

    try:
        result = db.table("flood_reports").insert(row).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB insert failed: {e}")

    if not result.data:
        raise HTTPException(status_code=500, detail="DB insert returned no data — check RLS policies")

    saved = result.data[0]
    report_id = saved["id"]

    # ── Trigger alerts if threshold met ───────────────────────
    should_alert = (
        body.severity >= ALERT_SEVERITY_THRESHOLD
        or body.needs_rescue
    )

    # Also alert if 3+ reports from same county in last 30 min
    if not should_alert and body.county:
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=CLUSTER_RADIUS_MINUTES)).isoformat()
        recent = (
            db.table("flood_reports")
            .select("id")
            .eq("county", body.county)
            .gte("created_at", cutoff)
            .execute()
        )
        if len(recent.data) >= 3:
            should_alert = True

    if should_alert and body.county:
        # Get nearest shelter for the alert message
        shelter_name, shelter_dist = None, None
        if body.lat and body.lng:
            shelters = db.table("shelters").select("*").eq("is_active", True).execute()
            from services.geocoding import haversine_km
            nearest = None
            min_dist = float("inf")
            for s in (shelters.data or []):
                d = haversine_km(body.lat, body.lng, s["lat"], s["lng"])
                if d < min_dist:
                    min_dist = d
                    nearest = s
            if nearest:
                shelter_name = nearest["name"]
                shelter_dist = round(min_dist, 1)

        county_reports = db.table("flood_reports").select("id").eq("county", body.county).execute()
        count = len(county_reports.data or [])

        email_ok = await send_email_alert(body.county, body.severity, count, shelter_name, shelter_dist)
        await log_alert(db, report_id, "email", os.getenv("ALERT_EMAIL_TO", ""), "", email_ok)

    return {"id": report_id, "severity": body.severity, "saved": True}


@router.get("/", response_model=list[ReportOut])
async def get_reports(
    hours: int = Query(default=24, le=168, description="Reports from last N hours"),
    county: Optional[str] = Query(default=None),
    severity_min: int = Query(default=1, ge=1, le=5),
    needs_rescue: Optional[bool] = Query(default=None),
    resolved: bool = Query(default=False),
    limit: int = Query(default=200, le=500),
):
    db = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()

    query = (
        db.table("flood_reports")
        .select("*")
        .gte("created_at", cutoff)
        .gte("severity", severity_min)
        .eq("resolved", resolved)
        .order("created_at", desc=True)
        .limit(limit)
    )

    if county:
        query = query.eq("county", county)
    if needs_rescue is not None:
        query = query.eq("needs_rescue", needs_rescue)

    result = query.execute()
    return result.data or []


@router.patch("/{report_id}/verify")
async def verify_report(report_id: str):
    db = get_supabase()
    db.table("flood_reports").update({"verified": True}).eq("id", report_id).execute()
    return {"status": "verified"}


@router.patch("/{report_id}/resolve")
async def resolve_report(report_id: str):
    db = get_supabase()
    db.table("flood_reports").update({"resolved": True}).eq("id", report_id).execute()
    return {"status": "resolved"}


@router.get("/stats")
async def get_stats():
    db = get_supabase()
    cutoff_24h = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    recent        = db.table("flood_reports").select("id").gte("created_at", cutoff_24h).execute()
    rescue_needed = db.table("flood_reports").select("id").eq("needs_rescue", True).eq("resolved", False).execute()
    critical      = db.table("flood_reports").select("id").gte("severity", 4).eq("resolved", False).execute()
    resolved_24h  = db.table("flood_reports").select("id").eq("resolved", True).gte("created_at", cutoff_24h).execute()

    return {
        "reports_24h":     len(recent.data or []),
        "rescue_needed":   len(rescue_needed.data or []),
        "critical_active": len(critical.data or []),
        "resolved_24h":    len(resolved_24h.data or []),
    }


import os
