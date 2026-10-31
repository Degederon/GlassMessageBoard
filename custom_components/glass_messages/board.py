"""The message store: persistence, expiry and change broadcasting."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    EVENT_NEW_MESSAGE,
    DEFAULT_BACKGROUND,
    EVERYONE,
    MAX_MEMBERS,
    MAX_MESSAGES,
    SIGNAL_UPDATED,
    STORAGE_KEY,
    STORAGE_VERSION,
)


class MessageBoard:
    """Holds all messages and notifies listeners when they change."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._messages: dict[str, dict[str, Any]] = {}
        self._members: dict[str, dict[str, Any]] = {}
        self._settings: dict[str, Any] = {
            "include_ha_people": True,
            "background": dict(DEFAULT_BACKGROUND),
        }

    async def async_load(self) -> None:
        data = await self._store.async_load() or {}
        self._messages = {
            m["id"]: m for m in data.get("messages", []) if isinstance(m, dict) and "id" in m
        }
        self._members = {
            m["id"]: m for m in data.get("members", []) if isinstance(m, dict) and "id" in m
        }
        self._settings.update(data.get("settings", {}))
        self.purge_expired()

    # ------------------------------------------------------------------ read
    @property
    def messages(self) -> list[dict[str, Any]]:
        """All messages, pinned first, newest first."""
        ordered = sorted(self._messages.values(), key=lambda m: m["created"], reverse=True)
        return sorted(ordered, key=lambda m: not m.get("pinned"))

    @property
    def members(self) -> list[dict[str, Any]]:
        """People added on the board itself (no Home Assistant account needed)."""
        return sorted(self._members.values(), key=lambda m: m["name"].lower())

    @property
    def settings(self) -> dict[str, Any]:
        return {**self._settings, "background": dict(self._settings["background"])}

    def get_member(self, member_id: str | None) -> dict[str, Any] | None:
        return self._members.get(member_id) if member_id else None

    def get(self, message_id: str) -> dict[str, Any] | None:
        return self._messages.get(message_id)

    def for_person(self, person: str) -> list[dict[str, Any]]:
        """Messages addressed to a person (directly or to everyone), not sent by them."""
        return [
            m
            for m in self.messages
            if m["recipient"] in (person, EVERYONE) and m.get("sender") != person
        ]

    # ----------------------------------------------------------------- write
    @callback
    def add(
        self,
        *,
        text: str = "",
        drawing: dict[str, Any] | None = None,
        sender: str | None = None,
        sender_name: str | None = None,
        sender_user_id: str | None = None,
        recipient: str = EVERYONE,
        recipient_name: str | None = None,
        expires_at: datetime | None = None,
        pinned: bool = False,
        tint: str = "clear",
        notify: bool = True,
        source: str = "card",
    ) -> dict[str, Any]:
        text = (text or "").strip()
        if not text and not drawing:
            raise ValueError("A message needs text or a drawing")

        message = {
            "id": uuid.uuid4().hex[:12],
            "text": text,
            "drawing": drawing,
            "sender": sender,
            "sender_name": sender_name,
            "sender_user_id": sender_user_id,
            "recipient": recipient,
            "recipient_name": recipient_name,
            "created": dt_util.utcnow().isoformat(),
            "expires_at": expires_at.isoformat() if expires_at else None,
            "pinned": bool(pinned),
            "tint": tint,
            "notify": bool(notify),
            "reactions": {},
            "source": source,
        }
        self._messages[message["id"]] = message
        self._enforce_limit()
        self._changed("added", message)
        self.hass.bus.async_fire(
            EVENT_NEW_MESSAGE,
            {
                "id": message["id"],
                "text": text[:255],
                "has_drawing": drawing is not None,
                "sender": sender,
                "sender_name": sender_name,
                "recipient": recipient,
                "pinned": message["pinned"],
            },
        )
        return message

    @callback
    def delete(self, message_id: str) -> bool:
        if self._messages.pop(message_id, None) is None:
            return False
        self._changed("removed", {"id": message_id})
        return True

    @callback
    def set_pinned(self, message_id: str, pinned: bool) -> dict[str, Any] | None:
        if (message := self._messages.get(message_id)) is None:
            return None
        message["pinned"] = bool(pinned)
        self._changed("updated", message)
        return message

    @callback
    def toggle_reaction(self, message_id: str, emoji: str, who: str) -> dict[str, Any] | None:
        if (message := self._messages.get(message_id)) is None:
            return None
        reactions: dict[str, list[str]] = message.setdefault("reactions", {})
        people = reactions.setdefault(emoji, [])
        if who in people:
            people.remove(who)
        else:
            people.append(who)
        if not people:
            reactions.pop(emoji, None)
        self._changed("updated", message)
        return message

    @callback
    def clear(self, include_pinned: bool = False) -> int:
        doomed = [m["id"] for m in self._messages.values() if include_pinned or not m.get("pinned")]
        for message_id in doomed:
            self.delete(message_id)
        return len(doomed)

    @callback
    def purge_expired(self, now: datetime | None = None) -> int:
        now = now or dt_util.utcnow()
        doomed = []
        for message in self._messages.values():
            if message.get("pinned") or not message.get("expires_at"):
                continue
            expires = dt_util.parse_datetime(message["expires_at"])
            if expires is not None and expires <= now:
                doomed.append(message["id"])
        for message_id in doomed:
            self.delete(message_id)
        return len(doomed)

    # --------------------------------------------------------------- people
    @callback
    def save_member(
        self,
        *,
        member_id: str | None,
        name: str,
        emoji: str,
        hue: int,
        notify: list[str],
    ) -> dict[str, Any]:
        name = name.strip()
        if not name:
            raise ValueError("Please enter a name")
        if member_id and member_id not in self._members:
            raise KeyError(member_id)
        if not member_id and len(self._members) >= MAX_MEMBERS:
            raise ValueError(f"The board can hold up to {MAX_MEMBERS} people")
        member_id = member_id or f"member.{uuid.uuid4().hex[:8]}"
        member = {"id": member_id, "name": name, "emoji": emoji, "hue": int(hue) % 360, "notify": notify}
        self._members[member_id] = member
        self._members_changed()
        return member

    @callback
    def remove_member(self, member_id: str) -> bool:
        if self._members.pop(member_id, None) is None:
            return False
        self._members_changed()
        return True

    @callback
    def update_settings(self, **settings: Any) -> dict[str, Any]:
        self._settings.update(settings)
        self._members_changed()
        return self.settings

    def _members_changed(self) -> None:
        self._save()
        async_dispatcher_send(
            self.hass,
            SIGNAL_UPDATED,
            "people",
            {"members": self.members, "settings": self.settings},
        )

    # -------------------------------------------------------------- internal
    def _enforce_limit(self) -> None:
        if len(self._messages) <= MAX_MESSAGES:
            return
        removable = sorted(
            (m for m in self._messages.values() if not m.get("pinned")),
            key=lambda m: m["created"],
        )
        while len(self._messages) > MAX_MESSAGES and removable:
            self.delete(removable.pop(0)["id"])

    def _save(self) -> None:
        self._store.async_delay_save(
            lambda: {
                "messages": list(self._messages.values()),
                "members": list(self._members.values()),
                "settings": self._settings,
            },
            1,
        )

    def _changed(self, action: str, message: dict[str, Any]) -> None:
        self._save()
        async_dispatcher_send(self.hass, SIGNAL_UPDATED, action, message)
