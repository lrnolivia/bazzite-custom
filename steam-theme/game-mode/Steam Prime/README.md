# Steam Prime

Steam Prime combines 39 selected CSS Loader modules into one theme. The Millennium companion is a separate Steam Prime fork of Fluenty, with the selected layout and artwork enhancements included.

## Customization

Open Steam Prime in CSS Loader. Its 16 controls use four groups:

| Group | Controls |
| --- | --- |
| Appearance | Terra Prime HIS or custom palette, control radius, card radius |
| Header | Home/game top padding, side padding, Home-only side padding, placement of the profile, clock, and battery |
| Menus | Indicator color, context menu width, layout, and label alignment |
| Effects | Dialog blur, dialog opacity, shell blur |

The HIS palette uses warm grey surfaces, true black for receding areas, and white menu selections with deep grey text (`#222220`). The saved control and card radii are 20px and 8px. Single-line menu selections remain capsules; two-line Quick Access dropdown fields follow Card Radius. Cards and media share Card Radius; controls and keyboard keys share Control Radius. Selected fonts and glyph artwork are preserved.

Home and game headers are clear when expanded, with an 18px clock, and compact while scrolling. The compact header uses a blurred, feathered black backdrop. Home and game pages share frosted cards, reflected artwork, and long black fades. Home focus glow follows the loaded card artwork, sits 8px below it, and extends beyond its edges. Game pages keep the centered logo and floating Play controls and tabs above the backdrop. Store panels use the same material with green purchase buttons.

Game Info uses a frosted panel with columns for the poster, description, available facts, and a vertical feature list; the layout stacks on smaller screens. The description, facts, and feature groups are centered with text aligned left in both modes, and feature glyphs are enlarged. Feature pages show up to four items in Big Picture and five on desktop. Use the dot controls to switch pages. Links wrap in a row below, and Steam's native links and Collections remain available. Matched non-Steam games show metadata from their Steam catalog match in the same tab; unmatched games retain Steam's non-Steam notice beside their custom artwork.

The default CSS Loader profile selects only Steam Prime. The companion has no duplicate option list; its saved selections are built into the fork. Its separate local identity protects the customizations from upstream Fluenty updates. Header backdrops follow the page and scroll state automatically. Home keeps its feathered footer backdrop; game-page footers use a compact bar background with a long feathered edge that automatically fits the free space above, staying clear of controls.

## Preserved choices

`config_USER.json` holds the current settings. `settings-map.json` maps the original modules. `fixed-choices.json` and `consolidated-choices.json` preserve consolidated selections and their original definitions. `automatic-surfaces.json` retains the retired header/footer opacity controls and their saved values. The companion's `selected-configuration.json` preserves its selections. These files support recovery; customization uses the 16 controls above.

## Recovery

The complete snapshot is `Documents\Steam Theme\Steam Prime-2026-10-15.6.zip`. It includes Steam Prime, `default.profile`, the Millennium companion, and saved profiles. Exit Steam before restoring installed folders: CSS Loader themes belong in `homebrew\themes`; the companion belongs in `Steam\millennium\themes\steam-prime`. Earlier finished snapshots remain beside it.

The 45 retired CSS Loader folders and original Fluenty installation were archived, verified file by file, and removed. `retired-sources.json` records the folder names, archive path, and SHA-256 checksum. Their recovery archive is `Documents\Steam Theme\Recovery\Retired themes-2026-10-15.zip`: restore folders from `css-loader` to `homebrew\themes`, and from `millennium` to `Steam\millennium\themes`. Select the intended theme/profile after restoration; enabling the original modules alongside Steam Prime can duplicate their styling.

Earlier snapshots and settings remain in `Documents\Steam Theme\Recovery` and `Documents\Steam Theme\Original theme settings 2026-10-15`.

## Compatibility

The current Steam Beta Home layout is preserved. Styling also covers the existing Home cards; CSS does not add Beta-only client features to the stable client. The companion is installed in the Windows Millennium theme directory.

Original authors and licenses remain in `NOTICE`, the copied module folders, and the companion's `NOTICE-Steam-Prime` and upstream source notices.
