"""
Seed 25 Ukrainian oblasts + Kyiv city into climate_zones.
Run from backend/: python scripts/seed_climate_zones.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client
from core.config import settings

CLIMATE_ZONES = [
    {"region": "Вінницька обл.",       "city": "Вінниця",           "usda_zone": "5b", "avg_last_frost_date": "04-20", "avg_first_frost_date": "10-10", "latitude": 49.232800, "longitude": 28.481600, "annual_active_temp_sum": 2700},
    {"region": "Волинська обл.",        "city": "Луцьк",             "usda_zone": "5b", "avg_last_frost_date": "04-25", "avg_first_frost_date": "10-05", "latitude": 50.747200, "longitude": 25.325400, "annual_active_temp_sum": 2500},
    {"region": "Дніпропетровська обл.", "city": "Дніпро",            "usda_zone": "6a", "avg_last_frost_date": "04-10", "avg_first_frost_date": "10-20", "latitude": 48.464700, "longitude": 35.046200, "annual_active_temp_sum": 3100},
    {"region": "Донецька обл.",         "city": "Краматорськ",       "usda_zone": "6a", "avg_last_frost_date": "04-10", "avg_first_frost_date": "10-15", "latitude": 48.733600, "longitude": 37.586100, "annual_active_temp_sum": 2900},
    {"region": "Житомирська обл.",      "city": "Житомир",           "usda_zone": "5b", "avg_last_frost_date": "04-30", "avg_first_frost_date": "10-01", "latitude": 50.254700, "longitude": 28.658700, "annual_active_temp_sum": 2400},
    {"region": "Закарпатська обл.",     "city": "Ужгород",           "usda_zone": "7a", "avg_last_frost_date": "03-25", "avg_first_frost_date": "10-30", "latitude": 48.623900, "longitude": 22.295300, "annual_active_temp_sum": 3400},
    {"region": "Запорізька обл.",       "city": "Запоріжжя",         "usda_zone": "6b", "avg_last_frost_date": "04-01", "avg_first_frost_date": "10-25", "latitude": 47.838800, "longitude": 35.139600, "annual_active_temp_sum": 3300},
    {"region": "Івано-Франківська обл.","city": "Івано-Франківськ",  "usda_zone": "5b", "avg_last_frost_date": "04-25", "avg_first_frost_date": "10-05", "latitude": 48.922600, "longitude": 24.711100, "annual_active_temp_sum": 2600},
    {"region": "Київська обл.",         "city": "Київ",              "usda_zone": "5b", "avg_last_frost_date": "04-20", "avg_first_frost_date": "10-10", "latitude": 50.450100, "longitude": 30.523400, "annual_active_temp_sum": 2700},
    {"region": "Кіровоградська обл.",   "city": "Кропивницький",     "usda_zone": "6a", "avg_last_frost_date": "04-10", "avg_first_frost_date": "10-15", "latitude": 48.513200, "longitude": 32.259700, "annual_active_temp_sum": 2900},
    {"region": "Луганська обл.",        "city": "Сєвєродонецьк",     "usda_zone": "6a", "avg_last_frost_date": "04-12", "avg_first_frost_date": "10-12", "latitude": 48.948400, "longitude": 38.487800, "annual_active_temp_sum": 2900},
    {"region": "Львівська обл.",        "city": "Львів",             "usda_zone": "5b", "avg_last_frost_date": "04-20", "avg_first_frost_date": "10-10", "latitude": 49.839700, "longitude": 24.029700, "annual_active_temp_sum": 2600},
    {"region": "Миколаївська обл.",     "city": "Миколаїв",          "usda_zone": "6b", "avg_last_frost_date": "03-25", "avg_first_frost_date": "10-25", "latitude": 46.975800, "longitude": 31.994600, "annual_active_temp_sum": 3300},
    {"region": "Одеська обл.",          "city": "Одеса",             "usda_zone": "7a", "avg_last_frost_date": "03-15", "avg_first_frost_date": "11-01", "latitude": 46.482500, "longitude": 30.723300, "annual_active_temp_sum": 3500},
    {"region": "Полтавська обл.",       "city": "Полтава",           "usda_zone": "5b", "avg_last_frost_date": "04-20", "avg_first_frost_date": "10-10", "latitude": 49.588300, "longitude": 34.551400, "annual_active_temp_sum": 2800},
    {"region": "Рівненська обл.",       "city": "Рівне",             "usda_zone": "5b", "avg_last_frost_date": "04-25", "avg_first_frost_date": "10-05", "latitude": 50.619900, "longitude": 26.251600, "annual_active_temp_sum": 2500},
    {"region": "Сумська обл.",          "city": "Суми",              "usda_zone": "5b", "avg_last_frost_date": "04-25", "avg_first_frost_date": "10-05", "latitude": 50.907700, "longitude": 34.798100, "annual_active_temp_sum": 2600},
    {"region": "Тернопільська обл.",    "city": "Тернопіль",         "usda_zone": "5b", "avg_last_frost_date": "04-25", "avg_first_frost_date": "10-05", "latitude": 49.553500, "longitude": 25.594800, "annual_active_temp_sum": 2600},
    {"region": "Харківська обл.",       "city": "Харків",            "usda_zone": "5b", "avg_last_frost_date": "04-15", "avg_first_frost_date": "10-15", "latitude": 49.993500, "longitude": 36.230400, "annual_active_temp_sum": 2800},
    {"region": "Херсонська обл.",       "city": "Херсон",            "usda_zone": "6b", "avg_last_frost_date": "03-20", "avg_first_frost_date": "10-30", "latitude": 46.635400, "longitude": 32.616900, "annual_active_temp_sum": 3400},
    {"region": "Хмельницька обл.",      "city": "Хмельницький",      "usda_zone": "5b", "avg_last_frost_date": "04-25", "avg_first_frost_date": "10-05", "latitude": 49.422900, "longitude": 26.987000, "annual_active_temp_sum": 2600},
    {"region": "Черкаська обл.",        "city": "Черкаси",           "usda_zone": "5b", "avg_last_frost_date": "04-20", "avg_first_frost_date": "10-10", "latitude": 49.444400, "longitude": 32.059800, "annual_active_temp_sum": 2800},
    {"region": "Чернівецька обл.",      "city": "Чернівці",          "usda_zone": "6a", "avg_last_frost_date": "04-05", "avg_first_frost_date": "10-20", "latitude": 48.292100, "longitude": 25.935800, "annual_active_temp_sum": 2900},
    {"region": "Чернігівська обл.",     "city": "Чернігів",          "usda_zone": "5a", "avg_last_frost_date": "05-01", "avg_first_frost_date": "09-30", "latitude": 51.498200, "longitude": 31.289300, "annual_active_temp_sum": 2400},
    {"region": "м. Київ",               "city": "Київ",              "usda_zone": "5b", "avg_last_frost_date": "04-18", "avg_first_frost_date": "10-12", "latitude": 50.450100, "longitude": 30.523400, "annual_active_temp_sum": 2750},
]


def main() -> None:
    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    existing = supabase.table("climate_zones").select("id", count="exact").execute()
    if existing.count and existing.count > 0:
        print(f"climate_zones already has {existing.count} rows — skipping.")
        return

    result = supabase.table("climate_zones").insert(CLIMATE_ZONES).execute()
    print(f"Inserted {len(result.data)} climate zones.")


if __name__ == "__main__":
    main()
