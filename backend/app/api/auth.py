from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import User
from app.schemas.schemas import UserCreate, UserLogin, UserResponse, Token, UserPreferencesUpdate
from app.auth.security import verify_password, get_password_hash, create_access_token
from app.auth.deps import get_current_user
from app.auth.rate_limit import rate_limit_auth

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
    rate_limit_auth(request, "signup")
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_username = db.query(User).filter(User.username == user_in.username).first()
    if db_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    new_user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name or user_in.username,
        hashed_password=get_password_hash(user_in.password),
        avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={user_in.username}",
        preferred_genres=["Sci-Fi", "Action"],
        preferred_vibes=["Mind-Bending"]
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(subject=new_user.id)
    return Token(access_token=access_token, token_type="bearer", user=UserResponse.from_orm(new_user))

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, request: Request, db: Session = Depends(get_db)):
    rate_limit_auth(request, "login")
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token, token_type="bearer", user=UserResponse.from_orm(user))

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/preferences", response_model=UserResponse)
def update_preferences(
    pref_in: UserPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if pref_in.preferred_genres is not None:
        current_user.preferred_genres = pref_in.preferred_genres
    if pref_in.favorite_directors is not None:
        current_user.favorite_directors = pref_in.favorite_directors
    if pref_in.favorite_actors is not None:
        current_user.favorite_actors = pref_in.favorite_actors
    if pref_in.preferred_vibes is not None:
        current_user.preferred_vibes = pref_in.preferred_vibes
        
    db.commit()
    db.refresh(current_user)
    return current_user
