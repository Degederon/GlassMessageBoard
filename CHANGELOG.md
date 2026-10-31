# Changelog

All notable changes to this project are documented in this file.

## [1.2.2] - 2026-10-31

### Added

- The integration now adds the board to **Settings → Dashboards → Resources** automatically and updates its version number after every update, so tablets always load the current board. An entry added by hand is updated rather than duplicated. Dashboards in YAML mode get the board loaded on every page instead.

### Changed

- Setup Part 3 is now automatic.
- Clearer troubleshooting: an easier red-box checklist, a full example address, where voice dictation works, and new entries for missing features, updates not showing, notes that disappear and the missing Delete button.
- README pictures use full web addresses so they also appear on the Home Assistant Marketplace page.

## [1.2.1] - 2026-10-31

### Fixed

- The v1.2.0 release accidentally contained the 1.1.0 files. This release restores everything listed under 1.2.0: background themes (including Black) and stickers.
- Removed Python cache files (`__pycache__`) from the repository and added a `.gitignore` so they aren't uploaded again.

## [1.2.0] - 2026-10-31

### Added

- **Background themes:** a palette button opens a picker with eleven presets (Aurora, Black, Sunset, Ocean, Forest, Lavender, Ember, Graphite, Midnight, Halloween and Festive) and a custom three-colour option with live preview.
- The chosen background is saved centrally, so every screen showing the board changes together.
- New action `glass_messages.set_background` for switching themes from automations.
- **Stickers:** the Draw tab has a shelf of seventeen ready-made doodles (heart, sun, star, moon, flower, smile, home, cake, gift, coffee, rain, music, balloon, pumpkin, paw, pizza and a tick). Tap to add them to a note; they combine with your own drawing, and undo removes a whole sticker at a time.

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
