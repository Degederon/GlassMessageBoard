"""Websocket API used by the glass card."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from . import helpers as h
from .board import MessageBoard
from .const import (
    CONF_DEFAULT_EXPIRY,
    DATA_WS,
    DEFAULT_EXPIRY_HOURS,
    DOMAIN,
    EVERYONE,
    MAX_TEXT,
    SIGNAL_UPDATED,
    TINTS,
)


@callback
def async_register_websocket(hass: HomeAssistant) -> None:
    if hass.data.get(DATA_WS):
        return
    for handler in (ws_subscribe, ws_post, ws_delete, ws_pin, ws_react):
        websocket_api.async_register_command(hass, handler)
    hass.data[DATA_WS] = True


def _board(hass: HomeAssistant, connection, msg) -> MessageBoard | None:
    board = hass.data.get(DOMAIN)
    if board is None:
        connection.send_error(msg["id"], "not_loaded", "Glass Message Board is not set up")
    return board


def _who(hass: HomeAssistant, user) -> str:
    return h.person_for_user(hass, user.id) or f"user:{user.id}"


def _can_modify(hass: HomeAssistant, user, message: dict[str, Any]) -> bool:
    if user.is_admin or message.get("sender_user_id") == user.id:
        return True
    me = h.person_for_user(hass, user.id)
    return me is not None and me in (message.get("sender"), message.get("recipient"))


def _client_config(hass: HomeAssistant) -> dict[str, Any]:
    entries = hass.config_entries.async_entries(DOMAIN)
    options = entries[0].options if entries else {}
    return {"default_expiry_hours": options.get(CONF_DEFAULT_EXPIRY, DEFAULT_EXPIRY_HOURS)}


@websocket_api.websocket_command({vol.Required("type"): "glass_messages/subscribe"})
@callback
def ws_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg) -> None:
    if (board := _board(hass, connection, msg)) is None:
        return

    @callback
    def forward(action: str, message: dict[str, Any]) -> None:
        connection.send_message(
            websocket_api.event_message(msg["id"], {"action": action, "message": message})
        )

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(hass, SIGNAL_UPDATED, forward)
    connection.send_result(msg["id"])
    connection.send_message(
        websocket_api.event_message(
            msg["id"],
            {"action": "snapshot", "messages": board.messages, "config": _client_config(hass)},
        )
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "glass_messages/post",
        vol.Optional("text", default=""): vol.All(str, vol.Length(max=MAX_TEXT)),
        vol.Optional("drawing"): h.drawing,
        vol.Optional("from"): vol.Any(None, h.person_entity),
        vol.Optional("to", default=EVERYONE): h.recipient,
        vol.Optional("expires_at"): vol.Any(None, cv.datetime),
        vol.Optional("pinned", default=False): bool,
        vol.Optional("tint", default="clear"): vol.In(TINTS),
        vol.Optional("notify", default=True): bool,
    }
)
@callback
def ws_post(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg) -> None:
    if (board := _board(hass, connection, msg)) is None:
        return
    sender = msg.get("from") or h.person_for_user(hass, connection.user.id)
    try:
        message = board.add(
            text=msg["text"],
            drawing=msg.get("drawing"),
            sender=sender,
            sender_name=h.display_name(hass, sender, connection.user.name),
            sender_user_id=connection.user.id,
            recipient=msg["to"],
            expires_at=h.resolve_expiry(msg.get("expires_at"), None),
            pinned=msg["pinned"],
            tint=msg["tint"],
            notify=msg["notify"],
        )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return
    connection.send_result(msg["id"], {"id": message["id"]})


@websocket_api.websocket_command(
    {vol.Required("type"): "glass_messages/delete", vol.Required("message_id"): str}
)
@callback
def ws_delete(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg) -> None:
    if (board := _board(hass, connection, msg)) is None:
        return
    message = board.get(msg["message_id"])
    if message is None:
        connection.send_error(msg["id"], "not_found", "Message not found")
        return
    if not _can_modify(hass, connection.user, message):
        connection.send_error(msg["id"], "unauthorized", "Only the sender, recipient or an admin can delete this")
        return
    board.delete(msg["message_id"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): "glass_messages/pin",
        vol.Required("message_id"): str,
        vol.Optional("pinned", default=True): bool,
    }
)
@callback
def ws_pin(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg) -> None:
    if (board := _board(hass, connection, msg)) is None:
        return
    if board.set_pinned(msg["message_id"], msg["pinned"]) is None:
        connection.send_error(msg["id"], "not_found", "Message not found")
        return
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): "glass_messages/react",
        vol.Required("message_id"): str,
        vol.Required("emoji"): vol.All(str, vol.Length(min=1, max=16)),
    }
)
@callback
def ws_react(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg) -> None:
    if (board := _board(hass, connection, msg)) is None:
        return
    if board.toggle_reaction(msg["message_id"], msg["emoji"], _who(hass, connection.user)) is None:
        connection.send_error(msg["id"], "not_found", "Message not found")
        return
    connection.send_result(msg["id"])
