"""
Knowledge Base (База знань) — admin-authored wiki.

Mirrors app/blog.py for article CRUD, adds categories, a frost-relative-free
reading-time estimate, related articles, and a Supabase Storage image upload.
Article body is a TipTap doc (JSONB); rendered to HTML on the client.
"""
import re
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.admin import require_admin
from app.deps import get_supabase

router = APIRouter(prefix="/knowledge")

IMAGE_BUCKET = "article-images"
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB

# Ukrainian → latin transliteration for slugs.
_UA_MAP = {
    "а": "a", "б": "b", "в": "v", "г": "h", "ґ": "g", "д": "d", "е": "e", "є": "ye",
    "ж": "zh", "з": "z", "и": "y", "і": "i", "ї": "yi", "й": "y", "к": "k", "л": "l",
    "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch", "ь": "",
    "ю": "yu", "я": "ya", "'": "",
}


def _slugify(text: str) -> str:
    text = (text or "").strip().lower()
    out = "".join(_UA_MAP.get(ch, ch) for ch in text)
    out = re.sub(r"[^a-z0-9]+", "-", out).strip("-")
    return out or uuid.uuid4().hex[:8]


def _collect_text(node: object) -> str:
    """Recursively pull text out of a TipTap JSON node."""
    if isinstance(node, dict):
        parts = [node["text"]] if node.get("type") == "text" and node.get("text") else []
        parts += [_collect_text(c) for c in node.get("content", [])]
        return " ".join(p for p in parts if p)
    if isinstance(node, list):
        return " ".join(_collect_text(n) for n in node)
    return ""


def _reading_minutes(content: object) -> int:
    words = len(_collect_text(content).split())
    return max(1, round(words / 200))


# ── Schemas ─────────────────────────────────────────────────────────────────
class CategoryIn(BaseModel):
    name: str
    slug: str | None = None
    emoji: str | None = None
    description: str | None = None
    subcategories: list[str] = []
    sort_order: int = 0


class ArticleCreate(BaseModel):
    category_id: str | None = None
    title: str
    slug: str | None = None
    excerpt: str | None = None
    content: dict = {}            # TipTap doc JSON
    cover_image: str | None = None
    tags: list[str] = []
    author: str = "Виросте"
    published: bool = False


class ArticleUpdate(BaseModel):
    category_id: str | None = None
    title: str | None = None
    slug: str | None = None
    excerpt: str | None = None
    content: dict | None = None
    cover_image: str | None = None
    tags: list[str] | None = None
    author: str | None = None
    published: bool | None = None


# ── Public: categories ──────────────────────────────────────────────────────
@router.get("/categories")
def list_categories():
    """Categories + published-article counts (for the /knowledge landing cards)."""
    sb = get_supabase()
    cats = sb.table("kb_categories").select("*").order("sort_order").execute().data or []
    arts = sb.table("kb_articles").select("category_id").eq("published", True).execute().data or []
    counts: dict[str, int] = {}
    for a in arts:
        cid = a.get("category_id")
        if cid:
            counts[cid] = counts.get(cid, 0) + 1
    for c in cats:
        c["article_count"] = counts.get(c["id"], 0)
    return cats


# ── Public: articles ────────────────────────────────────────────────────────
@router.get("/articles")
def list_articles(
    category: str | None = None,   # category slug
    q: str | None = None,
    tag: str | None = None,
    sort: str = "created_at",
):
    sb = get_supabase()
    query = (
        sb.table("kb_articles")
        .select("id,title,slug,excerpt,cover_image,tags,category_id,views,reading_minutes,created_at")
        .eq("published", True)
    )
    if category:
        cat = sb.table("kb_categories").select("id").eq("slug", category).maybe_single().execute()
        if cat.data:
            query = query.eq("category_id", cat.data["id"])
    if tag:
        query = query.contains("tags", [tag])
    if q:
        query = query.or_(f"title.ilike.%{q}%,excerpt.ilike.%{q}%")
    query = query.order("views" if sort == "views" else "created_at", desc=True)
    return query.execute().data or []


@router.get("/articles/{slug_or_id}")
def get_article(slug_or_id: str):
    sb = get_supabase()
    col = "id" if re.fullmatch(r"[0-9a-fA-F-]{36}", slug_or_id) else "slug"
    r = (
        sb.table("kb_articles").select("*")
        .eq(col, slug_or_id).eq("published", True).limit(1).execute()
    )
    if not r.data:
        raise HTTPException(404, "Article not found")
    article = r.data[0]

    related = []
    if article.get("category_id"):
        rel = (
            sb.table("kb_articles")
            .select("id,title,slug,excerpt,cover_image,reading_minutes")
            .eq("category_id", article["category_id"])
            .eq("published", True)
            .neq("id", article["id"])
            .limit(4)
            .execute()
        )
        related = rel.data or []
    article["related"] = related
    return article


@router.post("/articles/{article_id}/view")
def increment_view(article_id: str):
    sb = get_supabase()
    r = sb.table("kb_articles").select("views").eq("id", article_id).limit(1).execute()
    if not r.data:
        raise HTTPException(404)
    views = (r.data[0].get("views") or 0) + 1
    sb.table("kb_articles").update({"views": views}).eq("id", article_id).execute()
    return {"views": views}


# ── Admin: categories ───────────────────────────────────────────────────────
@router.post("/categories", dependencies=[Depends(require_admin)])
def create_category(body: CategoryIn):
    sb = get_supabase()
    data = body.model_dump()
    data["slug"] = body.slug or _slugify(body.name)
    return sb.table("kb_categories").insert(data).execute().data[0]


@router.patch("/categories/{category_id}", dependencies=[Depends(require_admin)])
def update_category(category_id: str, body: CategoryIn):
    sb = get_supabase()
    data = body.model_dump()
    data["slug"] = body.slug or _slugify(body.name)
    r = sb.table("kb_categories").update(data).eq("id", category_id).execute()
    if not r.data:
        raise HTTPException(404)
    return r.data[0]


@router.delete("/categories/{category_id}", dependencies=[Depends(require_admin)])
def delete_category(category_id: str):
    get_supabase().table("kb_categories").delete().eq("id", category_id).execute()
    return {"ok": True}


# ── Admin: articles ─────────────────────────────────────────────────────────
@router.get("/admin/articles", dependencies=[Depends(require_admin)])
def admin_list_articles():
    return (
        get_supabase().table("kb_articles").select("*")
        .order("created_at", desc=True).execute().data or []
    )


@router.post("/articles", dependencies=[Depends(require_admin)])
def create_article(body: ArticleCreate):
    sb = get_supabase()
    data = body.model_dump()
    data["slug"] = body.slug or _slugify(body.title)
    data["reading_minutes"] = _reading_minutes(body.content)
    return sb.table("kb_articles").insert(data).execute().data[0]


@router.patch("/articles/{article_id}", dependencies=[Depends(require_admin)])
def update_article(article_id: str, body: ArticleUpdate):
    sb = get_supabase()
    data = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if "title" in data and not data.get("slug"):
        data["slug"] = _slugify(data["title"])
    if "content" in data:
        data["reading_minutes"] = _reading_minutes(data["content"])
    if not data:
        raise HTTPException(400, "Nothing to update")
    r = sb.table("kb_articles").update(data).eq("id", article_id).execute()
    if not r.data:
        raise HTTPException(404)
    return r.data[0]


@router.delete("/articles/{article_id}", dependencies=[Depends(require_admin)])
def delete_article(article_id: str):
    get_supabase().table("kb_articles").delete().eq("id", article_id).execute()
    return {"ok": True}


# ── Admin: image upload → Supabase Storage ──────────────────────────────────
@router.post("/upload", dependencies=[Depends(require_admin)])
async def upload_image(file: UploadFile = File(...)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Only image uploads are allowed")
    blob = await file.read()
    if len(blob) > MAX_IMAGE_BYTES:
        raise HTTPException(400, "Image too large (max 5 MB)")

    ext = (file.filename or "img").rsplit(".", 1)[-1].lower()
    path = f"{uuid.uuid4().hex}.{ext}"
    sb = get_supabase()
    try:
        sb.storage.from_(IMAGE_BUCKET).upload(
            path, blob, {"content-type": file.content_type, "upsert": "false"}
        )
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {e}")
    return {"url": sb.storage.from_(IMAGE_BUCKET).get_public_url(path)}
