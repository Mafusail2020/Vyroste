import threading
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, EmailStr
from app.auth import get_current_user
from app.deps import get_supabase
from app.email import send_welcome_email

router = APIRouter(prefix="/users")

AVATAR_BUCKET = "avatars"
MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    sb = get_supabase()
    try:
        res = sb.auth.sign_up({"email": body.email, "password": body.password})
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    user = res.user
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration failed")

    try:
        sb.table("user_profiles").insert({"id": user.id}).execute()
    except Exception:
        pass

    # Fire-and-forget welcome email — never block or fail registration.
    if user.email:
        threading.Thread(target=send_welcome_email, args=(user.email,), daemon=True).start()

    return {"id": user.id, "email": user.email}


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    user_id = current_user["id"]

    result = sb.table("user_profiles").select("*").eq("id", user_id).maybe_single().execute()
    if not result.data:
        created = sb.table("user_profiles").upsert({"id": user_id}).execute()
        return created.data[0] if created.data else {"id": user_id}

    return result.data


class ProfileUpdate(BaseModel):
    region_id: str | None = None
    plot_type: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None


@router.patch("/me")
async def update_me(body: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Cabinet settings: change region / plot type / display name / avatar."""
    sb = get_supabase()
    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if "plot_type" in patch and patch["plot_type"] not in {"balcony", "dacha", "garden"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid plot_type")
    if "display_name" in patch:
        patch["display_name"] = patch["display_name"].strip()[:80]
    if not patch:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Nothing to update")

    res = sb.table("user_profiles").upsert({"id": current_user["id"], **patch}).execute()
    return res.data[0]


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload an avatar image → Supabase Storage; returns its public URL."""
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Only image uploads are allowed")
    blob = await file.read()
    if len(blob) > MAX_AVATAR_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Image too large (max 2 MB)")

    ext = (file.filename or "img").rsplit(".", 1)[-1].lower()
    path = f"{current_user['id']}/{uuid.uuid4().hex}.{ext}"
    sb = get_supabase()
    try:
        sb.storage.from_(AVATAR_BUCKET).upload(
            path, blob, {"content-type": file.content_type, "upsert": "false"}
        )
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Upload failed: {e}")
    return {"url": sb.storage.from_(AVATAR_BUCKET).get_public_url(path)}


# ── Saved articles (Knowledge-Base bookmarks) ───────────────────────────────
@router.get("/me/saved-articles")
async def list_saved_articles(current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        sb.table("saved_articles")
        .select("article_id, created_at")
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    rows = res.data or []

    # Enrich with KB article meta (no FK → merge in Python instead of embed).
    ids = [r["article_id"] for r in rows]
    article_map: dict[str, dict] = {}
    if ids:
        arts = (
            sb.table("kb_articles")
            .select("id, title, slug, cover_image")
            .in_("id", ids)
            .execute()
        )
        article_map = {a["id"]: a for a in (arts.data or [])}

    return [{**r, "article": article_map.get(r["article_id"])} for r in rows]


@router.post("/me/saved-articles/{article_id}", status_code=status.HTTP_201_CREATED)
async def save_article(article_id: str, current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    user_id = current_user["id"]
    existing = (
        sb.table("saved_articles")
        .select("id")
        .eq("user_id", user_id)
        .eq("article_id", article_id)
        .execute()
    )
    if not (existing.data or []):
        sb.table("saved_articles").insert({"user_id": user_id, "article_id": article_id}).execute()
    return {"article_id": article_id, "saved": True}


@router.delete("/me/saved-articles/{article_id}", status_code=status.HTTP_200_OK)
async def unsave_article(article_id: str, current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    (
        sb.table("saved_articles")
        .delete()
        .eq("user_id", current_user["id"])
        .eq("article_id", article_id)
        .execute()
    )
    return {"article_id": article_id, "saved": False}
