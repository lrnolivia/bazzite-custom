#!/usr/bin/env python3
"""Install Steam Prime - Gnome; no system Steam files change."""
from pathlib import Path
import shutil,subprocess,time,json
home=Path.home();source=Path(__file__).resolve().parent
theme_name=json.loads((source/'desktop/theme.json').read_text())['name']
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
# Replace the packaged assets so retired themes cannot return on reinstall.
if (target/'game-mode').exists():shutil.rmtree(target/'game-mode')
shutil.copytree(source,target,dirs_exist_ok=True)
# Rename existing user-facing launcher/healer labels while retaining their paths
# and upstream Adwaita installation/health checks.
labels={
 home/'.local/bin/steam-adwaita-launch':{
  '-a "Adwaita for Steam"':'-a "'+theme_name+'"',
  '"Adwaita loaded correctly."':'"'+theme_name+' loaded correctly."',
  '"Steam reset Adwaita"':'"Steam reset '+theme_name+'"',
  '"Adwaita repaired"':'"'+theme_name+' repaired"',
  '"Adwaita repair failed"':'"'+theme_name+' repair failed"',
 },
 home/'.local/bin/adwaita-steam-heal':{
  'notify-send "Adwaita for Steam"':'notify-send "'+theme_name+'"',
  'notify_user "Automatic Adwaita repair failed."':'notify_user "Automatic '+theme_name+' repair failed."',
  'notify_user "Adwaita for Steam updated/repaired."':'notify_user "'+theme_name+' updated/repaired."',
  'notify_user "Adwaita was reinstalled."':'notify_user "'+theme_name+' was reinstalled."',
 },
 home/'.config/autostart/adwaita-steam-heal.desktop':{
  'Name=Adwaita Steam Self-Heal':'Name='+theme_name+' Self-Heal',
  'Comment=Repair Adwaita for Steam when entering Desktop Mode':'Comment=Repair '+theme_name+' when entering Desktop Mode',
 },
}
for file,replacements in labels.items():
 if not file.is_file():continue
 before=file.read_text();after=before
 for old,new in replacements.items():after=after.replace(old,new)
 if after!=before:
  saved=backup/'user-labels'/file.relative_to(home);saved.parent.mkdir(parents=True,exist_ok=True)
  shutil.copy2(file,saved);file.write_text(after)
unit.parent.mkdir(parents=True,exist_ok=True)
unit.write_text(f'''[Unit]
Description={theme_name} desktop theme and Lumen compatibility
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
# Steam Prime includes the former standalone Game Mode components.
# Copy nested assets recursively, retaining an existing Prime customization.
themes=home/'homebrew/themes'
if themes.exists():
 for theme in (target/'game-mode').iterdir():
  if not theme.is_dir():continue
  dst=themes/theme.name
  if dst.exists():shutil.copytree(dst,backup/theme.name)
  saved={}
  if theme.name=='Steam Prime':
   for cfg in dst.glob('config_*.json'):
    saved[cfg.name]=cfg.read_bytes()
  shutil.copytree(theme,dst,dirs_exist_ok=True)
  for name,data in saved.items():(dst/name).write_bytes(data)
subprocess.run(['systemctl','--user','daemon-reload'],check=True)
subprocess.run(['systemctl','--user','enable','--now','loew-steam-theme.service'],check=True)
subprocess.run(['systemctl','--user','restart','loew-steam-theme.service'],check=True)
print(f'Installed {theme_name}: {target}\nRollback backup: {backup}')
