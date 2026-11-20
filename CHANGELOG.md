# Changelog

All notable changes to the **Orbit (Social Circle Tracker)** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.0.5] - 2026-11-20

### Fixed
- Removed the obsolete duplicate bottom navigation bar and toast container, which left a second set of dead buttons on the page.
- All bottom controls (Circle, Promised, Calendar, Settings and the add-friend button) now respond, with clear feedback when there are no promised callbacks.

### Changed
- Version bumped to 1.0.5 across web assets and the Android manifest.
- Service-worker cache bumped so deployed web users receive this release.

## [v1.0.4] - 2026-11-19

### Added
- Persistent Android reminder notification showing the next due calls/meetings, with tap-through to the contact.
- Foreground service with sticky restart, boot/update receivers and battery-optimization prompt so reminders survive background kills.
- Automatic call-log reading on app open, with permission prompt and immediate import after grant.
- Complete mobile-first UI redesign: hero week card, contact rows, bottom navigation, sheet modals, and system fonts for fully offline rendering.
- Android home-screen reminder widget showing the top three due contacts, with tap-through to the contact profile.
- New Orbit icon (rings around a heart) for PWA and Android launcher, including xxxhdpi.
- `start-local.bat` / `start-local.ps1`: one-click local launch that compiles the server from source if needed.
- `release-apk.ps1`: syncs assets, runs static verification, builds and signs the APK, and reports where to install it.
- Social life dashboard: "This Week" shortlist of who needs a check-in and a unified activity timeline across all contacts.
- Meaningful catch-ups stat and weekly goal, counting real calls/meetups instead of raw XP.
- Cadence-based check-in notifications (previously only broken promises triggered alerts).
- Manifest shortcuts now open the promised-call filter, quick log, or a contact profile.

### Fixed
- Bottom navigation buttons now work with the redesigned UI, including correct active highlighting.
- Deferred non-critical startup work and cached connection metrics per render for faster opening and scrolling.
- Removed unused READ_PHONE_STATE permission, automatic device backup, and the Google Identity request on every launch.
- Reduced background timer frequency and paused cloud sync while the app is hidden.
- Closed the Google Sync modal tags that hid the calendar, call-log, contacts, bottom nav and toasts.
- Cloud sync channels now use random keys instead of email addresses; pairing requires a long key.
- Toasts no longer interpret contact names as HTML; Android WebView no longer allows universal file access or silent permission grants, and remote pages no longer load inside the bridged WebView.
- Editing a friend no longer resets their XP or freezes their level.
- Calendar scheduling no longer creates fake "promised callback" alerts.
- Sync merges use per-contact timestamps and tombstones, so newer edits and deletions propagate instead of being overwritten.
- Don't double-sync on every save; Drive file creation now uses the multipart/related format; disconnect revokes the token.
- LAN sync no longer skips phones and non-localhost origins; API responses are not cached by the service worker.
- Local server no longer exposes scripts/tokens via static files, no longer uses CORS `*`, and reads full request bodies.
- Keyboard and screen-reader improvements: Escape/focus trap in modals, focusable stat cards and radios, no zoom lock, higher-contrast text.

### Planned
- Automatic cross-device notification alerts for overdue check-ins.
- Extended analytics for relationship cadences and interaction frequency.

---

## [v1.0.3] - 2026-10-19

### Added
- Multi-phone synchronization support.
- Sub-10-second call event detection and auto-logging.
- Hardened Google Drive automated background backups and pairing flow.

---

## [v1.0.2] - 2026-10-18

### Added
- Google account cloud sync & pairing handshake.
- Daily and 3-day relationship cadence presets.
- Dual-target backup and restore supporting local storage and Google Drive.

---

## [v1.0.1] - 2026-10-17

### Added
- One-tap Android contacts picker with `READ_CONTACTS` integration.
- Direct synchronization of incoming/outgoing call logs into contact interaction history.
- Google Calendar intent launching and direct desktop calendar integration.

### Fixed
- Cleaned up obsolete host process artifacts.
- Removed extraneous friend action from profile editing drawer.

---

## [v1.0.0] - 2026-10-17

### Added
- Initial release of Orbit: local-first relationship health tracking, orbit circles, and contact cadence management.
