"""
FastAPI application for the Travel Planner.

Provides REST endpoints for users, trips, and AI-powered itinerary /
hotel / restaurant generation.  Serves the React frontend as static
files from ../frontend/dist.
"""

import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .agents import generate_itinerary, search_hotels, search_restaurants
from .database import (
    HotelResult,
    Itinerary,
    RestaurantResult,
    Trip,
    User,
    get_session,
    init_db,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — init DB on startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    logger.info("Travel Planner API is ready.")
    yield


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Travel Planner API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------
class CreateUserRequest(BaseModel):
    username: str


class CreateTripRequest(BaseModel):
    user_id: int
    destination: str
    start_date: str
    end_date: str
    preferences: str = ""


# ---------------------------------------------------------------------------
# User endpoints
# ---------------------------------------------------------------------------
@app.post("/api/users")
async def create_user(
    body: CreateUserRequest,
    session: AsyncSession = Depends(get_session),
):
    # Check if username already exists
    existing = await session.execute(
        select(User).where(User.username == body.username)
    )
    existing_user = existing.scalar_one_or_none()
    if existing_user:
        return existing_user.to_dict()

    user = User(username=body.username)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    logger.info("Created user: %s (id=%d)", user.username, user.id)
    return user.to_dict()


@app.get("/api/users/{username}")
async def get_user(
    username: str,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(User).where(User.username == username)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.to_dict()


# ---------------------------------------------------------------------------
# Trip endpoints
# ---------------------------------------------------------------------------
@app.post("/api/trips")
async def create_trip(
    body: CreateTripRequest,
    session: AsyncSession = Depends(get_session),
):
    # Verify user exists
    result = await session.execute(select(User).where(User.id == body.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    trip = Trip(
        user_id=body.user_id,
        destination=body.destination,
        start_date=body.start_date,
        end_date=body.end_date,
        preferences=body.preferences,
    )
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    logger.info("Created trip #%d to %s for user %d", trip.id, trip.destination, trip.user_id)
    return trip.to_dict()


@app.get("/api/trips")
async def list_trips(
    user_id: int = Query(...),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Trip)
        .where(Trip.user_id == user_id)
        .order_by(Trip.created_at.desc())
    )
    trips = result.scalars().all()
    return [t.to_dict() for t in trips]


@app.get("/api/trips/{trip_id}")
async def get_trip(
    trip_id: int,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Trip)
        .where(Trip.id == trip_id)
        .options(
            selectinload(Trip.itineraries),
            selectinload(Trip.hotel_results),
            selectinload(Trip.restaurant_results),
        )
    )
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip.to_dict(include_related=True)


@app.delete("/api/trips/{trip_id}")
async def delete_trip(
    trip_id: int,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    await session.delete(trip)
    await session.commit()
    logger.info("Deleted trip #%d", trip_id)
    return {"detail": "Trip deleted"}


# ---------------------------------------------------------------------------
# AI-powered endpoints
# ---------------------------------------------------------------------------
@app.post("/api/trips/{trip_id}/itinerary")
async def generate_trip_itinerary(
    trip_id: int,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    try:
        itinerary_data = await generate_itinerary(
            destination=trip.destination,
            start_date=trip.start_date,
            end_date=trip.end_date,
            preferences=trip.preferences,
        )
    except Exception as exc:
        logger.exception("Itinerary generation failed for trip #%d", trip_id)
        raise HTTPException(
            status_code=502,
            detail=f"AI service error: {exc}",
        )

    itinerary = Itinerary(
        trip_id=trip_id,
        content=json.dumps(itinerary_data, ensure_ascii=False),
    )
    session.add(itinerary)
    await session.commit()
    await session.refresh(itinerary)
    logger.info("Itinerary saved for trip #%d", trip_id)
    return itinerary.to_dict()


@app.post("/api/trips/{trip_id}/hotels")
async def search_trip_hotels(
    trip_id: int,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    try:
        hotel_data = await search_hotels(
            destination=trip.destination,
            start_date=trip.start_date,
end_date=trip.end_date,
            preferences=trip.preferences,
        )
    except Exception as exc:
        logger.exception("Hotel search failed for trip #%d", trip_id)
        raise HTTPException(
            status_code=502,
            detail=f"AI service error: {exc}",
        )

    hotel_result = HotelResult(
        trip_id=trip_id,
        results=json.dumps(hotel_data, ensure_ascii=False),
    )
    session.add(hotel_result)
    await session.commit()
    await session.refresh(hotel_result)
    logger.info("Hotel results saved for trip #%d", trip_id)
    return hotel_result.to_dict()


@app.post("/api/trips/{trip_id}/restaurants")
async def search_trip_restaurants(
    trip_id: int,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    try:
        restaurant_data = await search_restaurants(
            destination=trip.destination,
            preferences=trip.preferences,
        )
    except Exception as exc:
        logger.exception("Restaurant search failed for trip #%d", trip_id)
        raise HTTPException(
            status_code=502,
            detail=f"AI service error: {exc}",
        )

    restaurant_result = RestaurantResult(
        trip_id=trip_id,
        results=json.dumps(restaurant_data, ensure_ascii=False),
    )
    session.add(restaurant_result)
    await session.commit()
    await session.refresh(restaurant_result)
    logger.info("Restaurant results saved for trip #%d", trip_id)
    return restaurant_result.to_dict()


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "travel-planner"}


# ---------------------------------------------------------------------------
# Static file serving — React SPA
# ---------------------------------------------------------------------------
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA.  Any non-API path falls through to index.html."""
        file_path = FRONTEND_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        index = FRONTEND_DIR / "index.html"
        if index.is_file():
            return FileResponse(str(index))
        raise HTTPException(status_code=404, detail="Frontend not built yet")
else:
    logger.warning(
        "Frontend dist directory not found at %s — SPA serving disabled. "
        "Build the frontend first: cd frontend && npm run build",
        FRONTEND_DIR,
    )

    @app.get("/")
    async def root():
        return {
            "message": "Travel Planner API is running. Frontend not built yet.",
            "docs": "/docs",
        }
