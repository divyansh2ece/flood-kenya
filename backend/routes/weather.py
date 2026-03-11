"""
Weather data from Open-Meteo — completely free, no API key.
Returns CURRENT rainfall and 6-hour forecast for any Kenya county.
"""

import httpx
from fastapi import APIRouter, HTTPException
from services.geocoding import COUNTY_COORDS, get_coords_for_county

router = APIRouter(prefix="/weather", tags=["weather"])

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def classify_flood_risk(rainfall_mm_per_hr: float) -> str:
    if rainfall_mm_per_hr >= 20:
        return "high"
    elif rainfall_mm_per_hr >= 7.5:
        return "moderate"
    return "low"


@router.get("/{county}")
async def get_weather_for_county(county: str):
    coords = get_coords_for_county(county)
    if not coords:
        raise HTTPException(status_code=404, detail=f"County '{county}' not found")

    lat, lng = coords

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(OPEN_METEO_URL, params={
                "latitude":   lat,
                "longitude":  lng,
                # 'current' gives actual real-time values, not hourly[0]
                "current":    "precipitation,wind_speed_10m,weather_code",
                "hourly":     "precipitation,precipitation_probability",
                "forecast_days": 1,
                "timezone":   "Africa/Nairobi",
            })
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=503, detail=f"Weather API unavailable: {e}")

    # ── Current conditions (real-time, not hourly[0]) ──────────
    current        = data.get("current", {})
    current_rainfall = float(current.get("precipitation", 0.0))
    current_wind     = float(current.get("wind_speed_10m", 0.0))

    # ── Hourly forecast (next 6 hours from now) ────────────────
    hourly      = data.get("hourly", {})
    times       = hourly.get("time", [])
    precip      = hourly.get("precipitation", [])
    prob        = hourly.get("precipitation_probability", [])

    # Find current hour index in the hourly array
    current_time_str = current.get("time", "")
    current_idx = 0
    if current_time_str and times:
        try:
            current_idx = times.index(current_time_str)
        except ValueError:
            current_idx = 0

    # Take next 6 hours from current
    forecast = []
    for i in range(current_idx, min(current_idx + 6, len(times))):
        forecast.append({
            "time":                      times[i],
            "precipitation_mm":          precip[i] if i < len(precip) else 0.0,
            "precipitation_probability": prob[i]   if i < len(prob)   else 0,
        })

    return {
        "county":              county,
        "lat":                 lat,
        "lng":                 lng,
        "current_rainfall_mm": current_rainfall,
        "current_wind_kmh":    current_wind,
        "flood_risk":          classify_flood_risk(current_rainfall),
        "hourly_forecast":     forecast,
    }


@router.get("/")
async def get_all_counties_weather():
    """Returns flood risk for all Kenya counties — map overlay."""
    results = []
    async with httpx.AsyncClient(timeout=20.0) as client:
        for county, (lat, lng) in COUNTY_COORDS.items():
            try:
                resp = await client.get(OPEN_METEO_URL, params={
                    "latitude":  lat,
                    "longitude": lng,
                    "current":   "precipitation",
                    "timezone":  "Africa/Nairobi",
                })
                resp.raise_for_status()
                data = resp.json()
                rainfall = float(data.get("current", {}).get("precipitation", 0.0))
                results.append({
                    "county":      county,
                    "lat":         lat,
                    "lng":         lng,
                    "rainfall_mm": rainfall,
                    "flood_risk":  classify_flood_risk(rainfall),
                })
            except Exception:
                results.append({
                    "county": county, "lat": lat, "lng": lng,
                    "rainfall_mm": 0.0, "flood_risk": "unknown",
                })
    return results
