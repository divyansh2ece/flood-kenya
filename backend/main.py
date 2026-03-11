import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

from routes.reports  import router as reports_router
from routes.weather  import router as weather_router
from routes.shelters import router as shelters_router

load_dotenv()
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if token:
        # CRITICAL FIX: run bot in its own daemon thread with its own event loop
        # Using asyncio.create_task + run_polling caused event loop conflict with uvicorn
        from bot.telegram_bot import start_bot_thread
        start_bot_thread(token)
    else:
        log.warning("TELEGRAM_BOT_TOKEN not set — bot not started")
    yield


app = FastAPI(
    title="Flood Intelligence & Reporting System — Kenya",
    description="Real-time flood reporting. Built from India for Kenya 🇮🇳→🇰🇪",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # open for Mini App + NGO access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(reports_router)
app.include_router(weather_router)
app.include_router(shelters_router)


@app.get("/")
async def root():
    return {"service": "FloodWatch Kenya API", "status": "online", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/miniapp")
async def miniapp():
    return FileResponse("static/miniapp.html")

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")
