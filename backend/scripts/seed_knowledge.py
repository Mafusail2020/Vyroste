"""
Seed Knowledge Base categories + sample articles.
Run from backend/: python scripts/seed_knowledge.py

Requires migration 011_knowledge_base.sql applied. Idempotent (skips if articles exist).
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client
from core.config import settings
from app.knowledge import _slugify, _reading_minutes

sb = create_client(settings.supabase_url, settings.supabase_service_key)


def h2(text: str) -> dict:
    return {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": text}]}


def p(text: str) -> dict:
    return {"type": "paragraph", "content": [{"type": "text", "text": text}]}


def doc(*nodes: dict) -> dict:
    return {"type": "doc", "content": list(nodes)}


CATEGORIES = [
    {"name": "Вирощування",        "emoji": "🌱", "sort_order": 1},
    {"name": "Хвороби та шкідники", "emoji": "🐛", "sort_order": 2},
    {"name": "Місячний календар",   "emoji": "🌙", "sort_order": 3},
    {"name": "Поради",             "emoji": "💡", "sort_order": 4},
]

# (category name, title, excerpt, tags, content doc)
ARTICLES = [
    (
        "Вирощування",
        "Як виростити міцну розсаду томатів удома",
        "Покроковий гід: від вибору насіння до загартовування перед висадкою у відкритий ґрунт.",
        ["томати", "розсада"],
        doc(
            p("Міцна розсада — половина успіху майбутнього врожаю. Розберемо ключові етапи."),
            h2("Підготовка насіння"),
            p("Перед посівом насіння замочують у теплій воді на 12 годин, потім протруюють у слабкому розчині марганцівки 20 хвилин. Це підвищує схожість і знищує збудників хвороб."),
            h2("Посів і температура"),
            p("Сійте за 55–65 днів до висадки. Оптимальна температура проростання — +23…+25 °C. Після появи сходів знижуйте до +18 °C на тиждень, щоб розсада не витягувалась."),
            h2("Пікірування"),
            p("У фазі 2 справжніх листків пересадіть сіянці в окремі стаканчики. Заглиблюйте до сім'ядольних листків — утворяться додаткові корені."),
            h2("Загартовування"),
            p("За 10–14 днів до висадки виносьте розсаду на свіже повітря, поступово збільшуючи час. Так рослини легше переживуть пересадку."),
        ),
    ),
    (
        "Хвороби та шкідники",
        "Фітофтороз: як розпізнати і зупинити вчасно",
        "Найнебезпечніша хвороба пасльонових. Ознаки, профілактика та органічні методи боротьби.",
        ["хвороби", "томати", "профілактика"],
        doc(
            p("Фітофтороз здатний знищити врожай за лічені дні у вологу погоду. Головне — профілактика."),
            h2("Ознаки"),
            p("Бурі плями на листі та стеблах, білий наліт із нижнього боку листка, тверді темні плями на плодах."),
            h2("Профілактика"),
            p("Не загущуйте посадки, поливайте під корінь зранку, мульчуйте ґрунт. Чергуйте культури — не садіть томати після картоплі."),
            h2("Боротьба"),
            p("За перших ознак обробіть рослини настоєм часнику або біопрепаратами. У запущених випадках застосовують мідьвмісні фунгіциди згідно з інструкцією."),
        ),
    ),
    (
        "Місячний календар",
        "Чому садівники орієнтуються на фази Місяця",
        "Розбираємо, що таке наземні та підземні дні та як це впливає на посів і збір урожаю.",
        ["місяць", "календар"],
        doc(
            p("Місячний календар — давня практика, що структурує роботи на городі за фазами Місяця."),
            h2("Зростаючий Місяць"),
            p("Соки рухаються вгору — сприятливий час для посіву надземних культур: томатів, перцю, зелені, квітів."),
            h2("Спадний Місяць"),
            p("Енергія спрямована до коренів — найкраще садити коренеплоди: моркву, буряк, картоплю, цибулю."),
            h2("Як це працює у Виросте"),
            p("Увімкніть шар «Місяць» у календарі — сприятливі дні підсвічуються автоматично залежно від культури."),
        ),
    ),
    (
        "Поради",
        "Мульчування: простий прийом, що економить воду й час",
        "Який матеріал обрати, якої товщини шар та яких помилок уникати.",
        ["мульча", "догляд", "ґрунт"],
        doc(
            p("Мульча зберігає вологу, пригнічує бур'яни й живить ґрунт. Розглянемо практику."),
            h2("Які матеріали"),
            p("Скошена трава, солома, тріска, компост. Для ягід — солома, для дерев — тріска, для овочів — трава чи компост."),
            h2("Товщина шару"),
            p("Оптимально 5–8 см. Тонший шар не стримає бур'яни, товстіший — ускладнить аерацію."),
            h2("Помилки"),
            p("Не вкладайте мульчу впритул до стебла — залиште 5 см, щоб уникнути загнивання кореневої шийки."),
        ),
    ),
]


def main() -> None:
    existing = sb.table("kb_articles").select("id", count="exact").execute()
    if existing.count and existing.count > 0:
        print(f"kb_articles already has {existing.count} rows — skipping.")
        return

    # Categories (upsert by slug).
    cat_id: dict[str, str] = {}
    for c in CATEGORIES:
        slug = _slugify(c["name"])
        row = sb.table("kb_categories").upsert({**c, "slug": slug}, on_conflict="slug").execute()
        cat_id[c["name"]] = row.data[0]["id"]
    print(f"Seeded {len(CATEGORIES)} categories.")

    payload = []
    for cat, title, excerpt, tags, content in ARTICLES:
        payload.append({
            "category_id": cat_id[cat],
            "title": title,
            "slug": _slugify(title),
            "excerpt": excerpt,
            "content": content,
            "tags": tags,
            "published": True,
            "reading_minutes": _reading_minutes(content),
        })
    res = sb.table("kb_articles").insert(payload).execute()
    print(f"Inserted {len(res.data)} articles:")
    for a in res.data:
        print(f"  /{a['slug']}")


if __name__ == "__main__":
    main()
