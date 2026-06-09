"""
Seed 50 crops into the crops table.
Run from backend/: python scripts/seed_crops.py
Fields:
  seedling_start_week  - weeks before last frost to start indoors (None = direct sow only)
  ground_planting_week - weeks relative to last frost (+after, -before)
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client
from core.config import settings

CROPS = [
    # --- Vegetables ---
    {"name_uk": "Томати",              "name_lat": "Solanum lycopersicum",   "type": "vegetable", "base_temperature": 10.0, "gdd_to_harvest": 1100, "seedling_start_week": 8,  "ground_planting_week": 2,   "days_to_harvest": 70,  "depth_cm": 0.5,  "spacing_cm": 50.0, "lunar_preference": "above_ground"},
    {"name_uk": "Огірки",              "name_lat": "Cucumis sativus",         "type": "vegetable", "base_temperature": 10.0, "gdd_to_harvest": 800,  "seedling_start_week": 4,  "ground_planting_week": 1,   "days_to_harvest": 55,  "depth_cm": 2.0,  "spacing_cm": 50.0, "lunar_preference": "above_ground"},
    {"name_uk": "Перець болгарський",  "name_lat": "Capsicum annuum",         "type": "vegetable", "base_temperature": 10.0, "gdd_to_harvest": 1300, "seedling_start_week": 10, "ground_planting_week": 2,   "days_to_harvest": 80,  "depth_cm": 0.5,  "spacing_cm": 45.0, "lunar_preference": "above_ground"},
    {"name_uk": "Перець гострий",      "name_lat": "Capsicum annuum var.",    "type": "vegetable", "base_temperature": 10.0, "gdd_to_harvest": 1400, "seedling_start_week": 10, "ground_planting_week": 2,   "days_to_harvest": 90,  "depth_cm": 0.5,  "spacing_cm": 40.0, "lunar_preference": "above_ground"},
    {"name_uk": "Баклажан",            "name_lat": "Solanum melongena",       "type": "vegetable", "base_temperature": 10.0, "gdd_to_harvest": 1300, "seedling_start_week": 10, "ground_planting_week": 2,   "days_to_harvest": 75,  "depth_cm": 0.5,  "spacing_cm": 60.0, "lunar_preference": "above_ground"},
    {"name_uk": "Кабачки",             "name_lat": "Cucurbita pepo",          "type": "vegetable", "base_temperature": 10.0, "gdd_to_harvest": 700,  "seedling_start_week": 3,  "ground_planting_week": 1,   "days_to_harvest": 50,  "depth_cm": 2.0,  "spacing_cm": 90.0, "lunar_preference": "above_ground"},
    {"name_uk": "Цукіні",              "name_lat": "Cucurbita pepo (zucchini)","type": "vegetable", "base_temperature": 10.0, "gdd_to_harvest": 700,  "seedling_start_week": 3,  "ground_planting_week": 1,   "days_to_harvest": 50,  "depth_cm": 2.0,  "spacing_cm": 80.0, "lunar_preference": "above_ground"},
    {"name_uk": "Гарбуз",              "name_lat": "Cucurbita maxima",        "type": "vegetable", "base_temperature": 10.0, "gdd_to_harvest": 1000, "seedling_start_week": 3,  "ground_planting_week": 1,   "days_to_harvest": 90,  "depth_cm": 3.0,  "spacing_cm": 120.0,"lunar_preference": "above_ground"},
    {"name_uk": "Морква",              "name_lat": "Daucus carota",           "type": "vegetable", "base_temperature": 5.0,  "gdd_to_harvest": 900,  "seedling_start_week": None,"ground_planting_week": -4,  "days_to_harvest": 80,  "depth_cm": 1.0,  "spacing_cm": 5.0,  "lunar_preference": "below_ground"},
    {"name_uk": "Буряк столовий",      "name_lat": "Beta vulgaris",           "type": "vegetable", "base_temperature": 5.0,  "gdd_to_harvest": 800,  "seedling_start_week": None,"ground_planting_week": -3,  "days_to_harvest": 70,  "depth_cm": 2.0,  "spacing_cm": 10.0, "lunar_preference": "below_ground"},
    {"name_uk": "Картопля",            "name_lat": "Solanum tuberosum",       "type": "vegetable", "base_temperature": 7.0,  "gdd_to_harvest": 1000, "seedling_start_week": None,"ground_planting_week": -2,  "days_to_harvest": 90,  "depth_cm": 10.0, "spacing_cm": 30.0, "lunar_preference": "below_ground"},
    {"name_uk": "Цибуля ріпчаста",     "name_lat": "Allium cepa",             "type": "vegetable", "base_temperature": 5.0,  "gdd_to_harvest": 700,  "seedling_start_week": None,"ground_planting_week": -4,  "days_to_harvest": 100, "depth_cm": 2.0,  "spacing_cm": 10.0, "lunar_preference": "below_ground"},
    {"name_uk": "Цибуля-порей",        "name_lat": "Allium ampeloprasum",     "type": "vegetable", "base_temperature": 5.0,  "gdd_to_harvest": 900,  "seedling_start_week": 8,  "ground_planting_week": -2,  "days_to_harvest": 130, "depth_cm": 5.0,  "spacing_cm": 15.0, "lunar_preference": "below_ground"},
    {"name_uk": "Часник",              "name_lat": "Allium sativum",          "type": "vegetable", "base_temperature": 2.0,  "gdd_to_harvest": 600,  "seedling_start_week": None,"ground_planting_week": -6,  "days_to_harvest": 240, "depth_cm": 5.0,  "spacing_cm": 10.0, "lunar_preference": "below_ground"},
    {"name_uk": "Капуста білоголова",  "name_lat": "Brassica oleracea",       "type": "vegetable", "base_temperature": 5.0,  "gdd_to_harvest": 1200, "seedling_start_week": 6,  "ground_planting_week": -3,  "days_to_harvest": 100, "depth_cm": 1.0,  "spacing_cm": 60.0, "lunar_preference": "above_ground"},
    {"name_uk": "Капуста цвітна",      "name_lat": "Brassica oleracea botr.", "type": "vegetable", "base_temperature": 5.0,  "gdd_to_harvest": 900,  "seedling_start_week": 5,  "ground_planting_week": -2,  "days_to_harvest": 75,  "depth_cm": 1.0,  "spacing_cm": 50.0, "lunar_preference": "above_ground"},
    {"name_uk": "Броколі",             "name_lat": "Brassica oleracea ital.", "type": "vegetable", "base_temperature": 5.0,  "gdd_to_harvest": 800,  "seedling_start_week": 5,  "ground_planting_week": -2,  "days_to_harvest": 70,  "depth_cm": 1.0,  "spacing_cm": 45.0, "lunar_preference": "above_ground"},
    {"name_uk": "Кольрабі",            "name_lat": "Brassica oleracea gong.", "type": "vegetable", "base_temperature": 5.0,  "gdd_to_harvest": 700,  "seedling_start_week": 4,  "ground_planting_week": -3,  "days_to_harvest": 55,  "depth_cm": 1.0,  "spacing_cm": 20.0, "lunar_preference": "above_ground"},
    {"name_uk": "Салат листовий",      "name_lat": "Lactuca sativa",          "type": "vegetable", "base_temperature": 2.0,  "gdd_to_harvest": 500,  "seedling_start_week": 4,  "ground_planting_week": -4,  "days_to_harvest": 45,  "depth_cm": 0.5,  "spacing_cm": 20.0, "lunar_preference": "above_ground"},
    {"name_uk": "Шпинат",              "name_lat": "Spinacia oleracea",       "type": "vegetable", "base_temperature": 2.0,  "gdd_to_harvest": 400,  "seedling_start_week": None,"ground_planting_week": -5,  "days_to_harvest": 40,  "depth_cm": 1.0,  "spacing_cm": 10.0, "lunar_preference": "above_ground"},
    {"name_uk": "Редиска",             "name_lat": "Raphanus sativus",        "type": "vegetable", "base_temperature": 5.0,  "gdd_to_harvest": 350,  "seedling_start_week": None,"ground_planting_week": -4,  "days_to_harvest": 28,  "depth_cm": 1.0,  "spacing_cm": 5.0,  "lunar_preference": "below_ground"},
    {"name_uk": "Горох овочевий",      "name_lat": "Pisum sativum",           "type": "vegetable", "base_temperature": 5.0,  "gdd_to_harvest": 600,  "seedling_start_week": None,"ground_planting_week": -5,  "days_to_harvest": 60,  "depth_cm": 3.0,  "spacing_cm": 10.0, "lunar_preference": "above_ground"},
    {"name_uk": "Квасоля звичайна",    "name_lat": "Phaseolus vulgaris",      "type": "vegetable", "base_temperature": 10.0, "gdd_to_harvest": 700,  "seedling_start_week": None,"ground_planting_week": 0,   "days_to_harvest": 65,  "depth_cm": 3.0,  "spacing_cm": 10.0, "lunar_preference": "above_ground"},
    {"name_uk": "Квасоля стручкова",   "name_lat": "Phaseolus vulgaris var.","type": "vegetable", "base_temperature": 10.0, "gdd_to_harvest": 650,  "seedling_start_week": None,"ground_planting_week": 0,   "days_to_harvest": 58,  "depth_cm": 3.0,  "spacing_cm": 15.0, "lunar_preference": "above_ground"},
    {"name_uk": "Кукурудза цукрова",   "name_lat": "Zea mays saccharata",     "type": "vegetable", "base_temperature": 10.0, "gdd_to_harvest": 1300, "seedling_start_week": None,"ground_planting_week": 1,   "days_to_harvest": 85,  "depth_cm": 4.0,  "spacing_cm": 25.0, "lunar_preference": "above_ground"},
    {"name_uk": "Ріпа",                "name_lat": "Brassica rapa",           "type": "vegetable", "base_temperature": 5.0,  "gdd_to_harvest": 500,  "seedling_start_week": None,"ground_planting_week": -4,  "days_to_harvest": 45,  "depth_cm": 1.0,  "spacing_cm": 10.0, "lunar_preference": "below_ground"},
    {"name_uk": "Пастернак",           "name_lat": "Pastinaca sativa",        "type": "vegetable", "base_temperature": 5.0,  "gdd_to_harvest": 1000, "seedling_start_week": None,"ground_planting_week": -5,  "days_to_harvest": 120, "depth_cm": 2.0,  "spacing_cm": 15.0, "lunar_preference": "below_ground"},
    {"name_uk": "Селера коренева",     "name_lat": "Apium graveolens rapac.", "type": "vegetable", "base_temperature": 5.0,  "gdd_to_harvest": 1200, "seedling_start_week": 10, "ground_planting_week": -2,  "days_to_harvest": 120, "depth_cm": 0.5,  "spacing_cm": 30.0, "lunar_preference": "above_ground"},
    # --- Herbs ---
    {"name_uk": "Петрушка",            "name_lat": "Petroselinum crispum",    "type": "herb",      "base_temperature": 5.0,  "gdd_to_harvest": 600,  "seedling_start_week": None,"ground_planting_week": -4,  "days_to_harvest": 75,  "depth_cm": 1.0,  "spacing_cm": 15.0, "lunar_preference": "above_ground"},
    {"name_uk": "Кріп",                "name_lat": "Anethum graveolens",      "type": "herb",      "base_temperature": 5.0,  "gdd_to_harvest": 500,  "seedling_start_week": None,"ground_planting_week": -4,  "days_to_harvest": 45,  "depth_cm": 1.0,  "spacing_cm": 10.0, "lunar_preference": "above_ground"},
    {"name_uk": "Базилік",             "name_lat": "Ocimum basilicum",        "type": "herb",      "base_temperature": 10.0, "gdd_to_harvest": 700,  "seedling_start_week": 6,  "ground_planting_week": 1,   "days_to_harvest": 60,  "depth_cm": 0.5,  "spacing_cm": 20.0, "lunar_preference": "above_ground"},
    {"name_uk": "М'ята",               "name_lat": "Mentha",                  "type": "herb",      "base_temperature": 5.0,  "gdd_to_harvest": 500,  "seedling_start_week": 8,  "ground_planting_week": -2,  "days_to_harvest": 60,  "depth_cm": 0.5,  "spacing_cm": 30.0, "lunar_preference": "above_ground"},
    {"name_uk": "Меліса",              "name_lat": "Melissa officinalis",     "type": "herb",      "base_temperature": 5.0,  "gdd_to_harvest": 600,  "seedling_start_week": 8,  "ground_planting_week": -1,  "days_to_harvest": 70,  "depth_cm": 0.5,  "spacing_cm": 30.0, "lunar_preference": "above_ground"},
    {"name_uk": "Коріандр",            "name_lat": "Coriandrum sativum",      "type": "herb",      "base_temperature": 5.0,  "gdd_to_harvest": 450,  "seedling_start_week": None,"ground_planting_week": -4,  "days_to_harvest": 42,  "depth_cm": 1.0,  "spacing_cm": 10.0, "lunar_preference": "above_ground"},
    {"name_uk": "Орегано",             "name_lat": "Origanum vulgare",        "type": "herb",      "base_temperature": 5.0,  "gdd_to_harvest": 600,  "seedling_start_week": 8,  "ground_planting_week": -1,  "days_to_harvest": 75,  "depth_cm": 0.5,  "spacing_cm": 25.0, "lunar_preference": "above_ground"},
    {"name_uk": "Тим'ян (чебрець)",    "name_lat": "Thymus vulgaris",         "type": "herb",      "base_temperature": 5.0,  "gdd_to_harvest": 500,  "seedling_start_week": 8,  "ground_planting_week": -1,  "days_to_harvest": 70,  "depth_cm": 0.5,  "spacing_cm": 20.0, "lunar_preference": "above_ground"},
    {"name_uk": "Гірчиця",             "name_lat": "Sinapis alba",            "type": "herb",      "base_temperature": 5.0,  "gdd_to_harvest": 350,  "seedling_start_week": None,"ground_planting_week": -5,  "days_to_harvest": 35,  "depth_cm": 1.0,  "spacing_cm": 5.0,  "lunar_preference": "above_ground"},
    # --- Flowers ---
    {"name_uk": "Чорнобривці",         "name_lat": "Tagetes",                 "type": "flower",    "base_temperature": 10.0, "gdd_to_harvest": 800,  "seedling_start_week": 6,  "ground_planting_week": 1,   "days_to_harvest": 70,  "depth_cm": 0.5,  "spacing_cm": 25.0, "lunar_preference": "above_ground"},
    {"name_uk": "Петунія",             "name_lat": "Petunia",                 "type": "flower",    "base_temperature": 10.0, "gdd_to_harvest": 900,  "seedling_start_week": 10, "ground_planting_week": 2,   "days_to_harvest": 80,  "depth_cm": 0.5,  "spacing_cm": 30.0, "lunar_preference": "above_ground"},
    {"name_uk": "Настурція",           "name_lat": "Tropaeolum majus",        "type": "flower",    "base_temperature": 10.0, "gdd_to_harvest": 600,  "seedling_start_week": None,"ground_planting_week": 0,   "days_to_harvest": 55,  "depth_cm": 1.0,  "spacing_cm": 25.0, "lunar_preference": "above_ground"},
    {"name_uk": "Соняшник",            "name_lat": "Helianthus annuus",       "type": "flower",    "base_temperature": 10.0, "gdd_to_harvest": 900,  "seedling_start_week": None,"ground_planting_week": 0,   "days_to_harvest": 80,  "depth_cm": 2.0,  "spacing_cm": 40.0, "lunar_preference": "above_ground"},
    {"name_uk": "Астра однорічна",     "name_lat": "Callistephus chinensis",  "type": "flower",    "base_temperature": 10.0, "gdd_to_harvest": 800,  "seedling_start_week": 8,  "ground_planting_week": 0,   "days_to_harvest": 90,  "depth_cm": 0.5,  "spacing_cm": 25.0, "lunar_preference": "above_ground"},
    {"name_uk": "Гербера",             "name_lat": "Gerbera jamesonii",       "type": "flower",    "base_temperature": 10.0, "gdd_to_harvest": 1000, "seedling_start_week": 10, "ground_planting_week": 2,   "days_to_harvest": 100, "depth_cm": 0.5,  "spacing_cm": 30.0, "lunar_preference": "above_ground"},
    {"name_uk": "Калібрахоа",          "name_lat": "Calibrachoa",             "type": "flower",    "base_temperature": 10.0, "gdd_to_harvest": 850,  "seedling_start_week": 10, "ground_planting_week": 2,   "days_to_harvest": 85,  "depth_cm": 0.5,  "spacing_cm": 20.0, "lunar_preference": "above_ground"},
    # --- Berries ---
    {"name_uk": "Полуниця садова",     "name_lat": "Fragaria × ananassa",    "type": "berry",     "base_temperature": 5.0,  "gdd_to_harvest": 700,  "seedling_start_week": None,"ground_planting_week": -4,  "days_to_harvest": 90,  "depth_cm": None, "spacing_cm": 30.0, "lunar_preference": "above_ground"},
    {"name_uk": "Суниця лісова",       "name_lat": "Fragaria vesca",          "type": "berry",     "base_temperature": 5.0,  "gdd_to_harvest": 600,  "seedling_start_week": 8,  "ground_planting_week": -2,  "days_to_harvest": 60,  "depth_cm": None, "spacing_cm": 25.0, "lunar_preference": "above_ground"},
    {"name_uk": "Малина",              "name_lat": "Rubus idaeus",            "type": "berry",     "base_temperature": 5.0,  "gdd_to_harvest": 1200, "seedling_start_week": None,"ground_planting_week": -8,  "days_to_harvest": 120, "depth_cm": None, "spacing_cm": 60.0, "lunar_preference": "above_ground"},
    {"name_uk": "Смородина чорна",     "name_lat": "Ribes nigrum",            "type": "berry",     "base_temperature": 5.0,  "gdd_to_harvest": 900,  "seedling_start_week": None,"ground_planting_week": -8,  "days_to_harvest": 100, "depth_cm": None, "spacing_cm": 100.0,"lunar_preference": "above_ground"},
    {"name_uk": "Аґрус",               "name_lat": "Ribes uva-crispa",        "type": "berry",     "base_temperature": 5.0,  "gdd_to_harvest": 900,  "seedling_start_week": None,"ground_planting_week": -8,  "days_to_harvest": 100, "depth_cm": None, "spacing_cm": 100.0,"lunar_preference": "above_ground"},
    {"name_uk": "Ожина",               "name_lat": "Rubus fruticosus",        "type": "berry",     "base_temperature": 5.0,  "gdd_to_harvest": 1100, "seedling_start_week": None,"ground_planting_week": -6,  "days_to_harvest": 110, "depth_cm": None, "spacing_cm": 90.0, "lunar_preference": "above_ground"},
]


def main() -> None:
    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    existing = supabase.table("crops").select("id", count="exact").execute()
    if existing.count and existing.count > 0:
        print(f"crops already has {existing.count} rows — skipping.")
        return

    result = supabase.table("crops").insert(CROPS).execute()
    print(f"Inserted {len(result.data)} crops.")


if __name__ == "__main__":
    main()
