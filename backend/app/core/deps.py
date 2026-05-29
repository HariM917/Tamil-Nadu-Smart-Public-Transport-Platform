import json
import logging
import urllib.request
from typing import Generator

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import oauth2_scheme, decode_access_token
from app.models.user import User
from app.core.config import settings

logger = logging.getLogger(__name__)


def verify_supabase_token(token: str, supabase_url: str, supabase_anon_key: str) -> dict:
    """Validate token directly with Supabase Auth API."""
    if not supabase_url or not supabase_anon_key or "anon-key" in supabase_anon_key:
        return None
    
    url = f"{supabase_url}/auth/v1/user"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "apikey": supabase_anon_key
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                return json.loads(response.read().decode())
    except Exception as e:
        logger.warning(f"Supabase token validation request failed: {e}")
    return None


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    """Dependency to get the current authenticated user from JWT token (Supabase or Local)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Try Supabase Auth first
    supabase_user = verify_supabase_token(token, settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    if supabase_user:
        email = supabase_user.get("email")
        phone = supabase_user.get("phone")
        
        # Look up by email or phone in database
        user = None
        if email:
            user = db.query(User).filter(User.email == email).first()
        elif phone:
            user = db.query(User).filter(User.phone == phone).first()
            
        if user is None:
            # Create user dynamically in public database if authenticated by Supabase
            user_metadata = supabase_user.get("user_metadata", {})
            full_name = user_metadata.get("full_name") or (email.split('@')[0] if email else "Supabase User")
            
            user = User(
                email=email,
                phone=phone,
                password_hash="supabase_authenticated_user",
                full_name=full_name,
                role="user",
                is_verified=True,
                city="Chennai"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        return user

    # 2. Fallback to Local JWT Auth
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
    except ValueError:
        # If user_id is a UUID (from Supabase) but we failed to verify via Supabase API
        raise credentials_exception

    if user is None:
        raise credentials_exception

    return user


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to ensure the current user is an admin."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
