<div align="center">

# Glass Message Board

**A frosted-glass household message board for Home Assistant.**

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/docs/faq/custom_repositories)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.11%2B-18BCF2.svg?logo=homeassistant&logoColor=white)](https://www.home-assistant.io/)
[![Version](https://img.shields.io/badge/version-1.0.0-6E56CF.svg)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

![Glass Message Board on a wall tablet](docs/images/board.png)

</div>

Glass Message Board turns a wall-mounted tablet into a shared space for household notes. Family members can type, dictate or hand-draw messages, address them to one person or to everyone, and react to each other's notes. Important notes can be pinned; everything else expires on schedule. When the tablet is idle, the board fades into an ambient clock that highlights recent notes.

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Dashboard configuration](#dashboard-configuration)
- [Notifications](#notifications)
- [Actions](#actions)
- [Entities and events](#entities-and-events)
- [Automation examples](#automation-examples)
- [Permissions and data](#permissions-and-data)
- [WebSocket API](#websocket-api)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

| Feature | Description |
|---|---|
| **Per-person messaging** | Sender and recipient selection for every `person` entity, with profile pictures. Notes addressed to the signed-in user are highlighted. |
| **Write, dictate or draw** | Touch-optimized text input with quick emoji, browser-based voice dictation, and a handwriting pad with six ink colors, three pen sizes and undo. |
| **Pinning and expiry** | Notes can last 1 hour, until tonight, 1 day, 1 week, or indefinitely. Pinned notes never expire and always appear first. |
| **Reactions and replies** | Open any note to react, reply to the sender, pin it or delete it. |
| **Ambient mode** | After a configurable idle period, the board shows a large clock and a rotating spotlight of notes, prioritizing those for the current user. |
| **Automation support** | Actions, a new-message event and per-person sensors let automations post notes and respond to them. |
| **Mobile notifications** | Each person can be mapped to one or more `notify` services to receive a push notification when a note arrives. |

<p align="center">
  <img src="docs/images/compose.png" alt="Composing a note" width="49%">
  <img src="docs/images/note-detail.png" alt="Reacting to a handwritten note" width="49%">
</p>

### Architecture

A single installation provides two components:

- **Integration** (`glass_messages`): stores and expires notes, and provides actions, sensors, events and notifications.
- **Dashboard card** (`custom:glass-message-board`): served and registered by the integration automatically. No manual resource configuration is required.

## Requirements

- Home Assistant **2024.11** or later
- At least one `person` entity (recommended, for per-person messaging)
- HTTPS access to Home Assistant, if you want voice dictation (required by browsers for microphone access)

## Installation

### Option 1: HACS (recommended)

1. In HACS, open the menu (⋮) and select **Custom repositories**.
2. Add this repository's URL with the category **Integration**.
3. Search for **Glass Message Board** and install it.
4. Restart Home Assistant.

### Option 2: Manual

1. Download the latest release.
2. Copy `custom_components/glass_messages` into your Home Assistant `config/custom_components/` directory.
3. Restart Home Assistant.

### Set up the integration

Go to **Settings → Devices & services → Add integration** and select **Glass Message Board**.

## Dashboard configuration

For wall tablets, add the card to a **Panel** view (or a full-width **Sections** view) so it fills the screen. The card can be configured in the visual editor or in YAML:

```yaml
type: custom:glass-message-board
title: Family notes
ambient_after: 90
height: 100vh
column_width: 300
show_clock: true
background_image: /local/wallpaper.jpg
```

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | string | `Messages` | Title shown in the header. Leave empty to hide it. |
| `ambient_after` | number | `90` | Seconds of inactivity before ambient mode starts. Set to `0` to disable. |
| `height` | string | Fills the viewport | Any CSS height, such as `100vh` or `720px`. |
| `column_width` | number | `300` | Approximate width of each note column, in pixels. |
| `show_clock` | boolean | `true` | Shows the clock and date in the header. |
| `background_image` | string | — | Optional image URL displayed behind the glass. |

> [!TIP]
> For a dedicated wall display, run the dashboard in kiosk mode, for example with Fully Kiosk Browser.

## Notifications

To configure push notifications, go to **Settings → Devices & services → Glass Message Board → Configure**.

| Setting | Description |
|---|---|
| **Per-person services** | The `notify` service(s) for each person's devices, for example `notify.mobile_app_pixel_8`. |
| **Extra services for notes to everyone** | Additional services notified for every note addressed to everyone. |
| **Notification tap path** | Dashboard path to open when a notification is tapped, for example `/lovelace/notes`. |
| **Default note lifetime** | The expiry option preselected when composing, in hours. `0` keeps notes indefinitely. |

**Delivery rules**

- A note addressed to a person notifies that person's services.
- A note addressed to everyone notifies every configured person except the sender, plus any extra services.
- Set `notify: false` on a note to post it silently.

## Actions

| Action | Description | Fields |
|---|---|---|
| `glass_messages.post` | Posts a note. Returns the note `id`. | `message`, `to`, `from`, `sender_name`, `expires_in`, `expires_at`, `pinned`, `tint`, `notify` |
| `glass_messages.delete` | Deletes a note. | `id` |
| `glass_messages.pin` | Pins or unpins a note. | `id`, `pinned` |
| `glass_messages.react` | Toggles an emoji reaction. | `id`, `emoji`, `from` |
| `glass_messages.clear` | Removes all notes. Returns the number removed. | `include_pinned` |

### `glass_messages.post` fields

| Field | Required | Description |
|---|---|---|
| `message` | Yes | Note text, up to 2,000 characters. |
| `to` | No | A `person` entity, or `everyone` (default). |
| `from` | No | Sender `person` entity. Defaults to the user who ran the action. |
| `sender_name` | No | Display name for notes not sent by a person, such as `Laundry`. |
| `expires_in` | No | Lifetime in minutes. |
| `expires_at` | No | Exact expiry date and time. Takes precedence over `expires_in`. |
| `pinned` | No | Pins the note. Default `false`. |
| `tint` | No | One of `clear`, `rose`, `amber`, `mint`, `sky`, `violet`. Default `clear`. |
| `notify` | No | Sends notifications. Default `true`. |

```yaml
action: glass_messages.post
data:
  message: "The washer is done."
  to: everyone
  sender_name: Laundry
  expires_in: 120
  tint: mint
response_variable: note
```

## Entities and events

### Sensors

| Entity | State | Attributes |
|---|---|---|
| `sensor.glass_message_board_messages` | Total number of notes | `pinned`, `latest_text`, `latest_from`, `latest_at` |
| `sensor.glass_message_board_messages_for_<person>` | Notes addressed to that person or to everyone, excluding their own | `direct`, `pinned`, `latest_text`, `latest_from`, `latest_at` |

### Events

`glass_messages_new` fires whenever a note is posted, with the following data:

| Key | Description |
|---|---|
| `id` | Note identifier |
| `text` | Note text (first 255 characters) |
| `has_drawing` | Whether the note includes a drawing |
| `sender` / `sender_name` | Sender entity and display name |
| `recipient` | `person` entity or `everyone` |
| `pinned` | Whether the note is pinned |

## Automation examples

### Wake the tablet screen when a note arrives

```yaml
triggers:
  - trigger: event
    event_type: glass_messages_new
actions:
  - action: switch.turn_on
    target:
      entity_id: switch.hallway_tablet_screen
```

### Post a recurring reminder

```yaml
triggers:
  - trigger: time
    at: "07:00:00"
conditions:
  - condition: time
    weekday: [tue]
actions:
  - action: glass_messages.post
    data:
      message: "Bins go out tonight."
      sender_name: Home
      expires_in: 960
      tint: amber
```

## Permissions and data

| Action | Allowed for |
|---|---|
| Post, react, pin | All users |
| Delete | Administrators, the sender and the recipient |

- Notes are stored locally in `.storage/glass_messages.messages`. No data leaves your Home Assistant instance except through the notification services you configure.
- Up to 200 notes are retained. When the limit is reached, the oldest unpinned notes are removed first.
- Drawings are stored as compact vector strokes rather than images.

## WebSocket API

Custom frontends can use the following commands:

| Command | Description |
|---|---|
| `glass_messages/subscribe` | Sends a snapshot of all notes, followed by `added`, `updated` and `removed` events. |
| `glass_messages/post` | Posts a note, optionally with a drawing. |
| `glass_messages/delete` | Deletes a note. |
| `glass_messages/pin` | Pins or unpins a note. |
| `glass_messages/react` | Toggles a reaction. |

## Troubleshooting

| Problem | Solution |
|---|---|
| The card shows **Almost there** | The integration isn't set up. Add it under **Settings → Devices & services**, then reload the dashboard. |
| **Custom element doesn't exist** | Restart Home Assistant after installing, then hard-refresh the browser or clear the companion app's frontend cache. |
| The microphone button is missing | The browser doesn't support speech recognition. Chrome, Edge and Safari support it. |
| Dictation reports **Microphone blocked** | Access Home Assistant over HTTPS and allow microphone access in the browser. |
| No push notifications | Check that each person has a `notify` service selected in the integration options. |

## Contributing

Bug reports and pull requests are welcome. When reporting a problem, please include your Home Assistant version, browser, and any relevant entries from the Home Assistant log.

## License

Released under the [MIT License](LICENSE).
