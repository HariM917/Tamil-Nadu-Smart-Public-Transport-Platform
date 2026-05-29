from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import hash_password, verify_password, create_access_token


class AuthService:
    """Service to handle authentication, user creation, and profile updates."""

    @staticmethod
    def register_user(db: Session, schema: UserCreate) -> User:
        """Register a new user, checking for email/phone conflicts."""
        if schema.email:
            existing_email = db.query(User).filter(User.email == schema.email).first()
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A user with this email address already exists.",
                )

        if schema.phone:
            existing_phone = db.query(User).filter(User.phone == schema.phone).first()
            if existing_phone:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A user with this phone number already exists.",
                )

        if not schema.email and not schema.phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either email or phone number is required.",
            )

        # Hash password and save user
        hashed = hash_password(schema.password)
        db_user = User(
            email=schema.email,
            phone=schema.phone,
            password_hash=hashed,
            full_name=schema.full_name,
            date_of_birth=schema.date_of_birth,
            gender=schema.gender,
            address=schema.address,
            city=schema.city,
            role="user",  # Default role
            is_verified=False,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def authenticate_user(
        db: Session, username: str, password: str
    ) -> Optional[User]:
        """Authenticate user by email or phone and verify password."""
        # username can be email or phone
        user = db.query(User).filter(
            (User.email == username) | (User.phone == username)
        ).first()

        if not user or not verify_password(password, user.password_hash):
            return None
        return user

    @staticmethod
    def create_token_for_user(user: User) -> str:
        """Helper to issue a JWT access token for a user."""
        return create_access_token(
            data={"sub": str(user.id), "role": user.role}
        )

    @staticmethod
    def update_profile(db: Session, user: User, schema: UserUpdate) -> User:
        """Update profile fields of current user."""
        if schema.email and schema.email != user.email:
            # Check conflict
            conflict = db.query(User).filter(User.email == schema.email).first()
            if conflict:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already in use.",
                )
            user.email = schema.email

        if schema.phone and schema.phone != user.phone:
            conflict = db.query(User).filter(User.phone == schema.phone).first()
            if conflict:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already in use.",
                )
            user.phone = schema.phone

        if schema.full_name is not None:
            user.full_name = schema.full_name
        if schema.date_of_birth is not None:
            user.date_of_birth = schema.date_of_birth
        if schema.gender is not None:
            user.gender = schema.gender
        if schema.address is not None:
            user.address = schema.address
        if schema.city is not None:
            user.city = schema.city
        if schema.profile_image is not None:
            user.profile_image = schema.profile_image

        db.commit()
        db.refresh(user)
        return user


auth_service = AuthService()
