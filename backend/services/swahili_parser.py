"""
Swahili + English keyword parser for flood reports.
No translation API needed — keyword mapping is more reliable
for informal/emergency SMS-style messages.
"""

import re
from models.schemas import ParsedReport

# ── Kenya counties (match both Swahili and English names) ──────
KENYA_COUNTIES = [
    "nairobi", "mombasa", "kisumu", "nakuru", "eldoret",
    "kisii", "nyeri", "meru", "kakamega", "machakos",
    "kilifi", "kwale", "kitui", "garissa", "turkana",
    "mandera", "wajir", "marsabit", "isiolo", "tana river",
    "lamu", "taita taveta", "kajiado", "makueni", "nyandarua",
    "laikipia", "samburu", "trans nzoia", "uasin gishu",
    "elgeyo marakwet", "nandi", "baringo", "bomet", "kericho",
    "narok", "migori", "homa bay", "siaya", "vihiga",
    "bungoma", "busia", "west pokot", "embu", "tharaka nithi",
    "kirinyaga", "murang'a", "kiambu",
]

# Major Kenyan towns/areas (for location detection when county not mentioned)
KENYA_TOWNS = [
    "westlands", "kibera", "mathare", "kawangware", "lang'ata",
    "thika", "ruiru", "juja", "rongai", "ngong",
    "kisumu", "kondele", "mamboleo", "nyalenda", "manyatta",
    "nyali", "bamburi", "likoni", "changamwe", "mvita",
    "grogan", "gikomba", "eastleigh", "huruma", "korogocho",
    "ruaraka", "kasarani", "umoja", "donholm", "tena",
]

# ── Swahili flood vocabulary ────────────────────────────────────
# Format: keyword → (type, value, severity_boost)
#   type: 'flood_term' | 'water_level' | 'urgency' | 'infra' | 'status'

SWAHILI_MAP: dict[str, tuple] = {
    # Flood/water terms (marks as flood report)
    "mafuriko":       ("flood_term", "flood",       0),
    "gharika":        ("flood_term", "inundation",  0),
    "mto umefurika":  ("flood_term", "river_overflow", 0),
    "bwawa":          ("flood_term", "dam",         0),
    "mto":            ("flood_term", "river",       0),
    "mvua":           ("flood_term", "rain",        0),
    "dhoruba":        ("flood_term", "storm",       0),
    "maji mengi":     ("flood_term", "flooding",    0),
    "imefurika":      ("flood_term", "overflowing", 0),

    # Water level → severity
    "magoti":         ("water_level", "knee",       2),
    "goti":           ("water_level", "knee",       2),
    "kiuno":          ("water_level", "waist",      3),
    "bega":           ("water_level", "shoulder",   4),
    "kichwa":         ("water_level", "head",       5),
    "shingo":         ("water_level", "neck",       5),

    # Urgency / rescue flags
    "msaada":         ("urgency", "rescue_needed",  4),
    "dharura":        ("urgency", "emergency",      5),
    "hatari":         ("urgency", "danger",         4),
    "haraka":         ("urgency", "urgent",         3),
    "tunaomba msaada":("urgency", "rescue_needed",  5),
    "tunazama":       ("urgency", "drowning",       5),
    "watu wamezama":  ("urgency", "drowning",       5),
    "wamepotea":      ("urgency", "missing_people", 4),
    "amepotea":       ("urgency", "missing_person", 4),
    "watu wamenaswa": ("urgency", "people_trapped", 5),

    # Infrastructure damage
    "barabara":       ("infra", "road",     0),
    "daraja":         ("infra", "bridge",   0),
    "nyumba":         ("infra", "house",    0),
    "nyumba imeanguka":("infra","collapsed_house", 0),
    "shule":          ("infra", "school",   0),
    "hospitali":      ("infra", "hospital", 0),
    "kanisa":         ("infra", "church",   0),
    "soko":           ("infra", "market",   0),
    "imeanguka":      ("infra", "collapsed", 0),
    "imezama":        ("infra", "submerged", 0),

    # Status
    "salama":         ("status", "safe",    0),
    "watu wameokolewa":("status","rescued",  0),
    "tunahitaji chakula":("urgency","food_needed", 3),
    "tunahitaji maji":("urgency", "water_needed", 3),
}

# ── English flood keywords (for bilingual support) ─────────────
ENGLISH_FLOOD_TERMS = [
    "flood", "flooding", "flooded", "submerged", "inundated",
    "overflow", "overflowing", "river burst", "dam burst",
    "heavy rain", "flash flood", "waterlogged",
]

ENGLISH_URGENCY = {
    "rescue": ("urgency", "rescue_needed", 4),
    "help":   ("urgency", "rescue_needed", 3),
    "emergency": ("urgency", "emergency", 5),
    "trapped": ("urgency", "people_trapped", 5),
    "drowning": ("urgency", "drowning", 5),
    "missing": ("urgency", "missing_people", 4),
    "stranded": ("urgency", "stranded", 4),
}

ENGLISH_WATER_LEVELS = {
    "knee":     ("water_level", "knee",     2),
    "waist":    ("water_level", "waist",    3),
    "shoulder": ("water_level", "shoulder", 4),
    "head":     ("water_level", "head",     5),
    "neck":     ("water_level", "neck",     5),
    "ankle":    ("water_level", "ankle",    1),
    "chest":    ("water_level", "shoulder", 4),
}


def detect_language(text: str) -> str:
    text_lower = text.lower()
    swahili_markers = list(SWAHILI_MAP.keys())
    hits = sum(1 for word in swahili_markers if word in text_lower)
    return "sw" if hits >= 1 else "en"


def extract_location(text: str) -> tuple[str | None, str | None]:
    """Returns (location_name, county_name)"""
    text_lower = text.lower()

    # Try county match first
    for county in KENYA_COUNTIES:
        if county in text_lower:
            return county.title(), county.title()

    # Try town match
    for town in KENYA_TOWNS:
        if town in text_lower:
            return town.title(), None

    return None, None


def parse_report(text: str) -> ParsedReport:
    text_lower = text.lower().strip()
    lang = detect_language(text)

    result = ParsedReport(
        is_flood_report=False,
        severity=1,
        water_level=None,
        needs_rescue=False,
        infrastructure=[],
        location=None,
        county=None,
        language=lang,
    )

    # ── Detect if flood-related ────────────────────────────────
    sw_flood_terms = [k for k, v in SWAHILI_MAP.items() if v[0] == "flood_term"]
    if any(term in text_lower for term in sw_flood_terms):
        result.is_flood_report = True
    if any(term in text_lower for term in ENGLISH_FLOOD_TERMS):
        result.is_flood_report = True

    # ── Extract location ───────────────────────────────────────
    location, county = extract_location(text)
    result.location = location
    result.county = county

    # ── Parse Swahili keywords ─────────────────────────────────
    for keyword, (kind, value, boost) in SWAHILI_MAP.items():
        if keyword in text_lower:
            if kind == "water_level":
                result.water_level = value
                result.severity = max(result.severity, boost)
            elif kind == "urgency":
                if value in ("rescue_needed", "emergency", "drowning", "people_trapped"):
                    result.needs_rescue = True
                result.severity = max(result.severity, boost)
                result.is_flood_report = True
            elif kind == "infra":
                if value not in result.infrastructure:
                    result.infrastructure.append(value)
            elif kind == "flood_term":
                result.is_flood_report = True

    # ── Parse English keywords ─────────────────────────────────
    for keyword, (kind, value, boost) in ENGLISH_URGENCY.items():
        if keyword in text_lower:
            result.needs_rescue = True
            result.severity = max(result.severity, boost)
            result.is_flood_report = True

    for keyword, (kind, value, boost) in ENGLISH_WATER_LEVELS.items():
        if keyword in text_lower:
            result.water_level = value
            result.severity = max(result.severity, boost)

    # ── Minimum severity if flood confirmed ───────────────────
    if result.is_flood_report and result.severity < 2:
        result.severity = 2

    return result


def severity_label(severity: int, language: str = "sw") -> str:
    labels = {
        "sw": {1: "Usalama", 2: "Onyo", 3: "Kali", 4: "Hatari Sana", 5: "Dharura"},
        "en": {1: "Watch", 2: "Moderate", 3: "Severe", 4: "Critical", 5: "Emergency"},
    }
    return labels.get(language, labels["en"]).get(severity, "Unknown")
