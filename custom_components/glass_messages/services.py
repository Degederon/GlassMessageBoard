"""Services so automations and scripts can use the board."""

from __future__ import annotations

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv

from . import helpers as h
from .board import MessageBoard
from .const import DOMAIN, EVERYONE, MAX_TEXT, TINTS

SERVICES = ("post", "delete", "pin", "react", "clear")

POST_SCHEMA = vol.Schema(
    {
        vol.Required("message"): vol.All(cv.string, vol.Length(min=1, max=MAX_TEXT)),
        vol.Optional("to", default=EVERYONE): h.recipient,
        vol.Optional("from"): h.person_entity,
        vol.Optional("sender_name"): cv.string,
        vol.Optional("expires_in"): vol.All(vol.Coerce(int), vol.Range(min=1)),
        vol.Optional("expires_at"): cv.datetime,
        vol.Optional("pinned", default=False): cv.boolean,
        vol.Optional("tint", default="clear"): vol.In(TINTS),
        vol.Optional("notify", default=True): cv.boolean,
    }
)
ID_SCHEMA = vol.Schema({vol.Required("id"): cv.string})
PIN_SCHEMA = ID_SCHEMA.extend({vol.Optional("pinned", default=True): cv.boolean})
REACT_SCHEMA = ID_SCHEMA.extend(
    {
        vol.Required("emoji"): vol.All(cv.string, vol.Length(min=1, max=16)),
        vol.Optional("from"): h.person_entity,
    }
)
CLEAR_SCHEMA = vol.Schema({vol.Optional("include_pinned", default=False): cv.boolean})


def _board(hass: HomeAssistant) -> MessageBoard:
    if (board := hass.data.get(DOMAIN)) is None:
        raise HomeAssistantError("Glass Message Board is not set up")
    return board


@callback
def async_register_services(hass: HomeAssistant) -> None:
    if hass.services.has_service(DOMAIN, "post"):
        return

    async def post(call: ServiceCall) -> ServiceResponse:
        board = _board(hass)
        sender = call.data.get("from") or h.person_for_user(hass, call.context.user_id)
        message = board.add(
            text=call.data["message"],
            sender=sender,
            sender_name=call.data.get("sender_name") or h.display_name(hass, sender, "Home"),
            sender_user_id=call.context.user_id,
            recipient=call.data["to"],
            recipient_name=None if call.data["to"] == EVERYONE else h.display_name(hass, call.data["to"], None),
            expires_at=h.resolve_expiry(call.data.get("expires_at"), call.data.get("expires_in")),
            pinned=call.data["pinned"],
            tint=call.data["tint"],
            notify=call.data["notify"],
            source="service",
        )
        return {"id": message["id"]}

    async def delete(call: ServiceCall) -> None:
        if not _board(hass).delete(call.data["id"]):
            raise HomeAssistantError(f"No message with id {call.data['id']}")

    async def pin(call: ServiceCall) -> None:
        if _board(hass).set_pinned(call.data["id"], call.data["pinned"]) is None:
            raise HomeAssistantError(f"No message with id {call.data['id']}")

    async def react(call: ServiceCall) -> None:
        who = call.data.get("from") or h.person_for_user(hass, call.context.user_id) or "home"
        if _board(hass).toggle_reaction(call.data["id"], call.data["emoji"], who) is None:
            raise HomeAssistantError(f"No message with id {call.data['id']}")

    async def clear(call: ServiceCall) -> ServiceResponse:
        return {"removed": _board(hass).clear(call.data["include_pinned"])}

    hass.services.async_register(DOMAIN, "post", post, POST_SCHEMA, SupportsResponse.OPTIONAL)
    hass.services.async_register(DOMAIN, "delete", delete, ID_SCHEMA)
    hass.services.async_register(DOMAIN, "pin", pin, PIN_SCHEMA)
    hass.services.async_register(DOMAIN, "react", react, REACT_SCHEMA)
    hass.services.async_register(DOMAIN, "clear", clear, CLEAR_SCHEMA, SupportsResponse.OPTIONAL)


@callback
def async_unregister_services(hass: HomeAssistant) -> None:
    for service in SERVICES:
        hass.services.async_remove(DOMAIN, service)
