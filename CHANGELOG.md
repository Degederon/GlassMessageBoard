# Changelog

All notable changes to this project are documented in this file.

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
