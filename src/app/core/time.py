from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from src.app.core.config import settings


DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh"


def get_zoneinfo(tz_name: str | None = None) -> ZoneInfo:
    name = (tz_name or default_timezone_name()).strip()
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError:
        return ZoneInfo(DEFAULT_TIMEZONE)


def validate_timezone(tz_name: str) -> str:
    name = tz_name.strip()
    try:
        ZoneInfo(name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f"Invalid timezone: {tz_name}") from exc
    return name


def default_timezone_name() -> str:
    return (settings.APP_TIMEZONE or DEFAULT_TIMEZONE).strip() or DEFAULT_TIMEZONE


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_naive() -> datetime:
    """UTC timestamp for existing SQLModel DateTime columns stored as naive values."""
    return utc_now().replace(tzinfo=None)


def ensure_utc_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def local_now(tz_name: str | None = None) -> datetime:
    return utc_now().astimezone(get_zoneinfo(tz_name))


def local_date(tz_name: str | None = None) -> date:
    return local_now(tz_name).date()


def date_key(value: date) -> str:
    return value.isoformat()


def local_date_key(tz_name: str | None = None) -> str:
    return date_key(local_date(tz_name))


def add_days_to_date_key(day_key: str, days: int) -> str:
    base = date.fromisoformat(day_key)
    return date_key(base + timedelta(days=days))


def last_n_local_date_keys(days: int, tz_name: str | None = None) -> list[str]:
    if days <= 0:
        return []
    end = local_date(tz_name)
    start = end - timedelta(days=days - 1)
    return [date_key(start + timedelta(days=i)) for i in range(days)]


def iso_week_key_for_local_date(tz_name: str | None = None) -> str:
    iso_year, iso_week, _ = local_date(tz_name).isocalendar()
    return f"{iso_year}-{iso_week:02d}"


def seconds_since_utc(value: datetime, *, now: datetime | None = None) -> float:
    current = now or utc_now()
    return (ensure_utc_aware(current) - ensure_utc_aware(value)).total_seconds()


def parse_hhmm(value: str) -> time:
    hour_s, minute_s = value.split(":", 1)
    return time(hour=int(hour_s), minute=int(minute_s))
