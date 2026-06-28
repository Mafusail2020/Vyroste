"""
AI Агроном — conversational agent.

A chat where Claude runs the native tool-use loop and pulls the user's real
data mid-conversation: garden context (region/frost/GDD/forecast/varieties),
the knowledge base, nearby nurseries, and the planting calendar. No LangGraph —
a simple bounded `while stop_reason == "tool_use"` loop.

Key-gated like /diagnose: 503 if ANTHROPIC_API_KEY is unset. Service-key client
bypasses RLS, so handlers filter by user_id / ownership explicitly.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import get_current_user
from app.deps import get_supabase
from app.diagnose import _garden_context
from app.gdd import _resolve_calendar
from app.knowledge import _collect_text
from app.calendar import compute_windows_for
from core.config import settings

router = APIRouter(prefix="/agronom")

_MAX_TOOL_ITERS = 5

_SYSTEM = (
    "Ти — AI-агроном Виросте, помічник для українських садівників-аматорів. Відповідай "
    "українською, простою людяною мовою (щоб зрозуміла навіть бабуся), стисло й по суті. "
    "Активно користуйся інструментами, щоб давати поради під конкретні умови користувача:\n"
    "- get_garden_context — регіон, заморозки, GDD, прогноз погоди, що вирощує;\n"
    "- search_knowledge — статті бази знань Виросте (посилайся на них за назвою);\n"
    "- find_nursery — де поряд купити рослини чи засоби;\n"
    "- get_calendar — що і коли садити/збирати у календарі користувача.\n"
    "Якщо радиш обробку — враховуй прогноз опадів (не обприскувати перед дощем). "
    "Не вигадуй фактів; якщо чогось не знаєш — скажи чесно."
)

_TOOLS = [
    {
        "name": "get_garden_context",
        "description": "Дані про сад користувача: регіон, дата останніх заморозків, накопичена сума "
                       "температур (GDD), прогноз погоди на 5 днів, перелік культур, які він вирощує.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "search_knowledge",
        "description": "Пошук у базі знань Виросте (статті агрономів). Повертає назви, короткі "
                       "уривки та посилання. Використовуй для обґрунтованих, перевірених порад.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "Пошуковий запит українською"}},
            "required": ["query"],
        },
    },
    {
        "name": "find_nursery",
        "description": "Знайти розсадники / садові центри поруч із користувачем (де купити рослини "
                       "або засоби захисту). Можна звузити за тегом.",
        "input_schema": {
            "type": "object",
            "properties": {"tag": {"type": "string", "description": "Необов'язковий тег-фільтр"}},
        },
    },
    {
        "name": "get_calendar",
        "description": "Що користувач посадив і коли садити/збирати — вікна посіву та збору врожаю "
                       "з його календаря.",
        "input_schema": {"type": "object", "properties": {}},
    },
]


# ── Tool implementations ────────────────────────────────────────────────────
def _tool_garden_context(sb, user_id: str, chat: dict, _inp: dict) -> str:
    text, _banner = _garden_context(sb, user_id, chat.get("calendar_id"))
    return text


def _tool_search_knowledge(sb, _user_id: str, _chat: dict, inp: dict) -> str:
    q = (inp.get("query") or "").strip()
    query = sb.table("kb_articles").select("title,slug,excerpt,content").eq("published", True)
    if q:
        query = query.or_(f"title.ilike.%{q}%,excerpt.ilike.%{q}%")
    rows = query.limit(4).execute().data or []
    if not rows:
        return "У базі знань нічого не знайдено за цим запитом."
    out = []
    for a in rows:
        snippet = (a.get("excerpt") or _collect_text(a.get("content")))[:300]
        out.append(f"• «{a['title']}» (/knowledge/{a['slug']}): {snippet}")
    return "\n".join(out)


def _tool_find_nursery(sb, user_id: str, chat: dict, inp: dict) -> str:
    cal = _resolve_calendar(sb, user_id, chat.get("calendar_id"))
    region_id = (cal or {}).get("region_id")
    query = sb.table("nurseries").select("name,address,phone,tags,region_id").eq("status", "verified")
    if region_id:
        query = query.eq("region_id", region_id)
    tag = (inp.get("tag") or "").strip()
    if tag:
        query = query.contains("tags", [tag])
    rows = query.limit(5).execute().data or []
    if not rows:
        return "Поряд не знайдено верифікованих розсадників."
    out = []
    for n in rows:
        bits = [n["name"]]
        if n.get("address"):
            bits.append(n["address"])
        if n.get("phone"):
            bits.append(n["phone"])
        out.append("• " + " · ".join(bits))
    return "\n".join(out)


def _tool_get_calendar(sb, user_id: str, chat: dict, _inp: dict) -> str:
    cal = _resolve_calendar(sb, user_id, chat.get("calendar_id"))
    if not cal or not cal.get("region_id"):
        return "У користувача ще немає налаштованого календаря з регіоном."
    windows = compute_windows_for(sb, cal["region_id"], cal.get("selected_varieties") or [])
    if not windows:
        return "У календарі ще немає доданих культур."
    out = []
    for w in windows[:15]:
        out.append(
            f"• {w['crop_name']}: посадка в ґрунт ~{w['ground_planting']}, "
            f"збір {w['harvest_start']}–{w['harvest_end']}"
        )
    return "\n".join(out)


_TOOL_FNS = {
    "get_garden_context": _tool_garden_context,
    "search_knowledge":   _tool_search_knowledge,
    "find_nursery":       _tool_find_nursery,
    "get_calendar":       _tool_get_calendar,
}


def _scan_context(sb, chat: dict) -> str:
    """If the chat was opened from a diagnosis, give the agent that context."""
    scan_id = chat.get("scan_id")
    if not scan_id:
        return ""
    r = sb.table("plant_scans").select("crop,diagnosis,steps,timing").eq("id", scan_id).maybe_single().execute()
    s = r.data
    if not s:
        return ""
    return (
        f"\n\nКористувач щойно зробив фотодіагностику. Результат — рослина: {s.get('crop')}, "
        f"проблема: {s.get('diagnosis')}. Рекомендований час дії: {s.get('timing')}. "
        "Відповідай у контексті цього діагнозу."
    )


def _run_agent(sb, user_id: str, chat: dict, history: list[dict]) -> tuple[str, list[str]]:
    """Bounded tool-use loop. Returns (final_text, tool_names_used)."""
    from anthropic import Anthropic
    client = Anthropic(api_key=settings.anthropic_api_key)

    system = _SYSTEM + _scan_context(sb, chat)
    messages: list[dict] = [{"role": m["role"], "content": m["content"]} for m in history]
    used: list[str] = []
    resp = None

    for _ in range(_MAX_TOOL_ITERS):
        resp = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1024,
            system=system,
            tools=_TOOLS,
            messages=messages,
        )
        if resp.stop_reason != "tool_use":
            break
        messages.append({"role": "assistant", "content": resp.content})
        results = []
        for block in resp.content:
            if getattr(block, "type", None) == "tool_use":
                used.append(block.name)
                fn = _TOOL_FNS.get(block.name)
                try:
                    out = fn(sb, user_id, chat, block.input or {}) if fn else "Невідомий інструмент."
                except Exception as e:
                    out = f"Помилка інструмента: {e}"
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": out or "—"})
        messages.append({"role": "user", "content": results})

    text = ""
    if resp is not None:
        text = "".join(getattr(b, "text", "") for b in resp.content if getattr(b, "type", None) == "text")
    return text or "Вибач, не вдалося сформувати відповідь.", list(dict.fromkeys(used))


# ── Schemas ─────────────────────────────────────────────────────────────────
class CreateChat(BaseModel):
    calendar_id: str | None = None
    scan_id: str | None = None
    message: str | None = None


class SendMessage(BaseModel):
    content: str


def _own_chat(sb, chat_id: str, user_id: str) -> dict:
    r = sb.table("agronom_chats").select("*").eq("id", chat_id).eq("user_id", user_id).maybe_single().execute()
    if not r.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Chat not found")
    return r.data


def _require_key():
    if not settings.anthropic_api_key:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI ще не налаштовано — встановіть ANTHROPIC_API_KEY у backend/.env",
        )


def _messages(sb, chat_id: str) -> list[dict]:
    return (
        sb.table("agronom_messages").select("id,role,content,tool_trace,created_at")
        .eq("chat_id", chat_id).order("created_at").execute().data or []
    )


# ── Endpoints ───────────────────────────────────────────────────────────────
@router.get("/chats")
async def list_chats(current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    return (
        sb.table("agronom_chats").select("*")
        .eq("user_id", current_user["id"]).order("updated_at", desc=True).execute().data or []
    )


@router.get("/chats/{chat_id}")
async def get_chat(chat_id: str, current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    chat = _own_chat(sb, chat_id, current_user["id"])
    return {"chat": chat, "messages": _messages(sb, chat_id)}


@router.post("/chats", status_code=status.HTTP_201_CREATED)
async def create_chat(body: CreateChat, current_user: dict = Depends(get_current_user)):
    _require_key()
    sb = get_supabase()
    title = (body.message or "Нова розмова").strip()[:60] or "Нова розмова"
    chat = sb.table("agronom_chats").insert({
        "user_id":     current_user["id"],
        "title":       title,
        "calendar_id": body.calendar_id,
        "scan_id":     body.scan_id,
    }).execute().data[0]

    if body.message and body.message.strip():
        user_msg = sb.table("agronom_messages").insert({
            "chat_id": chat["id"], "role": "user", "content": body.message.strip(),
        }).execute().data[0]
        text, used = _run_agent(sb, current_user["id"], chat, [user_msg])
        sb.table("agronom_messages").insert({
            "chat_id": chat["id"], "role": "assistant", "content": text, "tool_trace": used,
        }).execute()
        sb.table("agronom_chats").update({"title": title}).eq("id", chat["id"]).execute()

    return {"chat": chat, "messages": _messages(sb, chat["id"])}


@router.post("/chats/{chat_id}/message")
async def send_message(chat_id: str, body: SendMessage, current_user: dict = Depends(get_current_user)):
    _require_key()
    sb = get_supabase()
    chat = _own_chat(sb, chat_id, current_user["id"])

    content = body.content.strip()
    if not content:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Порожнє повідомлення")

    sb.table("agronom_messages").insert({"chat_id": chat_id, "role": "user", "content": content}).execute()
    history = _messages(sb, chat_id)  # includes the just-stored user message
    text, used = _run_agent(sb, current_user["id"], chat, history)
    assistant = sb.table("agronom_messages").insert({
        "chat_id": chat_id, "role": "assistant", "content": text, "tool_trace": used,
    }).execute().data[0]
    # Touch the row → set_updated_at trigger bumps updated_at to now().
    sb.table("agronom_chats").update({"title": chat["title"]}).eq("id", chat_id).execute()
    return assistant


@router.delete("/chats/{chat_id}")
async def delete_chat(chat_id: str, current_user: dict = Depends(get_current_user)):
    sb = get_supabase()
    _own_chat(sb, chat_id, current_user["id"])
    sb.table("agronom_chats").delete().eq("id", chat_id).execute()
    return {"deleted": chat_id}
