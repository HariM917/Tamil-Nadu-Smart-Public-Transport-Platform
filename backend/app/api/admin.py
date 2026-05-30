from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
import os
import csv
import re
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.core.deps import get_admin_user
from app.models.user import User
from app.models.bus import Bus
from app.models.booking import Booking
from app.models.bus_pass import BusPass
from app.schemas.bus_pass import BusPassResponse, BusPassReview
from app.schemas.booking import BookingResponse
from app.schemas.user import UserResponse
from app.schemas.bus import BusCreate, BusUpdate, BusResponse as BusSchemaResponse
from app.services.pass_service import pass_service

router = APIRouter()

# Enforce admin permission for ALL routes in this file
# Handled via Depends(get_admin_user) in endpoints


@router.get("/passes", response_model=List[BusPassResponse])
def list_passes(
    status: Optional[str] = Query(None, description="Filter by status (pending, approved, rejected, expired)"),
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """List all bus pass applications in the system, filterable by status."""
    query = db.query(BusPass)
    if status:
        query = query.filter(BusPass.status == status)
    return query.order_by(BusPass.applied_at.desc()).all()


@router.put("/passes/{pass_id}/review", response_model=BusPassResponse)
def review_pass(
    pass_id: int,
    review: BusPassReview,
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Approve or reject a passenger bus pass application, setting validity and QR code."""
    return pass_service.review_pass(db, pass_id, review, current_admin)


@router.get("/users", response_model=List[UserResponse])
def list_users(
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """List all registered users in the database."""
    return db.query(User).order_by(User.created_at.desc()).all()


@router.get("/bookings", response_model=List[BookingResponse])
def list_bookings(
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """List all ticket bookings in the system."""
    return db.query(Booking).order_by(Booking.booking_date.desc()).all()


@router.post("/buses", response_model=BusSchemaResponse, status_code=status.HTTP_201_CREATED)
def create_bus(
    bus_in: BusCreate,
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Add a new bus into the scheduling database."""
    # Check duplicate bus number
    existing_bus = db.query(Bus).filter(Bus.bus_number == bus_in.bus_number).first()
    if existing_bus:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A bus with this registration number already exists."
        )

    db_bus = Bus(**bus_in.dict())
    db.add(db_bus)
    db.commit()
    db.refresh(db_bus)
    return db_bus


@router.put("/buses/{bus_id}", response_model=BusSchemaResponse)
def update_bus(
    bus_id: int,
    bus_in: BusUpdate,
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update general routing/pricing details of an existing bus."""
    db_bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not db_bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bus not found."
        )

    update_data = bus_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(db_bus, field, val)

    db.commit()
    db.refresh(db_bus)
    return db_bus


@router.delete("/buses/{bus_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bus(
    bus_id: int,
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Remove a bus from service schedules."""
    db_bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not db_bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bus not found."
        )

    db.delete(db_bus)
    db.commit()
    return None


@router.get("/analytics")
def get_analytics(
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Compile aggregation data, active metrics, passenger counts and earnings for reporting."""
    total_users = db.query(User).count()
    total_bookings = db.query(Booking).count()
    total_passes = db.query(BusPass).count()
    
    # Financials
    total_booking_revenue = db.query(func.sum(Booking.amount)).filter(Booking.payment_status == "paid").scalar() or 0.0
    total_pass_revenue = db.query(func.sum(BusPass.amount)).filter(BusPass.payment_status == "paid").scalar() or 0.0
    total_revenue = total_booking_revenue + total_pass_revenue

    # Pass Status Distribution
    pass_distribution = db.query(BusPass.status, func.count(BusPass.id)).group_by(BusPass.status).all()
    pass_stats = {status_lbl: count for status_lbl, count in pass_distribution}

    # Pass Category Distribution
    category_distribution = db.query(BusPass.category, func.count(BusPass.id)).group_by(BusPass.category).all()
    category_stats = {cat_lbl: count for cat_lbl, count in category_distribution}

    # Pass Type Distribution
    type_distribution = db.query(BusPass.pass_type, func.count(BusPass.id)).group_by(BusPass.pass_type).all()
    type_stats = {type_lbl or "unknown": count for type_lbl, count in type_distribution}

    # Active Routes count
    from app.models.route import Route
    active_routes = db.query(Route).count()

    # Daily Bookings (last 24 hours)
    daily_bookings = db.query(Booking).filter(Booking.booking_date >= datetime.utcnow() - timedelta(days=1)).count()

    # Recent pass applications
    recent_passes = db.query(BusPass).order_by(BusPass.applied_at.desc()).limit(5).all()
    recent_passes_serialized = []
    for p in recent_passes:
        user_name = db.query(User.full_name).filter(User.id == p.user_id).scalar() or "Unknown User"
        recent_passes_serialized.append({
            "id": p.id,
            "user_name": user_name,
            "category": p.category,
            "status": p.status,
            "applied_at": p.applied_at
        })

    # Weekly Booking Graph & Weekly User Registrations Graph
    today = datetime.utcnow()
    weekly_bookings = []
    weekly_users = []
    for i in range(7):
        day_start = (today - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = (today - timedelta(days=i)).replace(hour=23, minute=59, second=59, microsecond=999999)
        
        day_bookings_count = db.query(Booking).filter(Booking.booking_date.between(day_start, day_end)).count()
        weekly_bookings.append({
            "date": day_start.strftime("%b %d"),
            "bookings": day_bookings_count
        })

        day_users_count = db.query(User).filter(User.created_at.between(day_start, day_end)).count()
        weekly_users.append({
            "date": day_start.strftime("%b %d"),
            "users": day_users_count
        })

    weekly_bookings.reverse()
    weekly_users.reverse()

    # Popular Routes based on Booking volume
    popular_routes_query = db.query(Bus.route_number, func.count(Booking.id))\
        .join(Booking, Booking.bus_id == Bus.id)\
        .group_by(Bus.route_number)\
        .order_by(func.count(Booking.id).desc())\
        .limit(5).all()
    popular_routes = [{"route": r[0] or "Unknown", "count": r[1]} for r in popular_routes_query]

    # Fallback to seed default routes list if no bookings yet
    if not popular_routes:
        popular_routes = [
            {"route": "102", "count": 24},
            {"route": "101CT", "count": 18},
            {"route": "101", "count": 15},
            {"route": "102CT", "count": 12},
            {"route": "101X", "count": 9}
        ]

    # Active passes (approved, within validity, paid)
    now = datetime.utcnow()
    active_passes = (
        db.query(BusPass)
        .filter(
            BusPass.status == "approved",
            BusPass.payment_status == "paid",
            BusPass.valid_from <= now,
            BusPass.valid_until >= now,
        )
        .count()
    )

    ml_distribution = (
        db.query(BusPass.ml_verification_status, func.count(BusPass.id))
        .group_by(BusPass.ml_verification_status)
        .all()
    )
    verification_stats = {lbl or "unknown": count for lbl, count in ml_distribution}

    avg_verification = (
        db.query(func.avg(BusPass.verification_score))
        .filter(BusPass.verification_score.isnot(None))
        .scalar()
    ) or 0.0

    return {
        "stats": {
            "total_users": total_users,
            "total_bookings": total_bookings,
            "total_passes": total_passes,
            "total_revenue": total_revenue,
            "booking_revenue": total_booking_revenue,
            "pass_revenue": total_pass_revenue,
            "active_routes": active_routes,
            "daily_bookings": daily_bookings,
            "pending_approvals": pass_stats.get("pending", 0),
            "approved_passes": pass_stats.get("approved", 0),
            "rejected_applications": pass_stats.get("rejected", 0),
            "active_passes": active_passes,
            "avg_verification_score": round(float(avg_verification), 1),
        },
        "verification_status_distribution": verification_stats,
        "pass_status_distribution": pass_stats,
        "pass_category_distribution": category_stats,
        "pass_type_distribution": type_stats,
        "recent_passes": recent_passes_serialized,
        "weekly_bookings": weekly_bookings,
        "weekly_users": weekly_users,
        "popular_routes": popular_routes
    }

