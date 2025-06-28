import logging
import sys
import os

# Ensure current directory is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from api.pm_routes import router as pm_router
from api.auth_routes import router as auth_router

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()

# Environment-aware CORS configuration
def get_cors_origins():
    """Get CORS origins based on environment"""
    # Get environment from environment variable
    env = os.getenv("ENVIRONMENT", "development").lower()
    
    if env == "production":
        # Production: Only allow specific domains
        return [
            "https://yourdomain.com",
            "https://www.yourdomain.com",
            # Add your production frontend URLs here
        ]
    elif env == "staging":
        # Staging: Allow staging domains
        return [
            "https://staging.yourdomain.com",
            "https://ideal-chainsaw-pjgqrpqqjpj296g6-3000.app.github.dev",  # Current Codespace
            "http://localhost:3000",     # Local testing
        ]
    else:
        # Development: More permissive + specific Codespace URL
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://ideal-chainsaw-pjgqrpqqjpj296g6-3000.app.github.dev",  # Your current Codespace frontend
            # Add more Codespace URLs as needed
        ]

# Configure CORS
cors_origins = get_cors_origins()
logger.info(f"🌐 CORS configured for environment: {os.getenv('ENVIRONMENT', 'development')}")
logger.info(f"🔧 Allowed origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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

# Health check endpoint
@app.get("/health")
async def health():
    return {"status": "healthy", "environment": os.getenv("ENVIRONMENT", "development")}

if __name__ == "__main__":
    logger.info("Starting server with uvicorn...")
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000, 
        reload=False,
        log_level="info"
    )