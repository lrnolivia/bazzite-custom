#!/usr/bin/env python3
"""Backport only motion to an existing Windows Steam Prime installation."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('theme', type=Path, help='Installed steam-prime theme directory')
args = parser.parse_args()
target = args.theme.resolve()
source = Path(__file__).resolve().parent
if not (target / 'skin.json').is_file() or not (target / 'shared-library/index.js').is_file():
    raise SystemExit('Expected an existing Steam Prime theme with shared-library/index.js')

accent_path = 'shared-library/scripts/artworkAccent.js'
accent = (target / accent_path).read_text()
linux_accent = (source / 'desktop/scripts/artworkAccent.js').read_text()
fade = linux_accent[linux_accent.index('const accentAnimations='):linux_accent.index('const sampled =')]
if 'function fadeAccent(' not in accent:
    accent = accent.replace('const overrideStorageKey=', fade + 'const overrideStorageKey=', 1)
    anchor = '        for(const bar of bars) {'
    if accent.count(anchor) != 1:
        raise SystemExit('Unrecognized accent apply function; no files changed')
    accent = accent.replace(anchor, anchor + "\n            const changed=bar.style.getPropertyValue('--game-play-accent')!==value.color;\n            const fades=changed?[...bar.querySelectorAll('.PlayButtonContainer>.ButtonChild')].map(button=>({button,from:getComputedStyle(button).backgroundColor})):[];", 1)
    anchor = "                bar.style.setProperty('--game-play-text',value.text||'#252525');\n            }"
    if accent.count(anchor) != 1:
        raise SystemExit('Unrecognized accent assignment; no files changed')
    accent = accent.replace(anchor, anchor + '\n            if(changed)for(const {button,from}of fades)fadeAccent(button,from,value.color);', 1)
    accent = accent.replace('window.__fluentyArtworkAccentDispose=()=>{', 'window.__fluentyArtworkAccentDispose=()=>{for(const a of accentAnimations.values())a.cancel();accentAnimations.clear();', 1)

index = (target / 'shared-library/index.js').read_text()
motion_import = "import '../src/scripts/gamePageMotion.js';"
if motion_import not in index:
    index += '\n' + motion_import + '\n'

css_path = 'shared-library/styles/action-colors.css'
css = (target / css_path).read_text()
marker = '/* Shared desktop accent arrival motion */'
if marker not in css:
    linux_css = (source / 'desktop/styles/adwaita.css').read_text()
    start = linux_css.index('body.DesktopUI .PlayButtonContainer>.ButtonChild {transition:')
    end = linux_css.index('/* A feathered shade', start)
    css += '\n' + marker + '\n' + linux_css[start:end] + '\n'

files = {
    accent_path: accent,
    'shared-library/index.js': index,
    css_path: css,
    'src/scripts/gamePageMotion.js': (source / 'game-mode/gamePageMotion.js').read_text(),
}
backup = Path.home() / '.local/state/loew-steam-theme' / time.strftime('windows-motion-%Y%m%d-%H%M%S')
backup.mkdir(parents=True)
manifest = {'theme': str(target), 'files': {}}
for name, text in files.items():
    path = target / name
    saved = backup / name
    saved.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, saved)
    path.write_text(text)
    manifest['files'][name] = hashlib.sha256(path.read_bytes()).hexdigest()
(backup / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Backported motion to {target}\nBackup: {backup}')
