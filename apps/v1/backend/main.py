import logging
import sys
import os

# Ensure current directory is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.pm_routes import router as pm_router
from api.auth_routes import router as auth_router

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pm_router, prefix="/api")
app.include_router(auth_router, prefix="/api")

logger.info("🚀 FastAPI Server is Starting...")

# Optional root test route
@app.get("/")
async def root():
    return {"message": "FastAPI backend is running!"}
