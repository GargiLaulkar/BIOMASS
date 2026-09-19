from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import User
from backend.app.schemas.schemas import UserRegister, UserLogin, Token, UserResponse, ForgotPasswordRequest, ResetPasswordRequest, PasswordResetResponse
from backend.app.auth_utils import get_password_hash, verify_password, create_access_token, create_password_reset_token, verify_password_reset_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check if email is already taken
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )
    
    # Create new user
    db_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create token payload
    token_data = {"sub": user.email, "role": user.role, "user_id": user.id}
    access_token = create_access_token(data=token_data)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role
    )

@router.post("/forgot-password", response_model=PasswordResetResponse)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )
    
    reset_token = create_password_reset_token(user.email)
    return PasswordResetResponse(
        message="Password reset instructions and verification token generated.",
        reset_token=reset_token,
        email=user.email
    )

@router.post("/reset-password", response_model=PasswordResetResponse)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    # Verify token
    verified_email = verify_password_reset_token(request.token)
    if not verified_email or verified_email.lower() != request.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )
    
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )
    
    # Update password
    user.password_hash = get_password_hash(request.new_password)
    db.commit()
    
    return PasswordResetResponse(
        message="Password has been reset successfully! You can now log in with your new password.",
        email=user.email
    )

# FastAPI OAuth2PasswordBearer compatibility login endpoint (Form-based)
@router.post("/login-form-compat", include_in_schema=False)
def login_form_compat(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token_data = {"sub": user.email, "role": user.role, "user_id": user.id}
    access_token = create_access_token(data=token_data)
    return {"access_token": access_token, "token_type": "bearer"}
