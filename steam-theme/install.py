#!/usr/bin/env python3
"""Install the user-local Adwaita game-page bridge; no system Steam files change."""
from pathlib import Path
import shutil,subprocess,time,json
home=Path.home();source=Path(__file__).resolve().parent
target=home/'.local/share/loew-steam-theme';state=home/'.local/state/loew-steam-theme';state.mkdir(parents=True,exist_ok=True)
backup=state/time.strftime('backup-%Y%m%d-%H%M%S');backup.mkdir()
node=shutil.which('node')
if not node:raise SystemExit('Node.js 22 or newer is required')
major=int(subprocess.check_output([node,'--version'],text=True).strip().lstrip('v').split('.')[0])
if major<22:raise SystemExit('Node.js 22 or newer is required')
unit=home/'.config/systemd/user/loew-steam-theme.service'
for p in (target,unit):
 if p.exists():
  if p.is_dir():shutil.copytree(p,backup/p.name)
  else:shutil.copy2(p,backup/p.name)
shutil.copytree(source,target,dirs_exist_ok=True)
unit.parent.mkdir(parents=True,exist_ok=True)
unit.write_text(f'''[Unit]
Description=Adwaita Steam game pages and Lumen header compatibility
After=graphical-session.target

[Service]
Type=simple
ExecStart="{node}" "{target}/bridge.mjs"
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
UMask=0077

[Install]
WantedBy=default.target
''')
# Keep the approved Game Mode themes separate, including their user settings.
themes=home/'homebrew/themes'
if themes.exists():
 for theme in (target/'game-mode').iterdir():
  dst=themes/theme.name
  if dst.exists():shutil.copytree(dst,backup/theme.name)
  for src in theme.iterdir():
   if src.name=='config_USER.json' and (dst/src.name).exists():continue
   dst.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst/src.name)
subprocess.run(['systemctl','--user','daemon-reload'],check=True)
subprocess.run(['systemctl','--user','enable','--now','loew-steam-theme.service'],check=True)
subprocess.run(['systemctl','--user','restart','loew-steam-theme.service'],check=True)
print(f'Installed: {target}\nRollback backup: {backup}')
