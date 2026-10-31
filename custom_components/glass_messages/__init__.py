"""Glass Message Board — leave notes for the household on a beautiful glass dashboard."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.event import async_track_time_interval

from .board import MessageBoard
from .const import CARD_URL, DATA_FRONTEND, DOMAIN, SIGNAL_UPDATED, VERSION
from .notifier import async_handle_notify
from .services import async_register_services, async_unregister_services
from .websocket import async_register_websocket

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.SENSOR]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

type GlassConfigEntry = ConfigEntry[MessageBoard]


async def async_setup_entry(hass: HomeAssistant, entry: GlassConfigEntry) -> bool:
    board = MessageBoard(hass)
    await board.async_load()
    entry.runtime_data = board
    hass.data[DOMAIN] = board

    await _async_register_frontend(hass)
    async_register_websocket(hass)
    async_register_services(hass)

    @callback
    def _purge(_now: datetime) -> None:
        board.purge_expired()

    @callback
    def _on_change(action: str, message: dict[str, Any]) -> None:
        if action == "added":
            hass.async_create_task(async_handle_notify(hass, entry, message))

    entry.async_on_unload(async_track_time_interval(hass, _purge, timedelta(minutes=1)))
    entry.async_on_unload(async_dispatcher_connect(hass, SIGNAL_UPDATED, _on_change))
    entry.async_on_unload(entry.add_update_listener(_async_reload))

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: GlassConfigEntry) -> bool:
    if unloaded := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data.pop(DOMAIN, None)
        async_unregister_services(hass)
    return unloaded


async def _async_reload(hass: HomeAssistant, entry: GlassConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def _async_register_frontend(hass: HomeAssistant) -> None:
    """Serve the card and load it on every dashboard — no manual resource needed."""
    if hass.data.get(DATA_FRONTEND):
        return
    card = Path(__file__).parent / "frontend" / "glass-message-board.js"
    await hass.http.async_register_static_paths([StaticPathConfig(CARD_URL, str(card), False)])
    add_extra_js_url(hass, f"{CARD_URL}?v={VERSION}")
    hass.data[DATA_FRONTEND] = True
