"""Push a phone notification when a new note arrives."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import CONF_NOTIFY_EVERYONE, CONF_NOTIFY_URL, EVERYONE

_LOGGER = logging.getLogger(__name__)


def _as_list(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, str):
        return [value]
    return [str(v) for v in value]


async def async_handle_notify(
    hass: HomeAssistant, entry: ConfigEntry, message: dict[str, Any]
) -> None:
    """Send notifications configured in the integration options."""
    if not message.get("notify", True):
        return

    options = entry.options
    recipient = message["recipient"]
    sender = message.get("sender")
    targets: set[str] = set()

    if recipient == EVERYONE:
        for key, value in options.items():
            if key.startswith("person.") and key != sender:
                targets.update(_as_list(value))
        targets.update(_as_list(options.get(CONF_NOTIFY_EVERYONE)))
    else:
        targets.update(_as_list(options.get(recipient)))

    if not targets:
        return

    who = message.get("sender_name") or "Home"
    body = message.get("text") or "✏️ Left you a handwritten note"
    if len(body) > 180:
        body = body[:179] + "…"
    data: dict[str, Any] = {"tag": f"glass-{message['id']}", "group": "glass_messages"}
    if url := options.get(CONF_NOTIFY_URL):
        data["url"] = url
        data["clickAction"] = url

    for target in sorted(targets):
        domain, _, service = target.partition(".")
        if domain != "notify" or not service:
            continue
        try:
            await hass.services.async_call(
                "notify",
                service,
                {"title": f"💬 {who}", "message": body, "data": data},
                blocking=False,
            )
        except Exception:  # noqa: BLE001 - a broken notifier must not break posting
            _LOGGER.warning("Could not send glass message notification via %s", target, exc_info=True)
