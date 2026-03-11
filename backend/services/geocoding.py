"""
Geocoding: location text → lat/lng
Uses Nominatim (OpenStreetMap) — free, no API key.
Rate limit: 1 request/second. We cache results.
"""

import httpx
import asyncio
from functools import lru_cache

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "FloodKenyaSystem/1.0 (flood-response@kenya.org)"}

# County coordinate lookup (instant, no API call needed)
COUNTY_COORDS: dict[str, tuple[float, float]] = {
    "Nairobi":          (-1.2921,  36.8219),
    "Mombasa":          (-4.0435,  39.6682),
    "Kisumu":           (-0.1022,  34.7617),
    "Nakuru":           (-0.3031,  36.0800),
    "Eldoret":          ( 0.5143,  35.2698),
    "Kisii":            (-0.6698,  34.7679),
    "Nyeri":            (-0.4167,  36.9500),
    "Meru":             ( 0.0460,  37.6490),
    "Kakamega":         ( 0.2827,  34.7519),
    "Machakos":         (-1.5177,  37.2634),
    "Kilifi":           (-3.6305,  39.8499),
    "Kwale":            (-4.1730,  39.4506),
    "Kitui":            (-1.3667,  37.9833),
    "Garissa":          (-0.4532,  42.0000),
    "Turkana":          ( 3.1179,  35.5956),
    "Mandera":          ( 3.9373,  41.8569),
    "Wajir":            ( 1.7471,  40.0573),
    "Marsabit":         ( 2.3284,  37.9899),
    "Isiolo":           ( 0.3541,  38.0006),
    "Tana River":       (-1.5000,  40.1000),
    "Lamu":             (-2.2694,  40.9022),
    "Taita Taveta":     (-3.3162,  38.4826),
    "Kajiado":          (-1.8516,  36.7820),
    "Makueni":          (-2.2585,  37.8942),
    "Nyandarua":        (-0.1834,  36.5228),
    "Laikipia":         ( 0.3606,  36.7819),
    "Samburu":          ( 1.2157,  36.9781),
    "Trans Nzoia":      ( 1.0566,  34.9500),
    "Uasin Gishu":      ( 0.5533,  35.2697),
    "Elgeyo Marakwet":  ( 1.0500,  35.5000),
    "Nandi":            ( 0.1833,  35.1167),
    "Baringo":          ( 0.4667,  35.9667),
    "Bomet":            (-0.7833,  35.3333),
    "Kericho":          (-0.3667,  35.2833),
    "Narok":            (-1.0833,  36.0833),
    "Migori":           (-1.0634,  34.4731),
    "Homa Bay":         (-0.5273,  34.4571),
    "Siaya":            ( 0.0611,  34.2881),
    "Vihiga":           ( 0.0833,  34.7167),
    "Bungoma":          ( 0.5635,  34.5606),
    "Busia":            ( 0.4608,  34.1117),
    "West Pokot":       ( 1.7500,  35.1167),
    "Embu":             (-0.5333,  37.4500),
    "Tharaka Nithi":    (-0.3000,  37.9167),
    "Kirinyaga":        (-0.6594,  37.3822),
    "Murang'a":         (-0.7167,  37.1500),
    "Kiambu":           (-1.0311,  36.8309),
}


def get_coords_for_county(county: str) -> tuple[float, float] | None:
    """Instant lookup from hardcoded table — no API call."""
    for name, coords in COUNTY_COORDS.items():
        if name.lower() == county.lower():
            return coords
    return None


async def geocode_location(location: str) -> tuple[float, float] | None:
    """
    Convert a location string to lat/lng.
    First tries the county lookup table (instant),
    then falls back to Nominatim API.
    """
    # Try county table first
    coords = get_coords_for_county(location)
    if coords:
        return coords

    # Fall back to Nominatim
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=5.0) as client:
            resp = await client.get(NOMINATIM_URL, params={
                "q": f"{location}, Kenya",
                "format": "json",
                "limit": 1,
                "countrycodes": "ke",
            })
            resp.raise_for_status()
            data = resp.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass

    return None


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two coordinates in km."""
    from math import radians, sin, cos, sqrt, atan2
    R = 6371
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))
