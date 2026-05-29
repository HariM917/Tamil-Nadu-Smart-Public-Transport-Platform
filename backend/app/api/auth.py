from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate, Token
from app.services.auth_service import auth_service

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new passenger or staff user."""
    return auth_service.register_user(db, user_in)


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """
    OAuth2 compatible token login, query-string or form-data username/password.
    Username can be email or phone number.
    """
    user = auth_service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email/phone or password"
        )
    
    access_token = auth_service.create_token_for_user(user)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/login/json", response_model=Token)
def login_json(
    credentials: UserCreate, db: Session = Depends(get_db)
):
    """Alternative JSON body login for easy integration with frontend frameworks."""
    # We use UserCreate schema but password + email/phone fields
    username = credentials.email or credentials.phone
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or phone must be provided as login identity"
        )
    
    user = auth_service.authenticate_user(db, username, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email/phone or password"
        )

    access_token = auth_service.create_token_for_user(user)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """Retrieve details of the currently logged-in user."""
    return current_user


@router.put("/profile", response_model=UserResponse)
def update_profile(
    profile_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile details of the current user."""
    return auth_service.update_profile(db, current_user, profile_data)
