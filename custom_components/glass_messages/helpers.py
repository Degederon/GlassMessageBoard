"""Small helpers shared across the integration."""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .const import (
    DOMAIN,
    EVERYONE,
    MEMBER_PREFIX,
    MAX_POINTS_PER_STROKE,
    MAX_STROKES,
    MAX_TOTAL_POINTS,
)

_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{3,8}$")


@callback
def person_for_user(hass: HomeAssistant, user_id: str | None) -> str | None:
    """Return the person entity linked to a Home Assistant user, if any."""
    if not user_id:
        return None
    for state in hass.states.async_all("person"):
        if state.attributes.get("user_id") == user_id:
            return state.entity_id
    return None


@callback
def display_name(hass: HomeAssistant, entity_id: str | None, fallback: str | None = None) -> str:
    """Friendly name for a person entity or board member, falling back gracefully."""
    if entity_id and entity_id.startswith(MEMBER_PREFIX):
        board = hass.data.get(DOMAIN)
        if board is not None and (member := board.get_member(entity_id)):
            return member["name"]
    elif entity_id and (state := hass.states.get(entity_id)):
        return state.name
    return fallback or "Home"


@callback
def users_for_person(hass: HomeAssistant, entity_id: str | None) -> str | None:
    """Return the user id linked to a person entity."""
    if entity_id and (state := hass.states.get(entity_id)):
        return state.attributes.get("user_id")
    return None


def _is_participant(value: str) -> bool:
    for prefix in ("person.", MEMBER_PREFIX):
        if value.startswith(prefix) and len(value) > len(prefix):
            return True
    return False


def recipient(value: Any) -> str:
    """Validate a recipient: 'everyone', a person entity or a board member."""
    value = str(value or EVERYONE).strip().lower()
    if value == EVERYONE or _is_participant(value):
        return value
    raise vol.Invalid("recipient must be 'everyone', a person entity or a board member")


def person_entity(value: Any) -> str:
    """Validate a sender: a person entity or a board member."""
    value = str(value).strip().lower()
    if _is_participant(value):
        return value
    raise vol.Invalid("must be a person entity or a board member")


def _clamp(value: Any, low: float, high: float) -> float:
    return max(low, min(high, float(value)))


def drawing(value: Any) -> dict[str, Any] | None:
    """Validate and normalise handwriting stroke data.

    Format: {"ar": width/height, "strokes": [{"c": "#fff", "w": 0.012, "p": [[x, y], ...]}]}
    with x/y normalised to 0..1 and w relative to the drawing width.
    """
    if value in (None, "", {}):
        return None
    if not isinstance(value, dict) or not isinstance(value.get("strokes"), list):
        raise vol.Invalid("drawing must be an object with strokes")
    try:
        aspect = _clamp(value.get("ar", 1.6), 0.2, 5)
        strokes: list[dict[str, Any]] = []
        total = 0
        for stroke in value["strokes"][:MAX_STROKES]:
            color = str(stroke.get("c", "#ffffff"))[:16]
            if not _COLOR_RE.match(color):
                color = "#ffffff"
            width = round(_clamp(stroke.get("w", 0.012), 0.001, 0.1), 4)
            points = [
                [round(_clamp(pt[0], 0, 1), 4), round(_clamp(pt[1], 0, 1), 4)]
                for pt in stroke.get("p", [])[:MAX_POINTS_PER_STROKE]
            ]
            total += len(points)
            if total > MAX_TOTAL_POINTS:
                raise vol.Invalid("drawing is too detailed")
            if points:
                strokes.append({"c": color, "w": width, "p": points})
    except (TypeError, ValueError, IndexError, AttributeError) as err:
        raise vol.Invalid(f"invalid drawing: {err}") from err
    return {"ar": round(aspect, 4), "strokes": strokes} if strokes else None


def resolve_expiry(
    expires_at: datetime | None, expires_in_minutes: int | None
) -> datetime | None:
    """Turn the two ways of specifying expiry into one UTC datetime."""
    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=dt_util.get_default_time_zone())
        return dt_util.as_utc(expires_at)
    if expires_in_minutes:
        return dt_util.utcnow() + timedelta(minutes=int(expires_in_minutes))
    return None
