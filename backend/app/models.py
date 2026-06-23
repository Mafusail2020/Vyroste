"""
SQLAlchemy 2.0 ORM models for the planting-calendar domain.

NOTE ON STACK: the running backend talks to Supabase via the supabase-py
client and raw SQL migrations — it does not currently bind a SQLAlchemy
engine. These models are the canonical schema definition requested by the
stakeholders and are kept in lock-step with migration
`005_crop_categories_varieties.sql`. They can be used directly once a
SQLAlchemy engine is wired against the same Postgres instance
(`postgresql+psycopg://...` pointed at the Supabase DB), or simply as the
authoritative type reference for the Supabase-client code paths.

Design:
  CropCategory (Томат)  1───many  CropVariety (Сорт «Волове серце»)
  ClimateZone provides `avg_last_frost_date` — the single anchor that ALL
  variety planting dates are computed against (no hardcoded months).
"""
from __future__ import annotations

import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.enums import CropType, GrowingMethod, LunarPreference


class Base(DeclarativeBase):
    pass


class KbCategory(Base):
    """Knowledge-Base category (Вирощування, Хвороби, ...). 1─many articles."""
    __tablename__ = "kb_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    emoji: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    subcategories: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"))
    sort_order: Mapped[int] = mapped_column(Integer, server_default=text("0"))

    articles: Mapped[list[KbArticle]] = relationship(back_populates="category")


class KbArticle(Base):
    """A wiki article. `content` is a TipTap document (JSONB), rendered to HTML
    on the client. Only published articles are publicly readable."""
    __tablename__ = "kb_articles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kb_categories.id", ondelete="SET NULL"), index=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    excerpt: Mapped[str | None] = mapped_column(Text)
    content: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    cover_image: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"))
    author: Mapped[str | None] = mapped_column(Text, server_default=text("'Виросте'"))
    published: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    views: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    reading_minutes: Mapped[int] = mapped_column(Integer, server_default=text("1"))

    category: Mapped[KbCategory | None] = relationship(back_populates="articles")


class Nursery(Base):
    """A B2B nursery shown on the map. Media + tags are owner-managed;
    admin_tags are moderator-only badges."""
    __tablename__ = "nurseries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    region_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("climate_zones.id")
    )
    latitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text)
    website: Mapped[str | None] = mapped_column(Text)

    crops_available: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), server_default=text("'{}'")
    )

    # ── Media + tags (slice 15) ─────────────────────────────────────────────
    photos: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"))
    videos: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"))
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"))        # owner-managed
    admin_tags: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"))  # moderator-only

    status: Mapped[str] = mapped_column(Text, server_default=text("'pending'"))
    owner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))

    __table_args__ = (
        CheckConstraint("status IN ('pending','verified','rejected')", name="nurseries_status_check"),
    )


class ClimateZone(Base):
    """A region with the frost anchor used for all date math."""
    __tablename__ = "climate_zones"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    region: Mapped[str] = mapped_column(Text, nullable=False)          # "Полісся" / "Київська обл."
    city: Mapped[str] = mapped_column(Text, nullable=False)
    usda_zone: Mapped[str | None] = mapped_column(Text)

    # "MM-DD" — THE anchor for every planting window in this zone.
    avg_last_frost_date: Mapped[str | None] = mapped_column(String(5))
    avg_first_frost_date: Mapped[str | None] = mapped_column(String(5))

    latitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
    annual_active_temp_sum: Mapped[int | None] = mapped_column(Integer)


class CropCategory(Base):
    """The crop kind (Томат, Перець, Морква). Holds botanical / GDD constants
    shared by every variety; never holds planting dates."""
    __tablename__ = "crop_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    name_uk: Mapped[str] = mapped_column(Text, nullable=False, unique=True)   # "Томат"
    name_lat: Mapped[str | None] = mapped_column(Text)
    type: Mapped[CropType] = mapped_column(
        SAEnum(CropType, name="crop_type", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    base_temperature: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False)  # GDD base °C
    lunar_preference: Mapped[LunarPreference] = mapped_column(
        SAEnum(LunarPreference, name="lunar_preference",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        server_default=LunarPreference.ANY.value,
    )

    varieties: Mapped[list[CropVariety]] = relationship(
        back_populates="category", cascade="all, delete-orphan", passive_deletes=True
    )


class CropVariety(Base):
    """A concrete сорт. Owns the growing method and all FROST-RELATIVE offsets.

    Every offset is an integer number of DAYS relative to the zone's
    `avg_last_frost_date` (negative = before the frost, positive = after).
    A NULL offset means "this phase does not apply" — which is how a
    direct-sow-only or seedling-only variety is represented.
    """
    __tablename__ = "crop_varieties"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("crop_categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name_uk: Mapped[str] = mapped_column(Text, nullable=False)   # "Волове серце"

    growing_method: Mapped[GrowingMethod] = mapped_column(
        SAEnum(GrowingMethod, name="growing_method",
               values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )

    # ── Seedling track (SEEDLING / BOTH) — all NULL for direct-only ──────────
    seedling_sow_start_offset: Mapped[int | None] = mapped_column(Integer)
    seedling_sow_end_offset: Mapped[int | None] = mapped_column(Integer)
    prick_out_weeks_after_sprout: Mapped[int | None] = mapped_column(Integer)  # NOT frost-anchored
    hardening_offset: Mapped[int | None] = mapped_column(Integer)
    transplant_start_offset: Mapped[int | None] = mapped_column(Integer)
    transplant_end_offset: Mapped[int | None] = mapped_column(Integer)

    # ── Direct-sow track (DIRECT / BOTH) — all NULL for seedling-only ───────
    direct_sow_start_offset: Mapped[int | None] = mapped_column(Integer)
    direct_sow_end_offset: Mapped[int | None] = mapped_column(Integer)

    # ── Harvest & GDD ───────────────────────────────────────────────────────
    days_to_harvest: Mapped[int | None] = mapped_column(Integer)
    gdd_to_harvest: Mapped[int | None] = mapped_column(Integer)

    notes: Mapped[str | None] = mapped_column(Text)  # Примітки

    category: Mapped[CropCategory] = relationship(back_populates="varieties")

    __table_args__ = (
        # A seedling variety must define a transplant window; a direct variety
        # must define a direct-sow window. Guarantees the calc always has an
        # anchor for whichever track its method enables.
        CheckConstraint(
            "(growing_method = 'direct') "
            "OR (transplant_start_offset IS NOT NULL)",
            name="seedling_requires_transplant",
        ),
        CheckConstraint(
            "(growing_method = 'seedling') "
            "OR (direct_sow_start_offset IS NOT NULL)",
            name="direct_requires_sow_window",
        ),
    )
