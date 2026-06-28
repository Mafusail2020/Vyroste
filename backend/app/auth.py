from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.deps import get_supabase

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    token = credentials.credentials
    try:
        response = get_supabase().auth.get_user(token)
        user = response.user
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return {"id": user.id, "email": user.email}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


optional_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer_scheme),
) -> dict | None:
    """Like get_current_user but returns None for anonymous callers instead of 401."""
    if not credentials:
        return None
    try:
        response = get_supabase().auth.get_user(credentials.credentials)
        user = response.user
        if not user:
            return None
        return {"id": user.id, "email": user.email}
    except Exception:
        return None
