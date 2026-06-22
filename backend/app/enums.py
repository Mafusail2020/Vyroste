"""
Domain enums shared by the SQLAlchemy models and the Pydantic schemas.

Kept dependency-free (no sqlalchemy import) so the Supabase-client runtime can
use these without pulling in the ORM stack.
"""
import enum


class GrowingMethod(str, enum.Enum):
    """How a variety reaches the ground."""
    SEEDLING = "seedling"   # Розсада
    DIRECT = "direct"       # Прямий посів
    BOTH = "both"


class CropType(str, enum.Enum):
    VEGETABLE = "vegetable"
    FLOWER = "flower"
    HERB = "herb"
    BERRY = "berry"
    TREE = "tree"


class LunarPreference(str, enum.Enum):
    ABOVE_GROUND = "above_ground"
    BELOW_GROUND = "below_ground"
    ANY = "any"
