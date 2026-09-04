# Allow build scripts to be referenced without being copied into the final image
FROM scratch AS ctx
COPY build_files /
COPY system_files /system_files

# Base Image
FROM ghcr.io/ublue-os/bazzite-deck-nvidia-gnome:testing
## Remove Branding 
##

# Change Plymouth Boot Logo
COPY system_files/watermark.png /usr/share/plymouth/themes/spinner/watermark.png
COPY system_files/watermark.png /usr/share/plymouth/themes/bgrt/watermark.png


# Center the watermark and the spinner as a single group in the middle of
# the screen, with a gap between them: the watermark sits just above
# center (.40) and the spinner sits just below it (.62). Nudge these two
# numbers further apart for more gap, closer together for less. Also
# disable the firmware (motherboard/UEFI) boot logo baked into BGRT.
RUN sed -i \
    -e 's/^WatermarkHorizontalAlignment=.*/WatermarkHorizontalAlignment=.5/' \
    -e 's/^WatermarkVerticalAlignment=.*/WatermarkVerticalAlignment=.40/' \
    -e 's/^HorizontalAlignment=.*/HorizontalAlignment=.5/' \
    -e 's/^VerticalAlignment=.*/VerticalAlignment=.62/' \
    /usr/share/plymouth/themes/spinner/spinner.plymouth \
    /usr/share/plymouth/themes/bgrt/bgrt.plymouth && \
    sed -i 's/^UseFirmwareBackground=true/UseFirmwareBackground=false/' \
    /usr/share/plymouth/themes/bgrt/bgrt.plymouth

RUN \
    --mount=type=bind,from=ghcr.io/blue-build/modules:latest,src=/modules,dst=/tmp/modules,rw \
    --mount=type=bind,from=ghcr.io/blue-build/cli/build-scripts:latest,src=/scripts/,dst=/tmp/scripts/ \
    /tmp/scripts/run_module.sh 'initramfs' '{"type":"initramfs"}'

# Remove Bazzite Steam Videos
RUN printf '#!/usr/bin/bash\nexit 0\n' > /usr/bin/bazzite-steam-brand && \
    chmod +x /usr/bin/bazzite-steam-brand

# Rename Bazzite across OS
RUN sed -i \
    -e 's/^NAME=.*/NAME="SteamOS"/' \
    -e 's/^PRETTY_NAME=.*/PRETTY_NAME="SteamOS"/' \
    /usr/lib/os-release

# Replace Bazzite GNOME OS Logos
COPY system_files/steamos-logo.png /usr/share/pixmaps/fedora_logo_med.png
COPY system_files/steamos-white-logo.png /usr/share/pixmaps/fedora_whitelogo_med.png
COPY system_files/steamos-logo.svg /usr/share/icons/hicolor/scalable/places/bazzite-logo.svg
COPY system_files/steamos-logo-white.svg /usr/share/icons/hicolor/scalable/places/bazzite-logo-white.svg
COPY system_files/steamos-logo-le.svg /usr/share/icons/hicolor/scalable/places/bazzite-logo-le.svg

# Replace GDM Login Screen Logo (small logo at the bottom of the login screen)
# org.gnome.login-screen.logo scales whatever image is given down to 48px
# tall, so a raster image looks blurry at that size - point it at the SVG
# instead, which stays sharp at any scale.
#
# Also: disable the "welcome" banner message text (keeps the user-avatar
# carousel), force a solid black background (no picture, no gradient),
# and make sure the clock shows the date and day of the week.
RUN mkdir -p /etc/dconf/db/gdm.d && \
    printf '%s\n' \
        '[org/gnome/login-screen]' \
        'logo="/usr/share/icons/hicolor/scalable/places/bazzite-logo-white.svg"' \
        'banner-message-enable=false' \
        '' \
        '[org/gnome/desktop/background]' \
        'picture-uri=""' \
        'picture-uri-dark=""' \
        'picture-options="none"' \
        'primary-color="#000000"' \
        'secondary-color="#000000"' \
        'color-shading-type="solid"' \
        '' \
        '[org/gnome/desktop/interface]' \
        'clock-show-date=true' \
        'clock-show-weekday=true' \
        > /etc/dconf/db/gdm.d/95-steamos-branding && \
    dconf update

##
##

# Restart inputplumber after resume from suspend, so controllers
# (e.g. Steam Controller 2) re-attach cleanly instead of showing
# connected but unresponsive.
RUN mkdir -p /etc/systemd/system/systemd-suspend.service.d && \
    printf '[Service]\nExecStopPost=/usr/bin/systemctl restart inputplumber.service\n' \
        > /etc/systemd/system/systemd-suspend.service.d/restart-inputplumber.conf

### [IM]MUTABLE /opt
## Some bootable images, like Fedora, have /opt symlinked to /var/opt, in order to
## make it mutable/writable for users. However, some packages write files to this directory,
## thus its contents might be wiped out when bootc deploys an image, making it troublesome for
## some packages. Eg, google-chrome, docker-desktop.
##
## Uncomment the following line if one desires to make /opt immutable and be able to be used
## by the package manager.

# RUN rm /opt && mkdir /opt

### NTFS TOOLKIT
# Not needed for day-to-day mounting (the in-kernel ntfs3 driver handles
# that), but kept for its utilities: mkfs.ntfs, ntfsresize, ntfsclone,
# ntfsundelete, ntfsfix, ntfslabel, ntfsinfo — used when formatting,
# resizing, cloning, or recovering NTFS drives (e.g. the Windows partition).
RUN rpm-ostree install ntfs-3g && \
    rpm -q ntfs-3g >/dev/null 2>&1 || { echo "ERROR: ntfs-3g did not actually install." >&2; exit 1; }

### KEYD (Super+D: Desktop, Super+G: Game Mode)
## System-wide key remapping daemon (operates below any compositor via
## evdev/uinput). Gaming Mode's gamescope session has no shortcut
## editor of its own, so this is the only way to get single-keypress
## session switching that works from both Desktop and Gaming Mode -
## GNOME's Settings > Keyboard only applies to Desktop Mode.
RUN FEDORA_VERSION=$(rpm -E %fedora) && \
    curl -fLo /etc/yum.repos.d/_copr_alternateved-keyd.repo \
        "https://copr.fedorainfracloud.org/coprs/alternateved/keyd/repo/fedora-${FEDORA_VERSION}/alternateved-keyd-fedora-${FEDORA_VERSION}.repo" && \
    rpm-ostree install keyd && \
    rpm -q keyd >/dev/null 2>&1 || { echo "ERROR: keyd did not actually install." >&2; exit 1; } && \
    rm -f /etc/yum.repos.d/_copr_alternateved-keyd.repo

## keyd's command() action runs as root with no D-Bus session bus of
## its own, but steamosctl / return-to-gamemode expect to talk to the
## per-user session daemon. This wrapper finds whichever user owns the
## active seat0 session and re-execs the real command inside that
## user's session bus, so it works regardless of what invoked it.
RUN cat > /usr/libexec/keyd-session-switch <<'EOF' && \
    chmod +x /usr/libexec/keyd-session-switch
#!/usr/bin/bash
set -euo pipefail

case "${1:-}" in
    desktop) CMD=(/usr/bin/steamosctl switch-to-desktop-mode) ;;
    game)    CMD=(/usr/bin/return-to-gamemode) ;;
    *)       echo "Usage: $0 {desktop|game}" >&2; exit 1 ;;
esac

USER_NAME=$(loginctl list-sessions --no-legend | awk '$4=="seat0"{print $3; exit}')
if [ -z "${USER_NAME:-}" ]; then
    logger -t keyd-session-switch "no seat0 session found, aborting"
    exit 1
fi
USER_UID=$(id -u "$USER_NAME")

exec runuser -u "$USER_NAME" -- env \
    XDG_RUNTIME_DIR="/run/user/${USER_UID}" \
    DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${USER_UID}/bus" \
    "${CMD[@]}"
EOF

RUN mkdir -p /etc/keyd && \
    cat > /etc/keyd/default.conf <<'EOF'
[ids]
*

[main]
leftmeta = overload(meta, leftmeta)

[meta]
d = command(/usr/libexec/keyd-session-switch desktop)
g = command(/usr/libexec/keyd-session-switch game)
EOF

RUN systemctl enable keyd.service

### MODIFICATIONS
## make modifications desired in your image and install packages by modifying the build.sh script
## the following RUN directive does all the things required to run "build.sh" as recommended.

RUN --mount=type=bind,from=ctx,source=/,target=/ctx \
    --mount=type=cache,dst=/var/cache \
    --mount=type=cache,dst=/var/log \
    --mount=type=tmpfs,dst=/tmp \
    bash /ctx/build.sh

### CLEANUP
## Clears rpm-ostree/dnf5 caches, metadata, and lock files left behind by
## the install steps above. Without this, "bootc container lint" flags:
##   - nonempty-run-tmp: leftover lock files under /run/dnf, /run/rpm-ostree
##   - var-tmpfiles: cached repo/package data under /var without matching
##     systemd tmpfiles.d entries
## Neither warning affects the image's correctness, but clearing them
## keeps the lint output clean and shrinks the final image slightly.
RUN rpm-ostree cleanup -m && \
    dnf5 clean all && \
    rm -rf \
        /var/cache/* \
        /var/lib/dnf \
        /var/lib/rpm-ostree \
        /var/log/* \
        /var/tmp/* \
        /run/dnf \
        /run/rpm-ostree \
        /tmp/*

### LINTING
## Verify final image and contents are correct.
RUN bootc container lint
