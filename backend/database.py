"""
Database models and session management for the Travel Planner app.
Uses async SQLAlchemy with SQLite (aiosqlite driver).
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    event,
)
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship

logger = logging.getLogger(__name__)

DATABASE_URL = "sqlite+aiosqlite:///./travel_planner.db"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# Enable WAL mode and foreign keys for SQLite performance / correctness
@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    trips = relationship("Trip", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    destination = Column(String(255), nullable=False)
    start_date = Column(String(20), nullable=False)  # ISO date string
    end_date = Column(String(20), nullable=False)
    preferences = Column(Text, default="")  # free-text preferences
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    user = relationship("User", back_populates="trips")
    itineraries = relationship(
        "Itinerary", back_populates="trip", cascade="all, delete-orphan"
    )
    hotel_results = relationship(
        "HotelResult", back_populates="trip", cascade="all, delete-orphan"
    )
    restaurant_results = relationship(
        "RestaurantResult", back_populates="trip", cascade="all, delete-orphan"
    )

    def to_dict(self, include_related: bool = False):
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "destination": self.destination,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "preferences": self.preferences,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_related:
            data["itinerary"] = (
                self.itineraries[-1].to_dict() if self.itineraries else None
            )
            data["hotels"] = (
                self.hotel_results[-1].to_dict() if self.hotel_results else None
            )
            data["restaurants"] = (
                self.restaurant_results[-1].to_dict()
                if self.restaurant_results
                else None
            )
        return data


class Itinerary(Base):
    __tablename__ = "itineraries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)  # JSON string
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    trip = relationship("Trip", back_populates="itineraries")

    def to_dict(self):
        try:
            content = json.loads(self.content)
        except (json.JSONDecodeError, TypeError):
            content = self.content
        return {
            "id": self.id,
            "trip_id": self.trip_id,
            "content": content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class HotelResult(Base):
    __tablename__ = "hotel_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    results = Column(Text, nullable=False)  # JSON string
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    trip = relationship("Trip", back_populates="hotel_results")

    def to_dict(self):
        try:
            results = json.loads(self.results)
        except (json.JSONDecodeError, TypeError):
            results = self.results
        return {
            "id": self.id,
            "trip_id": self.trip_id,
            "results": results,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class RestaurantResult(Base):
    __tablename__ = "restaurant_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    results = Column(Text, nullable=False)  # JSON string
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    trip = relationship("Trip", back_populates="restaurant_results")

    def to_dict(self):
        try:
            results = json.loads(self.results)
        except (json.JSONDecodeError, TypeError):
            results = self.results
        return {
            "id": self.id,
            "trip_id": self.trip_id,
            "results": results,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def init_db():
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created / verified.")


async def get_session() -> AsyncSession:
    """Yield an async session for dependency injection."""
    async with async_session() as session:
        yield session
