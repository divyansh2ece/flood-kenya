from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import IntEnum


class Severity(IntEnum):
    LOW = 1        # Watch — light flooding
    MODERATE = 2   # Knee deep
    HIGH = 3       # Waist deep
    CRITICAL = 4   # Shoulder deep / infrastructure damage
    EMERGENCY = 5  # Head level / people drowning


class ReportSource(str):
    TELEGRAM = "telegram"
    WEB = "web"
    ADMIN = "admin"


# ── Incoming ──────────────────────────────────────────────────

class ReportCreate(BaseModel):
    source: str = "web"
    language: str = "en"
    raw_message: Optional[str] = None
    location: Optional[str] = None
    county: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    severity: int = Field(default=1, ge=1, le=5)
    water_level: Optional[str] = None          # knee / waist / shoulder / head
    needs_rescue: bool = False
    infrastructure: Optional[List[str]] = []
    reporter_contact: Optional[str] = None
    image_url: Optional[str] = None


# ── Outgoing ──────────────────────────────────────────────────

class ReportOut(BaseModel):
    id: str
    source: str
    language: str
    raw_message: Optional[str]
    location: Optional[str]
    county: Optional[str]
    lat: Optional[float]
    lng: Optional[float]
    severity: int
    water_level: Optional[str]
    needs_rescue: bool
    infrastructure: Optional[List[str]]
    reporter_contact: Optional[str]
    verified: bool
    resolved: bool
    image_url: Optional[str]
    created_at: datetime


class ShelterOut(BaseModel):
    id: str
    name: str
    name_sw: Optional[str]
    type: str
    county: Optional[str]
    lat: float
    lng: float
    capacity: Optional[int]
    contact: Optional[str]
    distance_km: Optional[float] = None


class WeatherOut(BaseModel):
    county: str
    lat: float
    lng: float
    current_rainfall_mm: float
    hourly_forecast: List[dict]   # [{time, precipitation}]
    flood_risk: str               # 'low' | 'moderate' | 'high'


class ParsedReport(BaseModel):
    is_flood_report: bool
    severity: int
    water_level: Optional[str]
    needs_rescue: bool
    infrastructure: List[str]
    location: Optional[str]
    county: Optional[str]
    language: str
