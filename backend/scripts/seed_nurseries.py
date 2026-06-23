"""
Seed 3 verified test nurseries.
Run from backend/: python scripts/seed_nurseries.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client
from core.config import settings

sb = create_client(settings.supabase_url, settings.supabase_service_key)

# Look up region IDs
def region_id(city: str) -> str | None:
    r = sb.table("climate_zones").select("id").eq("city", city).limit(1).execute()
    return r.data[0]["id"] if r.data else None

kyiv_id    = region_id("Київ")
lviv_id    = region_id("Львів")
kharkiv_id = region_id("Харків")

NURSERIES = [
    {
        "name":        "Розсадник «Квітучий сад» (демо)",
        "description": "Повний демо-розсадник: декоративні рослини, троянди, хвойні, плодові "
                       "саджанці та добрива. Власна теплиця, доставка по Україні, консультації "
                       "агронома щодня. Цей запис заповнений усіма полями — для перегляду панелі.",
        "address":     "вул. Квіткова, 7, Київ",
        "latitude":    50.4625,
        "longitude":   30.5180,
        "phone":       "+38 067 777-88-99",
        "email":       "hello@kvituchysad.ua",
        "website":     "https://kvituchysad.ua",
        "region_id":   kyiv_id,
        "status":      "verified",
        "tags":        ["троянди", "хвойні", "саджанці плодових", "декоративні кущі", "добрива"],
        "admin_tags":  ["перевірено", "топ-продавець"],
        "photos": [
            "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=70",
            "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=70",
            "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=900&q=70",
            "https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?auto=format&fit=crop&w=900&q=70",
        ],
        "videos": [
            "https://www.youtube.com/watch?v=ScMzIvxBSi4",
            "https://www.w3schools.com/html/mov_bbb.mp4",
        ],
    },
    {
        "name":        "Садовий центр «Зелена садиба»",
        "description": "Широкий асортимент розсади овочів, квітів та садових рослин. Консультації агронома.",
        "address":     "вул. Садова, 12, Київ",
        "latitude":    50.4501,
        "longitude":   30.5234,
        "phone":       "+38 044 123-45-67",
        "email":       "info@zelenasadyba.ua",
        "website":     "https://zelenasadyba.ua",
        "region_id":   kyiv_id,
        "status":      "verified",
    },
    {
        "name":        "Розсадник «Природа»",
        "description": "Органічна розсада томатів, перцю, капусти. Також плодові дерева та ягідні кущі.",
        "address":     "вул. Городоцька, 156, Львів",
        "latitude":    49.8397,
        "longitude":   24.0297,
        "phone":       "+38 032 987-65-43",
        "email":       "pryroda.lviv@gmail.com",
        "website":     None,
        "region_id":   lviv_id,
        "status":      "verified",
    },
    {
        "name":        "Садовий центр «Врожай»",
        "description": "Розсада та насіння від провідних виробників. Добрива, інструменти, ґрунт.",
        "address":     "просп. Науки, 44, Харків",
        "latitude":    49.9935,
        "longitude":   36.2304,
        "phone":       "+38 057 555-00-11",
        "email":       "vrozhai.kh@ukr.net",
        "website":     None,
        "region_id":   kharkiv_id,
        "status":      "verified",
    },
]

existing = sb.table("nurseries").select("name").execute()
existing_names = {r["name"] for r in (existing.data or [])}

to_insert = [n for n in NURSERIES if n["name"] not in existing_names]

if not to_insert:
    print("All test nurseries already exist — skipping.")
else:
    result = sb.table("nurseries").insert(to_insert).execute()
    print(f"Inserted {len(result.data)} nurseries.")
    for n in result.data:
        print(f"  ✓ {n['name']}")
