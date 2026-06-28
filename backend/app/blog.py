import uuid
from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from app.deps import get_supabase
from app.admin import require_admin

router = APIRouter(prefix="/blog")

IMAGE_BUCKET = "article-images"      # shared with the knowledge base
MAX_IMAGE_BYTES = 5 * 1024 * 1024    # 5 MB


# ── Schemas ────────────────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    category: str = "Поради"
    title: str
    excerpt: str | None = None
    content: str | None = None
    author: str = "Виросте"
    emoji: str = "🌱"
    gradient_from: str = "#BBE3BB"
    gradient_to: str = "#C2E3F5"
    cover_image: str | None = None   # photo URL; overrides emoji/gradient when set
    published: bool = True


class PostUpdate(BaseModel):
    category: str | None = None
    title: str | None = None
    excerpt: str | None = None
    content: str | None = None
    author: str | None = None
    emoji: str | None = None
    gradient_from: str | None = None
    gradient_to: str | None = None
    cover_image: str | None = None
    published: bool | None = None


# ── Public endpoints ───────────────────────────────────────────────────────────

@router.get("/posts")
def list_posts(category: str | None = None, sort: str = "created_at"):
    sb = get_supabase()
    q = sb.table("blog_posts").select("*").eq("published", True)
    if category:
        q = q.eq("category", category)
    q = q.order("views" if sort == "views" else "created_at", desc=True)
    return q.execute().data or []


@router.get("/posts/{post_id}")
def get_post(post_id: UUID):
    sb = get_supabase()
    r = (
        sb.table("blog_posts").select("*")
        .eq("id", str(post_id)).eq("published", True)
        .limit(1).execute()
    )
    if not r.data:
        raise HTTPException(404, "Post not found")
    return r.data[0]


@router.post("/posts/{post_id}/view")
def increment_view(post_id: UUID):
    sb = get_supabase()
    r = sb.table("blog_posts").select("views").eq("id", str(post_id)).limit(1).execute()
    if not r.data:
        raise HTTPException(404)
    views = (r.data[0].get("views") or 0) + 1
    sb.table("blog_posts").update({"views": views}).eq("id", str(post_id)).execute()
    return {"views": views}


# ── Admin endpoints ────────────────────────────────────────────────────────────

@router.get("/admin/posts", dependencies=[Depends(require_admin)])
def admin_list_posts():
    """All posts (including unpublished) for admin management."""
    r = (
        get_supabase().table("blog_posts").select("*")
        .order("created_at", desc=True).execute()
    )
    return r.data or []


@router.post("/posts", dependencies=[Depends(require_admin)])
def create_post(body: PostCreate):
    r = get_supabase().table("blog_posts").insert(body.model_dump()).execute()
    return r.data[0]


@router.patch("/posts/{post_id}", dependencies=[Depends(require_admin)])
def update_post(post_id: UUID, body: PostUpdate):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(400, "Nothing to update")
    r = get_supabase().table("blog_posts").update(data).eq("id", str(post_id)).execute()
    if not r.data:
        raise HTTPException(404)
    return r.data[0]


@router.delete("/posts/{post_id}", dependencies=[Depends(require_admin)])
def delete_post(post_id: UUID):
    get_supabase().table("blog_posts").delete().eq("id", str(post_id)).execute()
    return {"ok": True}


@router.patch("/posts/{post_id}/feature", dependencies=[Depends(require_admin)])
def feature_post(post_id: UUID):
    sb = get_supabase()
    sb.table("blog_posts").update({"is_featured": False}).neq("id", str(post_id)).execute()
    r = sb.table("blog_posts").update({"is_featured": True}).eq("id", str(post_id)).execute()
    if not r.data:
        raise HTTPException(404)
    return r.data[0]


# ── Admin: cover image upload → Supabase Storage ─────────────────────────────────
@router.post("/upload", dependencies=[Depends(require_admin)])
async def upload_cover(file: UploadFile = File(...)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Only image uploads are allowed")
    blob = await file.read()
    if len(blob) > MAX_IMAGE_BYTES:
        raise HTTPException(400, "Image too large (max 5 MB)")

    ext = (file.filename or "img").rsplit(".", 1)[-1].lower()
    path = f"blog/{uuid.uuid4().hex}.{ext}"
    sb = get_supabase()
    try:
        sb.storage.from_(IMAGE_BUCKET).upload(
            path, blob, {"content-type": file.content_type, "upsert": "false"}
        )
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {e}")
    return {"url": sb.storage.from_(IMAGE_BUCKET).get_public_url(path)}
