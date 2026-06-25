"""
Nursery reviews — moderated, with per-user helpful votes.

Flow: user submits → status 'pending' → admin approves/rejects → approved
reviews are public. Each user can cast one helpful vote (up/down) per review.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.admin import require_admin
from app.auth import get_current_user
from app.deps import get_supabase

router = APIRouter()


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str


class VoteBody(BaseModel):
    vote: int  # 1 (up), -1 (down), 0 (clear)


def _aggregate(reviews: list[dict]) -> tuple[int, float]:
    n = len(reviews)
    avg = round(sum(r["rating"] for r in reviews) / n, 1) if n else 0.0
    return n, avg


@router.get("/nurseries/{nursery_id}/reviews")
async def list_reviews(nursery_id: str, current_user: dict = Depends(get_current_user)):
    """Approved reviews for a nursery + the caller's own vote per review."""
    sb = get_supabase()
    res = (
        sb.table("nursery_reviews")
        .select("id, author_name, avatar_url, rating, text, likes, dislikes, created_at")
        .eq("nursery_id", nursery_id)
        .eq("status", "approved")
        .order("created_at", desc=True)
        .execute()
    )
    reviews = res.data or []

    # Caller's votes on these reviews.
    ids = [r["id"] for r in reviews]
    my_votes: dict[str, int] = {}
    if ids:
        v = (
            sb.table("nursery_review_votes")
            .select("review_id, vote")
            .eq("user_id", current_user["id"])
            .in_("review_id", ids)
            .execute()
        )
        my_votes = {row["review_id"]: row["vote"] for row in (v.data or [])}
    for r in reviews:
        r["my_vote"] = my_votes.get(r["id"], 0)

    count, avg = _aggregate(reviews)
    return {"count": count, "avg": avg, "reviews": reviews}


@router.post("/nurseries/{nursery_id}/reviews", status_code=status.HTTP_201_CREATED)
async def create_review(
    nursery_id: str, body: ReviewCreate, current_user: dict = Depends(get_current_user)
):
    """Submit a review (goes to moderation). Snapshots the author's profile."""
    sb = get_supabase()
    if not body.text.strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Review text is required")

    prof = (
        sb.table("user_profiles")
        .select("display_name, avatar_url")
        .eq("id", current_user["id"])
        .maybe_single()
        .execute()
    )
    p = prof.data or {}

    # Each submission is its own moderated review (multiple per user allowed).
    sb.table("nursery_reviews").insert({
        "nursery_id":  nursery_id,
        "user_id":     current_user["id"],
        "author_name": p.get("display_name") or "Користувач",
        "avatar_url":  p.get("avatar_url"),
        "rating":      body.rating,
        "text":        body.text.strip(),
        "status":      "pending",
        "likes":       0,
        "dislikes":    0,
    }).execute()
    return {"status": "pending"}


@router.post("/reviews/{review_id}/vote")
async def vote_review(review_id: str, body: VoteBody, current_user: dict = Depends(get_current_user)):
    """Cast/toggle a helpful vote; recompute the review's like/dislike counts."""
    sb = get_supabase()
    uid = current_user["id"]

    if body.vote not in (-1, 0, 1):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="vote must be -1, 0 or 1")

    if body.vote == 0:
        sb.table("nursery_review_votes").delete().eq("review_id", review_id).eq("user_id", uid).execute()
    else:
        sb.table("nursery_review_votes").upsert(
            {"review_id": review_id, "user_id": uid, "vote": body.vote},
            on_conflict="review_id,user_id",
        ).execute()

    votes = sb.table("nursery_review_votes").select("vote").eq("review_id", review_id).execute().data or []
    likes = sum(1 for v in votes if v["vote"] == 1)
    dislikes = sum(1 for v in votes if v["vote"] == -1)
    sb.table("nursery_reviews").update({"likes": likes, "dislikes": dislikes}).eq("id", review_id).execute()

    return {"likes": likes, "dislikes": dislikes, "my_vote": body.vote}


# ── Admin moderation ────────────────────────────────────────────────────────
@router.get("/admin/reviews", dependencies=[Depends(require_admin)])
async def admin_pending_reviews():
    """Pending reviews + their nursery name, for the moderation queue."""
    sb = get_supabase()
    rows = (
        sb.table("nursery_reviews").select("*").eq("status", "pending")
        .order("created_at").execute().data or []
    )
    nids = list({r["nursery_id"] for r in rows})
    names: dict[str, str] = {}
    if nids:
        n = sb.table("nurseries").select("id, name").in_("id", nids).execute()
        names = {x["id"]: x["name"] for x in (n.data or [])}
    for r in rows:
        r["nursery_name"] = names.get(r["nursery_id"])
    return rows


class ModerateBody(BaseModel):
    status: str


@router.patch("/admin/reviews/{review_id}", dependencies=[Depends(require_admin)])
async def moderate_review(review_id: str, body: ModerateBody):
    if body.status not in {"approved", "rejected"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="status must be approved/rejected")
    sb = get_supabase()
    res = sb.table("nursery_reviews").update({"status": body.status}).eq("id", review_id).execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Review not found")
    return res.data[0]
