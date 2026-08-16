from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.security import decode_access_token
from app.models.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{get_db.__name__}/auth/login", auto_error=False)

# Anonymous ("no token") requests resolve to this fixed, non-privileged
# account rather than "whichever user row happens to be first in the table" —
# that used to silently resolve to the admin account (since it's seeded
# first), which meant every unauthenticated request was treated as an admin.
# Never grant this account is_admin=True.
GUEST_EMAIL = "guest@cinemind.app"

def _get_guest_user(db: Session) -> Optional[User]:
    return db.query(User).filter(User.email == GUEST_EMAIL).first()

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        # Frictionless demo mode: anonymous requests act as a fixed guest
        # account (never admin), so watchlist/ratings/etc. work without
        # forcing a login, but admin-only routes still correctly reject them.
        guest = _get_guest_user(db)
        if guest:
            return guest
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user

def get_optional_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not token:
        return _get_guest_user(db)
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        return _get_guest_user(db)
    user_id = payload.get("sub")
    return db.query(User).filter(User.id == int(user_id)).first()
