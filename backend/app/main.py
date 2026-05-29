import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.session import SessionLocal
from app.db.init_db import init_db
from app.api import auth, bus_pass, booking, tracking, admin

# Setup structured logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan context manager for startup/shutdown events."""
    # ── Startup ──
    logger.info("🚀 Starting TN Smart Transport API...")
    logger.info(f"   Environment: {settings.ENVIRONMENT}")
    logger.info(f"   Debug: {settings.DEBUG}")

    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Initialize database
    db = SessionLocal()
    try:
        init_db(db)
        logger.info("✅ Database initialized successfully.")
    except Exception as e:
        logger.critical(f"❌ Database initialization failed: {e}")
        raise
    finally:
        db.close()

    yield  # Application runs here

    # ── Shutdown ──
    logger.info("🛑 Shutting down TN Smart Transport API...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Smart Public Transport Platform backend APIs for Tamil Nadu",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ── CORS configuration ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global Exception Handler ──
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions and return structured error response."""
    logger.error(f"Unhandled error on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred.",
            "type": "internal_error",
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Structured HTTP error responses."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "type": "http_error",
        },
    )


# ── Mount static uploads directory ──
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount(f"/{settings.UPLOAD_DIR}", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ── Mount API routers ──
app.include_router(auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["Authentication"])
app.include_router(bus_pass.router, prefix=f"{settings.API_PREFIX}/bus-pass", tags=["Bus Pass"])
app.include_router(booking.router, prefix=f"{settings.API_PREFIX}/booking", tags=["Ticket Booking"])
app.include_router(tracking.router, prefix=f"{settings.API_PREFIX}/buses", tags=["Live Tracking"])
app.include_router(admin.router, prefix=f"{settings.API_PREFIX}/admin", tags=["Admin Portal"])


# ── Root Endpoint ──
@app.get("/")
def read_root():
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "api_docs": "/docs" if settings.DEBUG else "disabled",
    }


# ── Health Check ──
@app.get("/health")
def health_check():
    """Health check endpoint for Docker, load balancers, and monitoring."""
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "healthy",
        "database": db_status,
        "environment": settings.ENVIRONMENT,
    }
