"""Constants for the Glass Message Board integration."""

from __future__ import annotations

DOMAIN = "glass_messages"
VERSION = "1.3.0"

STORAGE_KEY = f"{DOMAIN}.messages"
STORAGE_VERSION = 1

SIGNAL_UPDATED = f"{DOMAIN}_updated"
EVENT_NEW_MESSAGE = f"{DOMAIN}_new"

CARD_URL = f"/{DOMAIN}/glass-message-board.js"
DATA_FRONTEND = f"{DOMAIN}_frontend_registered"
DATA_WS = f"{DOMAIN}_ws_registered"

EVERYONE = "everyone"
MEMBER_PREFIX = "member."
MAX_MEMBERS = 30

# Limits keep the store (and the websocket payloads) small and fast.
MAX_TEXT = 2000
MAX_MESSAGES = 200
MAX_STROKES = 400
MAX_POINTS_PER_STROKE = 1500
MAX_TOTAL_POINTS = 12000

TINTS = ["clear", "rose", "amber", "mint", "sky", "violet"]

# Background colour themes. The card holds the actual colours for each preset.
BACKGROUND_PRESETS = [
    "aurora",
    "black",
    "sunset",
    "ocean",
    "forest",
    "lavender",
    "ember",
    "graphite",
    "midnight",
    "halloween",
    "festive",
]
BACKGROUND_CUSTOM = "custom"
DEFAULT_BACKGROUND = {"preset": "aurora", "colors": []}

# Options
CONF_NOTIFY_EVERYONE = "notify_everyone"
CONF_NOTIFY_URL = "notify_url"
CONF_DEFAULT_EXPIRY = "default_expiry_hours"
DEFAULT_EXPIRY_HOURS = 24
