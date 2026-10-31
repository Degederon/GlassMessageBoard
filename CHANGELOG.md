# Changelog

All notable changes to this project are documented in this file.

## [1.2.0] - 2026-10-31

### Added

- **Background themes:** a palette button opens a picker with ten presets (Aurora, Sunset, Ocean, Forest, Lavender, Ember, Graphite, Midnight, Halloween and Festive) and a custom three-colour option with live preview.
- The chosen background is saved centrally, so every screen showing the board changes together.
- New action `glass_messages.set_background` for switching themes from automations.

### Changed

- Aurora remains the default background; existing boards look the same until a new theme is chosen.
- Links in `manifest.json`, the card and the README now point to `https://github.com/Degederon/GlassMessageBoard`.

## [1.1.0] - 2026-10-31

### Added

- **People screen** on the board: add, edit and remove names with an emoji picture and colour, and optionally pick the phone that gets notified. No Home Assistant user accounts or `person` entities needed.
- First-run welcome screen that guides you to add people.
- Add a new name directly while writing a note.
- Option to show or hide Home Assistant users on the board.

### Changed

- "Leave a note" is now a simple three-step form: who's writing, who it's for, and the message. Colour, expiry and pinning moved under **More options**.
- The Send button names the recipient ("Send to Maya") and stays visible while scrolling.
- The board remembers who last wrote a note on each tablet.

## [1.0.0] - 2026-10-31

### Added

- Glass Message Board integration with local note storage, automatic expiry and pinning.
- Dashboard card with text, voice dictation and handwritten notes.
- Per-person addressing, emoji reactions, replies and ambient mode.
- Actions, sensors, the `glass_messages_new` event and mobile notifications.
