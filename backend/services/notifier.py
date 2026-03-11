"""
Alert notifications via SMS (Africa's Talking) and Email (Resend).
All functions fail silently if keys are not configured —
so the system works without them during development.
"""

import os
import logging
from datetime import datetime

log = logging.getLogger(__name__)


def _build_alert_message(county: str, severity: int, report_count: int,
                         shelter_name: str | None, shelter_dist: float | None) -> str:
    sev_labels_en = {1: "Watch", 2: "Moderate", 3: "Severe", 4: "Critical", 5: "Emergency"}
    sev_labels_sw = {1: "Usalama", 2: "Onyo", 3: "Kali", 4: "Hatari Sana", 5: "Dharura"}
    level_en = sev_labels_en.get(severity, "Unknown")
    level_sw = sev_labels_sw.get(severity, "Sijui")

    shelter_en = f"Nearest shelter: {shelter_name} ({shelter_dist:.1f}km)" if shelter_name else ""
    shelter_sw = f"Makazi ya karibu: {shelter_name} ({shelter_dist:.1f}km)" if shelter_name else ""

    return (
        f"FLOOD ALERT - {county} County\n"
        f"Level: {level_en} | Reports: {report_count}\n"
        f"{shelter_en}\n"
        f"Emergency: 0800 723 000\n\n"
        f"TAHADHARI YA MAFURIKO - Kaunti ya {county}\n"
        f"Kiwango: {level_sw} | Ripoti: {report_count}\n"
        f"{shelter_sw}\n"
        f"Dharura: 0800 723 000"
    ).strip()


async def send_sms_alert(phone: str, county: str, severity: int,
                         report_count: int, shelter_name: str | None = None,
                         shelter_dist: float | None = None) -> bool:
    username = os.getenv("AFRICASTALKING_USERNAME")
    api_key = os.getenv("AFRICASTALKING_API_KEY")

    if not username or not api_key:
        log.warning("Africa's Talking not configured — SMS not sent")
        return False

    try:
        import africastalking
        africastalking.initialize(username, api_key)
        sms = africastalking.SMS
        message = _build_alert_message(county, severity, report_count, shelter_name, shelter_dist)
        response = sms.send(message, [phone])
        log.info("SMS sent to %s: %s", phone, response)
        return True
    except Exception as e:
        log.error("SMS send failed: %s", e)
        return False


async def send_email_alert(county: str, severity: int, report_count: int,
                           shelter_name: str | None = None,
                           shelter_dist: float | None = None) -> bool:
    api_key = os.getenv("RESEND_API_KEY")
    to_email = os.getenv("ALERT_EMAIL_TO")

    if not api_key or not to_email:
        log.warning("Resend not configured — email not sent")
        return False

    try:
        import resend
        resend.api_key = api_key
        message = _build_alert_message(county, severity, report_count, shelter_name, shelter_dist)

        resend.Emails.send({
            "from": "FloodWatch Kenya <alerts@floodwatch.ke>",
            "to": [to_email],
            "subject": f"⚠️ Flood Alert — {county} County (Severity {severity}/5)",
            "text": message,
            "html": message.replace("\n", "<br>"),
        })
        log.info("Email alert sent for %s county", county)
        return True
    except Exception as e:
        log.error("Email send failed: %s", e)
        return False


async def log_alert(supabase, report_id: str, channel: str,
                    recipient: str, message: str, success: bool):
    try:
        supabase.table("alerts_log").insert({
            "report_id": report_id,
            "channel": channel,
            "recipient": recipient,
            "message": message,
            "success": success,
        }).execute()
    except Exception as e:
        log.error("Alert log failed: %s", e)
