"""
Telegram Bot — Flood Kenya
Fixed: runs in its own daemon thread + event loop (no conflict with uvicorn)
Features: inline keyboards, guided report flow, mini app button, shelter search
"""

import os
import asyncio
import logging
import threading
import httpx

from telegram import (
    Update, InlineKeyboardMarkup, InlineKeyboardButton,
    ReplyKeyboardMarkup, KeyboardButton, WebAppInfo,
)
from telegram.ext import (
    Application, CommandHandler, MessageHandler, CallbackQueryHandler,
    filters, ContextTypes, ConversationHandler,
)

log = logging.getLogger(__name__)
API_BASE     = os.getenv("API_BASE_URL", "http://localhost:8000")
MINI_APP_URL = os.getenv("MINI_APP_URL", "")   # set after deploy to Render

# ── Conversation states ────────────────────────────────────────
CHOOSING, REPORT_LOCATION, REPORT_SEVERITY, REPORT_DETAILS = range(4)

# ── Emergency contacts ─────────────────────────────────────────
EMERGENCY_TEXT = (
    "🆘 *Namba za Dharura / Emergency Contacts*\n\n"
    "🔴 Kenya Red Cross: *0800 723 000* _(bure/free)_\n"
    "🚨 Kenya Police: *999* au/or *112*\n"
    "🏥 Medical Emergency: *0800 720 021*\n"
    "🌊 NDMA Disasters: *+254 20 2737985*\n"
    "🌦 Meteorological: *+254 20 3867880*"
)

# ── Shared keyboard builders ────────────────────────────────────
def main_menu_keyboard(include_webapp: bool = False) -> InlineKeyboardMarkup:
    rows = [
        [
            InlineKeyboardButton("📝 Toa Ripoti / Report",  callback_data="menu_report"),
            InlineKeyboardButton("🏠 Makazi / Shelter",      callback_data="menu_shelter"),
        ],
        [
            InlineKeyboardButton("🌦 Hewa / Weather",        callback_data="menu_weather"),
            InlineKeyboardButton("🆘 Dharura / Emergency",   callback_data="menu_emergency"),
        ],
    ]
    if include_webapp and MINI_APP_URL:
        rows.append([
            InlineKeyboardButton("🗺️ Open FloodWatch Dashboard", web_app=WebAppInfo(url=MINI_APP_URL))
        ])
    elif MINI_APP_URL:
        rows.append([
            InlineKeyboardButton("🗺️ Open FloodWatch Dashboard", web_app=WebAppInfo(url=MINI_APP_URL))
        ])
    return InlineKeyboardMarkup(rows)


def severity_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("🟢 1 - Onyo/Watch",       callback_data="sev_1"),
            InlineKeyboardButton("🟡 2 - Wastani/Moderate", callback_data="sev_2"),
        ],
        [
            InlineKeyboardButton("🟠 3 - Kali/Severe",      callback_data="sev_3"),
            InlineKeyboardButton("🔴 4 - Hatari/Critical",  callback_data="sev_4"),
        ],
        [
            InlineKeyboardButton("⛔ 5 - Dharura/Emergency (people trapped)", callback_data="sev_5"),
        ],
        [InlineKeyboardButton("❌ Cancel", callback_data="cancel")],
    ])


def water_level_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("👣 Kifundo / Ankle",  callback_data="wl_ankle"),
            InlineKeyboardButton("🦵 Magoti / Knee",    callback_data="wl_knee"),
        ],
        [
            InlineKeyboardButton("⬆️ Kiuno / Waist",   callback_data="wl_waist"),
            InlineKeyboardButton("💪 Bega / Shoulder",  callback_data="wl_shoulder"),
        ],
        [
            InlineKeyboardButton("🚨 Kichwa / Head — CRITICAL", callback_data="wl_head"),
        ],
        [InlineKeyboardButton("⏭ Skip / Ruka", callback_data="wl_skip")],
    ])


def location_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        [[KeyboardButton("📍 Shiriki Eneo Langu / Share My Location", request_location=True)]],
        one_time_keyboard=True, resize_keyboard=True,
    )


# ── Helper: post report to backend ─────────────────────────────
async def _post_report(data: dict) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(f"{API_BASE}/reports/", json=data)
            r.raise_for_status()
            return r.json()
    except Exception as e:
        log.error("Report post failed: %s", e)
        return None


async def _get_shelters(lat: float, lng: float) -> list:
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"{API_BASE}/shelters/nearby", params={"lat": lat, "lng": lng, "limit": 3})
            r.raise_for_status()
            return r.json()
    except Exception:
        return []


async def _get_weather(county: str) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"{API_BASE}/weather/{county}")
            r.raise_for_status()
            return r.json()
    except Exception:
        return None


# ── /start ─────────────────────────────────────────────────────
async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_name = update.effective_user.first_name or "rafiki"
    text = (
        f"🌊 *Karibu FloodWatch Kenya, {user_name}!*\n"
        f"_Welcome to FloodWatch Kenya!_\n\n"
        f"Mfumo huu unasaidia kutoa na kupokea taarifa za mafuriko kwa wakati halisi.\n"
        f"_This system helps report and receive real-time flood information._\n\n"
        f"Chagua chaguo hapa chini 👇\n"
        f"_Select an option below_ 👇"
    )
    await update.message.reply_text(text, parse_mode="Markdown", reply_markup=main_menu_keyboard())


# ── /help ──────────────────────────────────────────────────────
async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (
        "*Amri / Commands:*\n\n"
        "/start — Menyu kuu / Main menu\n"
        "/ripoti — Toa ripoti ya mafuriko / Report flood\n"
        "/makazi — Pata makazi ya karibu / Find shelters\n"
        "/hali — Hali ya hewa / Weather\n"
        "/msaada — Namba za dharura / Emergency numbers\n\n"
        "_Au tuma ujumbe moja kwa moja ukielezea mafuriko yako._\n"
        "_Or just send a free-text message describing the flood._\n\n"
        "*Mfano / Example:*\n"
        "`Kisumu mafuriko maji kiuno msaada`"
    )
    await update.message.reply_text(text, parse_mode="Markdown", reply_markup=main_menu_keyboard())


# ── /msaada ─────────────────────────────────────────────────────
async def cmd_msaada(update: Update, context: ContextTypes.DEFAULT_TYPE):
    kb = InlineKeyboardMarkup([[
        InlineKeyboardButton("📞 Call Red Cross", url="tel:0800723000"),
        InlineKeyboardButton("📞 Call Police",    url="tel:999"),
    ]])
    await update.message.reply_text(EMERGENCY_TEXT, parse_mode="Markdown", reply_markup=kb)


# ── /makazi ────────────────────────────────────────────────────
async def cmd_makazi(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args
    if args:
        county = " ".join(args)
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(f"{API_BASE}/shelters/county/{county}")
                shelters = r.json()
        except Exception:
            shelters = []

        if not shelters:
            await update.message.reply_text(
                f"❌ Hakuna makazi yaliyorekodiwa kwa *{county}*.\n"
                f"No shelters recorded for *{county}* yet.\n\n"
                f"📞 Kenya Red Cross: *0800 723 000*",
                parse_mode="Markdown"
            )
            return

        text = f"🏠 *Makazi — {county}*\n\n"
        for s in shelters[:3]:
            text += f"📍 *{s['name']}* ({s['type']})\n📞 {s.get('contact','N/A')}\n\n"
        await update.message.reply_text(text, parse_mode="Markdown")
    else:
        await update.message.reply_text(
            "📍 *Shiriki eneo lako kupata makazi ya karibu.*\n"
            "_Share your location to find nearest shelters._",
            parse_mode="Markdown",
            reply_markup=location_keyboard(),
        )


# ── /hali ──────────────────────────────────────────────────────
async def cmd_hali(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args
    county = " ".join(args) if args else "Nairobi"
    county = county.title()
    weather = await _get_weather(county)

    if not weather:
        await update.message.reply_text(
            f"❌ Hali ya hewa haipatikani kwa *{county}*.\n"
            f"Weather unavailable for *{county}*.\n\n"
            f"Jaribu: /hali Kisumu, /hali Nairobi, /hali Mombasa",
            parse_mode="Markdown"
        )
        return

    risk_icon = {"low": "🟢", "moderate": "🟡", "high": "🔴"}.get(weather["flood_risk"], "⚪")
    risk_sw   = {"low": "Chini", "moderate": "Wastani", "high": "JUU"}.get(weather["flood_risk"], "?")

    text = (
        f"🌦 *Hali ya Hewa — {county}*\n\n"
        f"💧 Mvua sasa: *{weather['current_rainfall_mm']:.1f} mm/hr*\n"
        f"{risk_icon} Hatari ya Mafuriko: *{risk_sw}*\n\n"
        f"*Masaa 6 yajayo / Next 6 hours:*\n"
    )
    for h in weather.get("hourly_forecast", [])[:6]:
        t = h["time"].split("T")[1][:5] if "T" in h["time"] else h["time"]
        text += f"  `{t}` — {h['precipitation_mm']:.1f}mm ({h.get('precipitation_probability',0)}%)\n"

    await update.message.reply_text(text, parse_mode="Markdown", reply_markup=main_menu_keyboard())


# ── Conversation: Guided flood report ─────────────────────────

async def conv_start_report(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Entry: ask for location"""
    query = update.callback_query
    if query:
        await query.answer()
        msg = query.message
    else:
        msg = update.message

    text = (
        "📝 *Toa Ripoti / Submit Flood Report*\n\n"
        "*Hatua 1/3 — Mahali / Location*\n\n"
        "Tuma jina la mahali ulipo au shiriki eneo lako.\n"
        "_Send the location name or share your GPS._\n\n"
        "*Mfano:* `Kisumu CBD` au `Westlands, Nairobi`"
    )
    if query:
        await msg.reply_text(text, parse_mode="Markdown", reply_markup=location_keyboard())
    else:
        await msg.reply_text(text, parse_mode="Markdown", reply_markup=location_keyboard())

    return REPORT_LOCATION


async def conv_got_location_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Got location as text"""
    context.user_data["location"] = update.message.text
    context.user_data["lat"]      = None
    context.user_data["lng"]      = None
    return await _ask_severity(update, context)


async def conv_got_location_gps(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Got location as GPS"""
    loc = update.message.location
    context.user_data["lat"]      = loc.latitude
    context.user_data["lng"]      = loc.longitude
    context.user_data["location"] = f"{loc.latitude:.4f},{loc.longitude:.4f}"
    return await _ask_severity(update, context)


async def _ask_severity(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (
        "✅ Mahali/Location: *" + context.user_data.get("location", "?") + "*\n\n"
        "*Hatua 2/3 — Kiwango cha Hatari / Severity*\n\n"
        "Chagua kiwango cha mafuriko:\n"
        "_Select the severity level:_"
    )
    await update.message.reply_text(
        text, parse_mode="Markdown",
        reply_markup=severity_keyboard(),
    )
    return REPORT_SEVERITY


async def conv_got_severity(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    severity = int(query.data.split("_")[1])
    context.user_data["severity"] = severity

    sev_labels = {1:"🟢 Usalama/Watch", 2:"🟡 Onyo/Moderate", 3:"🟠 Kali/Severe", 4:"🔴 Hatari/Critical", 5:"⛔ Dharura/Emergency"}
    text = (
        f"✅ Kiwango: *{sev_labels[severity]}*\n\n"
        "*Hatua 3/3 — Kiwango cha Maji / Water Level*\n\n"
        "Maji yanafikia wapi?\n"
        "_How high is the water?_"
    )
    await query.message.reply_text(text, parse_mode="Markdown", reply_markup=water_level_keyboard())
    return REPORT_DETAILS


async def conv_got_water_level(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    water_level = None if query.data == "wl_skip" else query.data.split("_")[1]
    context.user_data["water_level"] = water_level

    needs_rescue = context.user_data.get("severity", 1) >= 4

    reporter = f"@{query.from_user.username}" if query.from_user.username else str(query.from_user.id)

    payload = {
        "source":           "telegram",
        "language":         "sw",
        "location":         context.user_data.get("location"),
        "lat":              context.user_data.get("lat"),
        "lng":              context.user_data.get("lng"),
        "severity":         context.user_data.get("severity", 2),
        "water_level":      water_level,
        "needs_rescue":     needs_rescue,
        "reporter_contact": reporter,
    }

    await query.message.reply_text("⏳ Inahifadhi ripoti... / Saving report...")
    result = await _post_report(payload)

    if not result:
        await query.message.reply_text(
            "❌ Imeshindwa kuhifadhi. Jaribu tena.\n_Failed to save. Please try again._",
            parse_mode="Markdown"
        )
        return ConversationHandler.END

    sev = context.user_data.get("severity", 2)
    sev_labels = {1:"Usalama", 2:"Onyo", 3:"Kali", 4:"Hatari Sana", 5:"Dharura"}
    wl_labels  = {"ankle":"Kifundo", "knee":"Magoti", "waist":"Kiuno", "shoulder":"Bega", "head":"Kichwa"}
    wl_text    = wl_labels.get(water_level, "—") if water_level else "—"

    response = (
        f"✅ *Ripoti Imehifadhiwa! / Report Saved!*\n\n"
        f"📍 Mahali: *{context.user_data.get('location','?')}*\n"
        f"⚠️ Kiwango: *{sev_labels[sev]}* ({sev}/5)\n"
        f"💧 Maji: *{wl_text}*\n"
    )
    if needs_rescue:
        response += f"\n🆘 *Timu ya uokoaji imeaarifiwa! / Rescue team notified!*\n"

    response += "\n⬆️ *Nenda mahali pa juu! / Move to higher ground!*\n"
    response += "📞 Dharura/Emergency: *0800 723 000*"

    context.user_data.clear()
    await query.message.reply_text(response, parse_mode="Markdown", reply_markup=main_menu_keyboard())
    return ConversationHandler.END


async def conv_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if query:
        await query.answer()
        await query.message.reply_text("❌ Imeghairiwa / Cancelled.", reply_markup=main_menu_keyboard())
    else:
        await update.message.reply_text("❌ Imeghairiwa / Cancelled.", reply_markup=main_menu_keyboard())
    context.user_data.clear()
    return ConversationHandler.END


# ── Inline button dispatcher ────────────────────────────────────
async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data

    if data == "menu_report":
        # Trigger report conversation
        context.user_data.clear()
        text = (
            "📝 *Toa Ripoti / Submit Flood Report*\n\n"
            "*Hatua 1/3 — Mahali / Location*\n\n"
            "Tuma jina la mahali ulipo au shiriki eneo lako.\n"
            "_Send the location name or share your GPS._\n\n"
            "*Mfano:* `Kisumu CBD`"
        )
        await query.message.reply_text(text, parse_mode="Markdown", reply_markup=location_keyboard())
        context.user_data["in_report"] = True
        context.user_data["step"] = "location"

    elif data == "menu_shelter":
        await query.message.reply_text(
            "🏠 *Pata Makazi / Find Shelter*\n\n"
            "Shiriki eneo lako au tuma jina la kaunti.\n"
            "_Share your location or send a county name._\n\n"
            "*Mfano:* `Kisumu` au `Nairobi`",
            parse_mode="Markdown",
            reply_markup=location_keyboard(),
        )
        context.user_data["want_shelter"] = True

    elif data == "menu_weather":
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton(c, callback_data=f"wx_{c}") for c in ["Nairobi", "Kisumu"]],
            [InlineKeyboardButton(c, callback_data=f"wx_{c}") for c in ["Mombasa", "Nakuru"]],
            [InlineKeyboardButton(c, callback_data=f"wx_{c}") for c in ["Garissa", "Eldoret"]],
        ])
        await query.message.reply_text(
            "🌦 *Chagua Kaunti / Select County:*",
            parse_mode="Markdown",
            reply_markup=kb,
        )

    elif data.startswith("wx_"):
        county = data[3:]
        weather = await _get_weather(county)
        if weather:
            risk_icon = {"low": "🟢", "moderate": "🟡", "high": "🔴"}.get(weather["flood_risk"], "⚪")
            text = (
                f"🌦 *{county}*\n"
                f"💧 {weather['current_rainfall_mm']:.1f} mm/hr  {risk_icon}\n"
            )
            for h in weather.get("hourly_forecast", [])[:4]:
                t = h["time"].split("T")[1][:5] if "T" in h["time"] else h["time"]
                text += f"`{t}` {h['precipitation_mm']:.1f}mm  "
        else:
            text = f"❌ Hali ya hewa haipatikani / Unavailable for {county}"
        await query.message.reply_text(text, parse_mode="Markdown", reply_markup=main_menu_keyboard())

    elif data == "menu_emergency":
        kb = InlineKeyboardMarkup([[
            InlineKeyboardButton("📞 Red Cross", url="tel:0800723000"),
            InlineKeyboardButton("📞 Police 999", url="tel:999"),
        ]])
        await query.message.reply_text(EMERGENCY_TEXT, parse_mode="Markdown", reply_markup=kb)


# ── Free-text message handler ────────────────────────────────────
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    user = update.effective_user
    reporter = f"@{user.username}" if user.username else str(user.id)

    # Handle in-progress guided report
    if context.user_data.get("in_report") and context.user_data.get("step") == "location":
        context.user_data["location"] = text
        context.user_data["lat"] = None
        context.user_data["lng"] = None
        context.user_data["step"] = "severity"
        await update.message.reply_text(
            f"✅ Mahali: *{text}*\n\n*Chagua kiwango cha hatari / Select severity:*",
            parse_mode="Markdown",
            reply_markup=severity_keyboard(),
        )
        return

    # Handle shelter search by text
    if context.user_data.get("want_shelter"):
        context.user_data.pop("want_shelter", None)
        county = text.title()
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(f"{API_BASE}/shelters/county/{county}")
                shelters = r.json()
        except Exception:
            shelters = []

        if shelters:
            msg = f"🏠 *Makazi — {county}*\n\n"
            for s in shelters[:3]:
                msg += f"📍 *{s['name']}*\n📞 {s.get('contact','N/A')}\n\n"
        else:
            msg = f"❌ Hakuna makazi kwa *{county}*.\nKall Red Cross: *0800 723 000*"
        await update.message.reply_text(msg, parse_mode="Markdown", reply_markup=main_menu_keyboard())
        return

    # Auto-parse as flood report
    from services.swahili_parser import parse_report
    parsed = parse_report(text)

    if not parsed.is_flood_report:
        await update.message.reply_text(
            "Sijui ujumbe huu. / I don't understand.\n\n"
            "Tuma taarifa ya mafuriko au tumia menyu hapa chini. 👇\n"
            "_Send a flood report or use the menu below._",
            reply_markup=main_menu_keyboard(),
        )
        return

    msg = await update.message.reply_text("⏳ Inahifadhi... / Saving...")

    payload = {
        "source":           "telegram",
        "language":         parsed.language,
        "raw_message":      text,
        "location":         parsed.location,
        "county":           parsed.county,
        "severity":         parsed.severity,
        "water_level":      parsed.water_level,
        "needs_rescue":     parsed.needs_rescue,
        "infrastructure":   parsed.infrastructure,
        "reporter_contact": reporter,
    }

    result = await _post_report(payload)

    if not result:
        await msg.edit_text("❌ Imeshindwa kuhifadhi. Jaribu tena.\n_Failed to save._")
        return

    sev = parsed.severity
    sev_labels = {1:"🟢 Usalama",2:"🟡 Onyo",3:"🟠 Kali",4:"🔴 Hatari Sana",5:"⛔ Dharura"}
    loc = parsed.location or parsed.county or "Kenya"

    response = (
        f"✅ *Ripoti Imehifadhiwa!*\n\n"
        f"📍 *{loc}*\n"
        f"⚠️ {sev_labels.get(sev,'?')} ({sev}/5)\n"
    )
    if parsed.water_level:
        wl_map = {"ankle":"Kifundo","knee":"Magoti","waist":"Kiuno","shoulder":"Bega","head":"Kichwa"}
        response += f"💧 {wl_map.get(parsed.water_level, parsed.water_level)}\n"
    if parsed.needs_rescue:
        response += "🆘 *Timu ya uokoaji imeaarifiwa!*\n"
    if parsed.infrastructure:
        response += f"🏗️ {', '.join(parsed.infrastructure)}\n"
    response += "\n⬆️ *Nenda JUU ya ardhi! Move to higher ground!*\n📞 *0800 723 000*"

    await msg.edit_text(response, parse_mode="Markdown")
    await update.message.reply_text("Chaguo zaidi / More options:", reply_markup=main_menu_keyboard())


# ── Location sharing handler ────────────────────────────────────
async def handle_location(update: Update, context: ContextTypes.DEFAULT_TYPE):
    loc = update.message.location
    lat, lng = loc.latitude, loc.longitude

    # In-progress report
    if context.user_data.get("in_report") and context.user_data.get("step") == "location":
        context.user_data["lat"]      = lat
        context.user_data["lng"]      = lng
        context.user_data["location"] = f"{lat:.4f},{lng:.4f}"
        context.user_data["step"]     = "severity"
        await update.message.reply_text(
            f"✅ GPS: *{lat:.4f}, {lng:.4f}*\n\n*Chagua kiwango cha hatari / Select severity:*",
            parse_mode="Markdown",
            reply_markup=severity_keyboard(),
        )
        return

    # Shelter search
    shelters = await _get_shelters(lat, lng)
    if not shelters:
        await update.message.reply_text(
            "❌ Hakuna makazi karibu nawe.\n_No recorded shelters near you._\n\n📞 *0800 723 000*",
            parse_mode="Markdown"
        )
        return

    text = "🏠 *Makazi ya Karibu Nawe / Nearest Shelters:*\n\n"
    for s in shelters:
        text += (
            f"📍 *{s['name']}* — {s['distance_km']} km\n"
            f"   {s['type']} | 📞 {s.get('contact','N/A')}\n\n"
        )
    text += "🙏 *Kaa salama! Stay safe!*"
    await update.message.reply_text(text, parse_mode="Markdown", reply_markup=main_menu_keyboard())


# ── Severity callback within conversation fallback ──────────────
async def handle_sev_callback_in_flow(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle severity selection when coming from the inline menu flow (not conversation)"""
    query = update.callback_query
    if not query.data.startswith("sev_"):
        return
    await query.answer()
    sev = int(query.data.split("_")[1])
    context.user_data["severity"] = sev
    context.user_data["step"] = "water_level"
    await query.message.reply_text(
        f"✅ Kiwango {sev}/5\n\n*Maji yanafikia wapi? / Water level?*",
        parse_mode="Markdown",
        reply_markup=water_level_keyboard(),
    )


async def handle_wl_callback_in_flow(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle water level selection in the inline menu flow"""
    query = update.callback_query
    if not query.data.startswith("wl_"):
        return
    await query.answer()
    water_level = None if query.data == "wl_skip" else query.data.split("_")[1]

    reporter = f"@{query.from_user.username}" if query.from_user.username else str(query.from_user.id)
    sev = context.user_data.get("severity", 2)

    payload = {
        "source":           "telegram",
        "language":         "sw",
        "location":         context.user_data.get("location"),
        "lat":              context.user_data.get("lat"),
        "lng":              context.user_data.get("lng"),
        "severity":         sev,
        "water_level":      water_level,
        "needs_rescue":     sev >= 4,
        "reporter_contact": reporter,
    }

    await query.message.reply_text("⏳ Inahifadhi... / Saving...")
    result = await _post_report(payload)

    sev_labels = {1:"🟢 Usalama",2:"🟡 Onyo",3:"🟠 Kali",4:"🔴 Hatari Sana",5:"⛔ Dharura"}
    if result:
        response = (
            f"✅ *Ripoti Imehifadhiwa!*\n"
            f"📍 {context.user_data.get('location','?')}\n"
            f"⚠️ {sev_labels.get(sev,'?')}\n"
        )
        if sev >= 4:
            response += "🆘 *Timu ya uokoaji imeaarifiwa!*\n"
        response += "\n📞 *0800 723 000* (Red Cross)"
    else:
        response = "❌ Imeshindwa. Jaribu tena. / Failed. Try again."

    context.user_data.clear()
    await query.message.reply_text(response, parse_mode="Markdown", reply_markup=main_menu_keyboard())


# ── Bot entry point (run in own thread) ────────────────────────

def _run_bot_sync(token: str):
    """
    Runs in a daemon thread with its own standard asyncio event loop.
    MUST use asyncio.new_event_loop() explicitly — uvicorn installs uvloop as the
    global event loop policy, which bleeds into new threads and causes
    'this event loop is already running' errors inside PTB's run_polling().
    Forcing a plain asyncio loop in this thread sidesteps that entirely.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def _main():
        application = Application.builder().token(token).build()

        # Commands
        application.add_handler(CommandHandler("start",     cmd_start))
        application.add_handler(CommandHandler("help",      cmd_help))
        application.add_handler(CommandHandler("ripoti",    conv_start_report))
        application.add_handler(CommandHandler("report",    conv_start_report))
        application.add_handler(CommandHandler("makazi",    cmd_makazi))
        application.add_handler(CommandHandler("shelters",  cmd_makazi))
        application.add_handler(CommandHandler("hali",      cmd_hali))
        application.add_handler(CommandHandler("weather",   cmd_hali))
        application.add_handler(CommandHandler("msaada",    cmd_msaada))
        application.add_handler(CommandHandler("emergency", cmd_msaada))

        # Location sharing
        application.add_handler(MessageHandler(filters.LOCATION, handle_location))

        # Inline button callbacks
        application.add_handler(CallbackQueryHandler(handle_callback, pattern="^(menu_|wx_)"))
        application.add_handler(CallbackQueryHandler(handle_sev_callback_in_flow, pattern="^sev_"))
        application.add_handler(CallbackQueryHandler(handle_wl_callback_in_flow,  pattern="^wl_"))
        application.add_handler(CallbackQueryHandler(conv_cancel,                  pattern="^cancel$"))

        # Free-text (flood reports)
        application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

        log.info("Bot starting polling...")
        await application.run_polling(drop_pending_updates=True, stop_signals=None)

    loop.run_until_complete(_main())
    loop.close()


def start_bot_thread(token: str) -> threading.Thread:
    t = threading.Thread(target=_run_bot_sync, args=(token,), daemon=True)
    t.start()
    log.info("Telegram bot thread started")
    return t
