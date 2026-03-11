# Flood Intelligence & Reporting System — Kenya
### Built from India, for Kenya 🇮🇳 → 🇰🇪
**Target deployment: 7 days | Cost: $0 (free tiers)**

---

## 1. Project Overview

A real-time flood intelligence and crowdsourced reporting platform built for the Kenya flood crisis (March 2026). Citizens report floods via Telegram in Swahili or English. Rescue coordinators and NGOs see a live map dashboard with severity markers, incident feeds, and weather overlays.

### Core Goal
Give rescue teams one single screen that tells them:
- Where is flooding happening right now?
- How severe is it?
- Where do people need rescue?
- What is the weather doing next?

---

## 2. Users & Their Needs

| User | Language | How They Use It |
|------|----------|-----------------|
| Citizens in flooded areas | Swahili (primary) | Telegram bot to report floods |
| Rescue team coordinators | English | Web dashboard — live map |
| NGO workers | English / Swahili | Dashboard + alerts |
| Government officials | English | Dashboard overview |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  DATA INPUT LAYER                   │
│                                                     │
│  Telegram Bot (Swahili/EN)  │  Web Report Form      │
│  Open-Meteo Weather API     │  Manual Admin Entry   │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│               PROCESSING LAYER (FastAPI)            │
│                                                     │
│  Swahili keyword parser  │  Severity calculator     │
│  Location extractor      │  Duplicate filter        │
│  Language detector       │  Alert trigger           │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│               DATABASE LAYER (Supabase)             │
│                                                     │
│  flood_reports table  │  shelters table             │
│  counties table       │  alerts_log table           │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│              VISUALIZATION LAYER (React)            │
│                                                     │
│  Live Map (Leaflet + OpenStreetMap)                 │
│  Incident Feed  │  Weather Panel  │  Shelter Finder │
│  Language toggle: English / Kiswahili               │
└─────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│                   ALERT LAYER                       │
│                                                     │
│  Africa's Talking SMS  │  Telegram broadcasts       │
│  Resend.com Email      │                            │
└─────────────────────────────────────────────────────┘
```

---

## 4. Free Tech Stack

| Layer | Technology | Why | Cost |
|-------|-----------|-----|------|
| Frontend | React + Vite | Fast, widely known | Free |
| Map | Leaflet.js + OpenStreetMap | No API key, unlimited | Free |
| Styling | Tailwind CSS | Fast to build responsive UI | Free |
| Backend | FastAPI (Python) | Fast, async, easy ML integration | Free |
| Database | Supabase | PostgreSQL + real-time + REST auto-generated | Free tier |
| Bot | python-telegram-bot | Telegram API is 100% free | Free |
| Weather | Open-Meteo API | No key needed, Kenya data available | Free |
| SMS Alerts | Africa's Talking | Kenya-specific, free sandbox | Free sandbox |
| Email Alerts | Resend.com | 3,000 emails/month free | Free tier |
| Frontend Host | Vercel | CI/CD included | Free tier |
| Backend Host | Render.com | Auto-deploy from GitHub | Free tier |
| i18n | react-i18next | EN/SW language toggle | Free |

---

## 5. Project Folder Structure

```
flood-kenya/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── routes/
│   │   ├── reports.py           # POST /report, GET /events
│   │   ├── weather.py           # GET /weather/:county
│   │   ├── shelters.py          # GET /shelters/:lat/:lng
│   │   └── alerts.py            # POST /alert (internal trigger)
│   ├── services/
│   │   ├── swahili_parser.py    # Keyword extraction in Swahili
│   │   ├── severity.py          # Severity score calculator
│   │   ├── deduplication.py     # Filter duplicate reports
│   │   └── notifier.py          # SMS + email alert sender
│   ├── bot/
│   │   └── telegram_bot.py      # Telegram bot handler
│   ├── models/
│   │   └── schemas.py           # Pydantic models
│   ├── db/
│   │   └── supabase_client.py   # Supabase connection
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map.jsx          # Leaflet map with flood markers
│   │   │   ├── IncidentFeed.jsx # Sidebar list of reports
│   │   │   ├── WeatherPanel.jsx # Rainfall + forecast
│   │   │   ├── ShelterFinder.jsx# Nearest shelters
│   │   │   ├── ReportForm.jsx   # Web-based report submission
│   │   │   └── LanguageToggle.jsx
│   │   ├── locales/
│   │   │   ├── en.json          # English UI strings
│   │   │   └── sw.json          # Swahili UI strings
│   │   ├── hooks/
│   │   │   └── useRealtimeReports.js  # Supabase real-time subscription
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── supabase/
│   └── schema.sql               # Full DB schema
│
├── docs/
│   └── bot-commands-sw.md       # Telegram bot commands in Swahili
│
├── PLAN.md                      # This file
└── README.md
```

---

## 6. Database Schema (Supabase / PostgreSQL)

```sql
-- Flood reports from citizens
CREATE TABLE flood_reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source      TEXT NOT NULL,          -- 'telegram', 'web', 'admin'
    language    TEXT DEFAULT 'sw',      -- 'sw' or 'en'
    raw_message TEXT,                   -- original message as sent
    location    TEXT,                   -- parsed location name
    county      TEXT,                   -- Kenya county
    lat         FLOAT,
    lng         FLOAT,
    severity    INTEGER DEFAULT 1,      -- 1 (low) to 5 (critical)
    water_level TEXT,                   -- 'knee', 'waist', 'shoulder', 'head'
    needs_rescue BOOLEAN DEFAULT false,
    infrastructure_damage TEXT,        -- 'road', 'bridge', 'house', etc.
    reporter_phone TEXT,               -- optional
    verified    BOOLEAN DEFAULT false,
    resolved    BOOLEAN DEFAULT false,
    image_url   TEXT,                  -- optional photo
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Kenya shelters and safe points
CREATE TABLE shelters (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    name_sw     TEXT,                   -- Swahili name
    type        TEXT,                   -- 'school', 'church', 'hospital', 'camp'
    county      TEXT,
    lat         FLOAT NOT NULL,
    lng         FLOAT NOT NULL,
    capacity    INTEGER,
    contact     TEXT,
    is_active   BOOLEAN DEFAULT true
);

-- Kenya counties reference table
CREATE TABLE counties (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    name_sw     TEXT,
    lat         FLOAT,
    lng         FLOAT,
    population  INTEGER
);

-- Alert log
CREATE TABLE alerts_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id   UUID REFERENCES flood_reports(id),
    channel     TEXT,                   -- 'sms', 'email', 'telegram'
    recipient   TEXT,
    message     TEXT,
    sent_at     TIMESTAMPTZ DEFAULT NOW(),
    success     BOOLEAN
);

-- Enable real-time on flood_reports
ALTER PUBLICATION supabase_realtime ADD TABLE flood_reports;
```

---

## 7. Swahili Parser (Core Logic)

```python
# backend/services/swahili_parser.py

SWAHILI_KEYWORDS = {
    # Flood terms
    "mafuriko": "flood",
    "maji": "water",
    "mvua": "rain",
    "dhoruba": "storm",
    "gharika": "inundation",
    "bwawa": "dam",
    "mto": "river",
    "ziwa": "lake",

    # Water level → severity
    "magoti": ("water_level", "knee", 2),
    "kiuno": ("water_level", "waist", 3),
    "bega": ("water_level", "shoulder", 4),
    "kichwa": ("water_level", "head", 5),

    # Urgency
    "msaada": ("flag", "rescue_needed", 4),
    "dharura": ("flag", "emergency", 5),
    "hatari": ("flag", "danger", 4),
    "haraka": ("flag", "urgent", 3),
    "watu_wamezama": ("flag", "people_drowning", 5),

    # Infrastructure
    "barabara": ("infra", "road"),
    "daraja": ("infra", "bridge"),
    "nyumba": ("infra", "house"),
    "shule": ("infra", "school"),
    "hospitali": ("infra", "hospital"),

    # Status
    "salama": ("status", "safe"),
    "imefurika": ("status", "overflowing"),
    "imeanguka": ("status", "collapsed"),
}

KENYA_COUNTIES = [
    "Nairobi", "Kisumu", "Mombasa", "Nakuru", "Eldoret",
    "Kisii", "Nyeri", "Meru", "Kakamega", "Garissa",
    "Turkana", "Kitui", "Machakos", "Kilifi", "Kwale",
    # ... all 47 counties
]

def parse_swahili_report(text: str) -> dict:
    text_lower = text.lower()
    result = {
        "is_flood_report": False,
        "severity": 1,
        "water_level": None,
        "needs_rescue": False,
        "infrastructure": [],
        "location": None,
        "language": "sw",
    }

    # Detect if flood related
    flood_terms = ["mafuriko", "maji", "mvua", "gharika", "dhoruba"]
    if any(term in text_lower for term in flood_terms):
        result["is_flood_report"] = True

    # Extract location (county names work in both languages)
    for county in KENYA_COUNTIES:
        if county.lower() in text_lower:
            result["location"] = county
            break

    # Parse keywords
    for keyword, value in SWAHILI_KEYWORDS.items():
        if keyword in text_lower:
            if isinstance(value, tuple):
                kind = value[0]
                if kind == "water_level":
                    result["water_level"] = value[1]
                    result["severity"] = max(result["severity"], value[2])
                elif kind == "flag":
                    if value[1] in ["rescue_needed", "emergency", "people_drowning"]:
                        result["needs_rescue"] = True
                    result["severity"] = max(result["severity"], value[2])
                elif kind == "infra":
                    result["infrastructure"].append(value[1])

    return result
```

---

## 8. Telegram Bot Flow

### Commands (Swahili first, English second)

| Command | Swahili | English | Action |
|---------|---------|---------|--------|
| `/ripoti` | Tuma ripoti ya mafuriko | Submit flood report | Opens guided report |
| `/makazi` | Pata makazi ya karibu | Find nearest shelter | Returns 3 nearest shelters |
| `/hali` | Hali ya hewa leo | Today's weather | Returns rainfall forecast |
| `/msaada` | Namba za dharura | Emergency numbers | Returns emergency contacts |
| `/start` | Karibu | Welcome | Intro message |

### Conversation Flow for `/ripoti`

```
Bot: Tuma ujumbe huu (Send message like this):
     "[Mahali] - [Hali ya maji] - [Unahitaji msaada?]"
     Mfano: "Kisumu - maji kiuno - msaada!"

User: "Kisumu centre, maji kiuno, daraja imeanguka, msaada!"

Bot: ✅ Ripoti imepokewa!
     📍 Mahali: Kisumu
     💧 Kiwango cha maji: Kiuno (Kali)
     🆘 Unahitaji msaada: Ndiyo
     🏗️ Uharibifu: Daraja

     Timu ya uokoaji imeaarifiwa.
     Makazi ya karibu: St. Joseph School (1.1km)
     Nenda JUU ya ardhi sasa. Kaa salama! 🙏
```

### Severity → Map Color

| Severity | Color | Swahili Label | Meaning |
|----------|-------|---------------|---------|
| 1 | Green 🟢 | Usalama | Watch |
| 2 | Yellow 🟡 | Onyo | Knee deep |
| 3 | Orange 🟠 | Kali | Waist deep |
| 4 | Red 🔴 | Hatari Sana | Shoulder deep |
| 5 | Dark Red ⚫ | Dharura | Head level / critical |

---

## 9. Frontend Dashboard Features

### Map (Main Screen)
- OpenStreetMap base tiles (free, no key)
- Flood report markers color-coded by severity
- Click marker → popup with: location, severity, time, message
- Cluster overlapping markers when zoomed out
- Kenya county boundary overlay (GeoJSON from public data)
- Real-time updates via Supabase subscription (no page refresh needed)

### Sidebar — Incident Feed
- List of all reports sorted by newest first
- Filter by: severity, county, time range (1h / 6h / 24h)
- Each card shows: location, severity badge, time ago, source (telegram/web)
- "Mark resolved" button for coordinators

### Weather Panel
- Calls Open-Meteo for each Kenya county
- Shows: current rainfall (mm/hr), 6h forecast, wind speed
- Flag counties where rainfall > 20mm/hr (flood risk)

### Shelter Finder
- Click any point on map → shows 3 nearest shelters
- Each shelter: name, type (school/hospital), distance, phone
- Data from pre-loaded OpenStreetMap + Kenya Red Cross data

### Header
- Live report counter (updates in real-time)
- Language toggle: `English | Kiswahili`
- Last updated timestamp

---

## 10. Alert System Logic

```python
# Trigger alert when:
# 1. severity >= 4 in any report
# 2. 3+ reports from same county in 30 minutes
# 3. Any report with needs_rescue = True

def should_trigger_alert(report: FloodReport, recent_reports: list) -> bool:
    if report.severity >= 4:
        return True
    if report.needs_rescue:
        return True
    county_reports = [r for r in recent_reports
                      if r.county == report.county
                      and r.created_at > now() - timedelta(minutes=30)]
    if len(county_reports) >= 3:
        return True
    return False
```

### SMS Alert Template (Bilingual)
```
⚠️ FLOOD ALERT - {County} County
Severity: {level} | Reports: {count}
Nearest shelter: {shelter_name} ({distance}km)
Emergency: 0800 723 000 (Kenya Red Cross)

⚠️ TAHADHARI - Kaunti ya {County}
Kiwango: {level_sw} | Ripoti: {count}
Makazi: {shelter_name} ({distance}km)
Dharura: 0800 723 000
```

---

## 11. APIs Used (All Free)

| API | Purpose | Key Required | Free Limit |
|-----|---------|-------------|------------|
| Open-Meteo | Rainfall + forecast for Kenya | No | Unlimited |
| Telegram Bot API | Bot messages | Bot token only | Unlimited |
| Supabase REST API | DB read/write + real-time | Project key | 500MB DB, 2GB bandwidth |
| Africa's Talking | SMS to Kenya numbers | Yes (free sandbox) | Free sandbox |
| Resend.com | Email alerts to NGOs | Yes (free) | 3,000/month |
| OpenStreetMap | Map tiles | No | Unlimited |
| Nominatim | Geocoding (text → lat/lng) | No | 1 req/sec |
| Kenya GeoJSON | County boundaries | No | Static file |

---

## 12. Day-by-Day Build Schedule

### Day 1 — Backend Foundation
- [ ] Set up Supabase project, run schema.sql
- [ ] Scaffold FastAPI project
- [ ] Build `POST /report` endpoint with Swahili parser
- [ ] Build `GET /events` endpoint with filters
- [ ] Connect Supabase client
- [ ] Test with Postman/curl

### Day 2 — Telegram Bot
- [ ] Register bot with BotFather, get token
- [ ] Build `/start`, `/ripoti`, `/makazi` handlers
- [ ] Connect bot to backend API
- [ ] Test Swahili + English report parsing
- [ ] Bot responds with nearest shelter from DB

### Day 3 — Frontend Map
- [ ] Scaffold React + Vite + Tailwind project
- [ ] Integrate Leaflet.js with OpenStreetMap
- [ ] Plot flood markers from API
- [ ] Real-time subscription via Supabase
- [ ] Severity color coding on markers

### Day 4 — Dashboard UI
- [ ] Incident feed sidebar
- [ ] Weather panel (Open-Meteo integration)
- [ ] Shelter finder (click map → nearest shelters)
- [ ] Web report submission form
- [ ] Mobile responsive layout

### Day 5 — Language Support
- [ ] Set up react-i18next
- [ ] Write all UI strings in en.json and sw.json
- [ ] Language toggle in header
- [ ] Bot responses already bilingual (from Day 2)

### Day 6 — Alerts + Admin
- [ ] Africa's Talking SMS integration
- [ ] Resend email alert integration
- [ ] Alert trigger logic in backend
- [ ] Simple admin: mark report verified/resolved
- [ ] Load Kenya shelters data into DB

### Day 7 — Deploy + Polish
- [ ] Deploy backend to Render.com
- [ ] Deploy frontend to Vercel
- [ ] Set environment variables
- [ ] Final end-to-end test (Telegram → map → alert)
- [ ] Write README with Telegram bot link
- [ ] Share with Kenya Red Cross / NGOs

---

## 13. Environment Variables

```env
# backend/.env
SUPABASE_URL=
SUPABASE_KEY=
TELEGRAM_BOT_TOKEN=
AFRICASTALKING_API_KEY=
AFRICASTALKING_USERNAME=
RESEND_API_KEY=
ALLOWED_ORIGINS=http://localhost:5173,https://your-vercel-url.vercel.app

# frontend/.env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=https://your-render-url.onrender.com
```

---

## 14. Kenya-Specific Data Sources

| Data | Source | Format | Use |
|------|--------|--------|-----|
| County boundaries | Kenya IEBC / GADM | GeoJSON | Map overlay |
| Shelter locations | Kenya Red Cross | Manual entry | Shelter finder |
| Emergency contacts | NDMA Kenya | Static list | Bot responses |
| Historical flood data | OCHA Kenya | CSV | Context |
| Hospital locations | Kenya MoH open data | CSV | Shelter finder |

### Kenya National Emergency Contacts (hardcoded in bot)
```
Kenya Red Cross: 0800 723 000 (toll-free)
NDMA (National Drought Authority): +254 20 2737985
Kenya Police Emergency: 999 / 112
Kenya Meteorological: +254 20 3867880
```

---

## 15. MVP Scope (What ships on Day 7)

**In scope:**
- Telegram bot (Swahili + English)
- Live flood map dashboard
- Web report form
- Weather panel
- Shelter finder
- SMS + email alerts
- Language toggle (EN/SW)
- Admin: mark verified/resolved

**Out of scope (Phase 2):**
- Satellite flood detection
- AI image verification
- WhatsApp bot
- Mobile app
- Historical trend analysis
- Offline mode

---

## 16. Handoff Plan (After Build)

When the system is ready:
1. Deploy with a Kenya subdomain if possible (e.g. `floodwatch.co.ke`)
2. Share Telegram bot link with:
   - Kenya Red Cross (@KenyaRedCross)
   - NDMA Kenya
   - County Emergency Response Teams
3. Post on social media with bot link for citizens to start reporting
4. No maintenance needed in short term — Render + Vercel handle uptime

---

*Built by an Indian as a rapid response to the Kenya floods of March 2026.*
*Stack: FastAPI + Supabase + React + Leaflet + Telegram*
