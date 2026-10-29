#!/usr/bin/env python3
"""Apply the opt-in Lumen neutral palette without changing the user's accent."""
from pathlib import Path
import json
import re
import shutil
import subprocess
import time

home = Path.home()
source = Path(__file__).resolve().parent
backup = home / '.local/state/loew-lumen-palette' / time.strftime('backup-%Y%m%d-%H%M%S')
backup.mkdir(parents=True)
shell_dir = home / '.local/share/themes/Lumen-Neutral/gnome-shell'
schema = 'org.gnome.shell.extensions.user-theme'
old_shell = subprocess.check_output(['gsettings', 'get', schema, 'name'], text=True).strip()
manifest = {'shell_theme': old_shell, 'files': {}}
native_shell = subprocess.check_output([
    'gresource', 'extract', '/usr/share/gnome-shell/gnome-shell-theme.gresource',
    '/org/gnome/shell/theme/gnome-shell-dark.css',
], text=True)

def neutral(match):
    channels = [int(match[0][i:i + 2], 16) for i in (1, 3, 5)]
    if max(channels) - min(channels) > 8:
        return match[0]
    # Retain surface brightness and all non-neutral accent/status colours.
    value = round(sum(channels) / 3)
    return '#' + f'{value:02x}' * 3

native_shell = re.sub(r'#[0-9a-fA-F]{6}\b', neutral, native_shell)

def preserve(path):
    key = str(path.relative_to(home))
    manifest['files'][key] = path.exists()
    if path.exists():
        dest = backup / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)

begin = '/* Lumen neutral surfaces: begin */'
end = '/* Lumen neutral surfaces: end */'
for version in (3, 4):
    path = home / f'.config/gtk-{version}.0/gtk.css'
    preserve(path)
    old = path.read_text() if path.exists() else ''
    old = re.sub(re.escape(begin) + r'.*?' + re.escape(end), '', old, flags=re.S)
    css = (source / 'gtk.css').read_text()
    if version == 4:
        css += '\n' + (source / 'gtk4.css').read_text()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(old.rstrip() + '\n\n' + begin + '\n' + css + end + '\n')

shell_css = shell_dir / 'gnome-shell.css'
preserve(shell_css)
preserve(shell_dir / 'base.css')
shell_dir.mkdir(parents=True, exist_ok=True)
(shell_dir / 'base.css').write_text(native_shell)
shutil.copy2(source / 'gnome-shell.css', shell_css)
(backup / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
subprocess.run(['gsettings', 'set', schema, 'name', 'Lumen-Neutral'], check=True)
print(f'Installed Lumen neutral surfaces. Backup: {backup}')
