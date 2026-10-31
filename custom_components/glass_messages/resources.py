"""Keep the board's dashboard resource registered and pointing at the current version."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant

from .const import CARD_URL, VERSION

_LOGGER = logging.getLogger(__name__)

LOVELACE_DOMAIN = "lovelace"


def resource_url() -> str:
    """The address dashboards load, with the version so browsers fetch new releases."""
    return f"{CARD_URL}?v={VERSION}"


def _resource_collection(hass: HomeAssistant) -> Any | None:
    """Return the dashboard resource collection, if it can be edited."""
    lovelace = hass.data.get(LOVELACE_DOMAIN)
    if lovelace is None:
        return None
    resources = getattr(lovelace, "resources", None)
    if resources is None and isinstance(lovelace, dict):
        resources = lovelace.get("resources")
    # Dashboards in YAML mode have a read-only collection without create/update.
    if resources is None or not hasattr(resources, "async_create_item"):
        return None
    return resources


async def async_ensure_resource(hass: HomeAssistant) -> bool:
    """Add or update the board's resource. Returns False when it must be added by hand."""
    resources = _resource_collection(hass)
    if resources is None:
        return False

    wanted = resource_url()
    try:
        if hasattr(resources, "async_get_info"):
            await resources.async_get_info()  # loads stored resources if needed
        ours = [
            item
            for item in resources.async_items()
            if str(item.get("url", "")).split("?", 1)[0] == CARD_URL
        ]
        if not ours:
            await resources.async_create_item({"res_type": "module", "url": wanted})
            _LOGGER.info("Added dashboard resource %s", wanted)
            return True

        first, *duplicates = ours
        if first.get("url") != wanted or first.get("type", "module") != "module":
            await resources.async_update_item(first["id"], {"res_type": "module", "url": wanted})
            _LOGGER.info("Updated dashboard resource to %s", wanted)
        for item in duplicates:
            await resources.async_delete_item(item["id"])
        return True
    except Exception:  # noqa: BLE001 - never block setup over a resource problem
        _LOGGER.warning(
            "Could not register the Glass Message Board dashboard resource automatically; "
            "add %s as a JavaScript module under Settings > Dashboards > Resources",
            wanted,
            exc_info=True,
        )
        return False
