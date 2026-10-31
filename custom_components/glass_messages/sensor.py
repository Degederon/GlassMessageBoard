"""Sensors: total messages, plus one per person for badges and automations."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .board import MessageBoard
from .const import DOMAIN, SIGNAL_UPDATED, VERSION


async def async_setup_entry(hass: HomeAssistant, entry, async_add_entities: AddEntitiesCallback) -> None:
    board: MessageBoard = entry.runtime_data
    entities: list[SensorEntity] = [BoardSensor(board, entry.entry_id)]
    entities.extend(
        PersonSensor(board, entry.entry_id, state.entity_id, state.name)
        for state in hass.states.async_all("person")
    )
    async_add_entities(entities)


def _summary(messages: list[dict[str, Any]]) -> dict[str, Any]:
    latest = messages[0] if messages else None
    newest = max(messages, key=lambda m: m["created"]) if messages else None
    return {
        "pinned": sum(1 for m in messages if m.get("pinned")),
        "latest_text": (newest or {}).get("text") or ("✏️ Drawing" if newest else None),
        "latest_from": (newest or {}).get("sender_name"),
        "latest_at": (newest or {}).get("created"),
        "top_message_id": (latest or {}).get("id"),
    }


class _BoardEntity(SensorEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "messages"

    def __init__(self, board: MessageBoard, entry_id: str) -> None:
        self._board = board
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry_id)},
            name="Glass Message Board",
            manufacturer="Community",
            model="Message board",
            sw_version=VERSION,
        )

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_dispatcher_connect(self.hass, SIGNAL_UPDATED, self._handle_update)
        )

    @callback
    def _handle_update(self, *_: Any) -> None:
        self.async_write_ha_state()


class BoardSensor(_BoardEntity):
    _attr_icon = "mdi:message-text-outline"
    _attr_name = "Messages"

    def __init__(self, board: MessageBoard, entry_id: str) -> None:
        super().__init__(board, entry_id)
        self._attr_unique_id = f"{entry_id}_total"

    @property
    def native_value(self) -> int:
        return len(self._board.messages)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return _summary(self._board.messages)


class PersonSensor(_BoardEntity):
    _attr_icon = "mdi:message-badge-outline"

    def __init__(self, board: MessageBoard, entry_id: str, person: str, name: str) -> None:
        super().__init__(board, entry_id)
        self._person = person
        self._attr_unique_id = f"{entry_id}_{person}"
        self._attr_name = f"Messages for {name}"

    @property
    def native_value(self) -> int:
        return len(self._board.for_person(self._person))

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        mine = self._board.for_person(self._person)
        return {
            "person": self._person,
            "direct": sum(1 for m in mine if m["recipient"] == self._person),
            **_summary(mine),
        }
