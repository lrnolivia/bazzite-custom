# Adwaita Steam game pages

Ports the approved Desktop-2026-10-14.2 game-page design with the user-selected rounded Adwaita Play button into native Linux Steam while retaining the surrounding Adwaita theme. Lumen remains the LuaTools loader. Millennium is not required.

Run `python3 install.py` as your desktop user with Node.js 22 or newer available. Restart Steam after installation. The user service waits for Steam's existing loopback debugging endpoint, applies the page assets, reconstructs the CSS-module names used by the approved design, and positions Lumen's button outside Adwaita's clipped menu. The installed client's class map is refreshed whenever the bridge attaches to a new Steam window. Late-loading Adwaita styles are reconciled, including nested rules that suppress Steam's floating bar. Lumen settings use Adwaita surfaces and typography; its fixes control and the floating utility row retain separate hit targets.

The metadata bridge permits only three read-only Steam Store endpoints. It sends no account cookies or credentials and enforces URL, response-size, concurrency and request limits. Non-Steam games are matched only when the normalized title has exactly one Steam result. The info panel starts collapsed.

Game Mode uses Steam Prime v0.2.0 under `~/homebrew/themes`, including its bundled components, fonts, licenses, and all 16 Windows settings. The default CSS Loader profile selects Steam Prime. Desktop-window injection targets are excluded to preserve Adwaita. The existing user service also supplies semantic class aliases to Big Picture and its menu popups, resolving them from the installed Steam build; CSS Loader continues to load the theme CSS. Existing Prime settings survive reinstall. Controller behavior requires verification in an actual Game Mode session.

After CSS Loader successfully loads Prime, redundant standalone theme directories can be archived outside `~/homebrew/themes` and removed. Retain any external dependencies declared by Prime; this version has none. Keep CSS Loader runtime files such as `STORE` and `css_translations.json`. Do not delete the loader or its plugins.

To disable the desktop port: `systemctl --user disable --now loew-steam-theme.service`, then restart Steam. Backups of earlier local files and replaced Game Mode themes are stored under `~/.local/state/loew-steam-theme/`. Restore those separately if needed. The bridge does not change game data or Steam credentials.

Reference export SHA256: `652415de58921be62852d34bf7683fa4e0851e6df0a0f4493986165f4fcc5019`. All 130 files in its snapshot manifest were verified before selecting the game-page assets. Upstream Adwaita retains its own license and installation.

The bridge decorates only page changes and image loads. It caches reconciled stylesheets, avoids style-observer feedback loops, and fetches metadata only for the active non-Steam page. Hero logo centering is handled by the page CSS rather than scanning and rewriting the library.
