# Smilk Launcher v1.0.6 Release Notes

This release introduces a new custom dialog system, additional modpack settings, full English localization, and several bug fixes for the updating and launching flows.

## New Features & Improvements

### Custom UI Dialog System
- Replaced all native Windows `alert()` and `confirm()` dialogs with in-launcher HTML modals for a consistent user experience.
- Added dynamic status icons (success, warning, error, info) to dialogs.
- Dialog buttons now match the launcher's styling.

### Expanded Game & Modpack Options
- **GUI Scale & Max FPS:** You can now configure the Minecraft **UI Scale** (Auto, 1x, 2x, 3x, 4x) and **Max FPS** (10-250, or Unlimited) directly from the launcher settings.
- **Modpack Management:** Added two new options to the Modpack Configuration menu:
  - **Reset Options:** Reset the Minecraft settings (`options.txt`) and shader preferences for a specific modpack back to defaults.
  - **Delete Modpack:** Uninstall a specific modpack without affecting other downloaded packs.

### Java Installation Flow
- Redesigned the Java missing/outdated warning modal.
- Automatic installation now handles success and error states interactively inside the modal, without spawning external alerts.

### Localization
- The launcher interface and all internal dialogs have been fully translated to English.

## Bug Fixes

- **Play Button State Bug:** Fixed a visual issue where the background update-checker would overwrite the "UPDATING..." button text with "PLAY" or "INSTALL" during an active download.
- **Launch State:** The play button now accurately displays "WAIT..." during the loading phase before the game boots.
- **Retroactive Version Tracking:** Fixed an issue where older installations displayed a Git LFS hash (e.g., `v3e81ab9`). The launcher now dynamically fetches the proper human-readable version (e.g., `v1.5`) in the background without requiring a re-download.
