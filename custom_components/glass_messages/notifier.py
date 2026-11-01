"""Push a phone notification when a new note arrives."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import CONF_NOTIFY_EVERYONE, CONF_NOTIFY_URL, DOMAIN, EVERYONE, MEMBER_PREFIX

_LOGGER = logging.getLogger(__name__)

# The notification's own words, in Home Assistant's language (English otherwise).
_HANDWRITTEN = {
    "en": "✏️ Left you a handwritten note",
    "de": "✏️ Hat dir eine handschriftliche Notiz hinterlassen",
    "es": "✏️ Te ha dejado una nota a mano",
    "fr": "✏️ Vous a laissé une note manuscrite",
}
_HOME = {"en": "Home", "de": "Zuhause", "es": "Casa", "fr": "Maison"}


def _language(hass: HomeAssistant) -> str:
    lang = str(getattr(hass.config, "language", None) or "en").split("-")[0].lower()
    return lang if lang in _HANDWRITTEN else "en"


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

    board = hass.data.get(DOMAIN)
    members = board.members if board is not None else []

    if recipient == EVERYONE:
        for key, value in options.items():
            if key.startswith("person.") and key != sender:
                targets.update(_as_list(value))
        for member in members:
            if member["id"] != sender:
                targets.update(_as_list(member.get("notify")))
        targets.update(_as_list(options.get(CONF_NOTIFY_EVERYONE)))
    elif recipient.startswith(MEMBER_PREFIX):
        member = next((m for m in members if m["id"] == recipient), None)
        targets.update(_as_list(member.get("notify") if member else None))
    else:
        targets.update(_as_list(options.get(recipient)))

    if not targets:
        return

    lang = _language(hass)
    who = message.get("sender_name") or _HOME[lang]
    body = message.get("text") or _HANDWRITTEN[lang]
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
