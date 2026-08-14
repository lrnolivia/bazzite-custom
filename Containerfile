# Allow build scripts to be referenced without being copied into the final image
FROM scratch AS ctx
COPY build_files /
COPY system_files /system_files

# Base Image
FROM ghcr.io/ublue-os/bazzite-nvidia:testing

## Remove Branding
##

# Change Plymouth Boot Logo
COPY system_files/steamos-watermark.png /usr/share/plymouth/themes/spinner/watermark.png
COPY system_files/steamos-watermark.png /usr/share/plymouth/themes/bgrt/watermark.png

# Enlarge the watermark - the two-step plymouth module has no size/scale
# key, so the image itself has to be bigger. Adjust the width (400px here)
# to taste; height scales automatically to preserve aspect ratio.
RUN if ! command -v magick >/dev/null 2>&1 && ! command -v convert >/dev/null 2>&1; then \
        dnf install -y ImageMagick; \
    fi && \
    for f in /usr/share/plymouth/themes/spinner/watermark.png \
             /usr/share/plymouth/themes/bgrt/watermark.png; do \
        if command -v magick >/dev/null 2>&1; then \
            magick "$f" -resize 400x "$f"; \
        else \
            convert "$f" -resize 400x "$f"; \
        fi; \
    done

# Move the watermark to top-middle and disable the firmware (motherboard/UEFI)
# boot logo baked into the BGRT theme
RUN sed -i \
    -e 's/^WatermarkVerticalAlignment=.*/WatermarkVerticalAlignment=.08/' \
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

# Replace Bazzite OS Logos
COPY system_files/steamos-logo.png /usr/share/pixmaps/fedora_logo_med.png
COPY system_files/steamos-white-logo.png /usr/share/pixmaps/fedora_whitelogo_med.png
COPY system_files/steamos-logo.svg /usr/share/icons/hicolor/scalable/places/bazzite-logo.svg
COPY system_files/steamos-logo-white.svg /usr/share/icons/hicolor/scalable/places/bazzite-logo-white.svg
COPY system_files/steamos-logo-le.svg /usr/share/icons/hicolor/scalable/places/bazzite-logo-le.svg

# Replace SDDM Login Screen Background (KDE's login manager, not GDM)
# Fedora/Bazzite ships the Breeze SDDM theme under /usr/share/sddm/themes/01-breeze-fedora.
# Its background is controlled by theme.conf.user, not dconf - forcing
# type=color with a black color gives the same solid-black result we did
# for GDM. The clock/date/weekday display is on by default in this theme,
# so no extra config is needed for that. Note: SDDM's Breeze theme has no
# equivalent to GDM's "welcome banner message" setting - there's nothing
# to disable here, since it never had one.
RUN THEME_DIR=/usr/share/sddm/themes/01-breeze-fedora && \
    if [ ! -d "$THEME_DIR" ]; then THEME_DIR=/usr/share/sddm/themes/breeze; fi && \
    mkdir -p "$THEME_DIR" && \
    printf '%s\n' \
        '[General]' \
        'type=color' \
        'color=#000000' \
        'background=' \
        > "$THEME_DIR/theme.conf.user"

##
##

### [IM]MUTABLE /opt
## Some bootable images, like Fedora, have /opt symlinked to /var/opt, in order to
## make it mutable/writable for users. However, some packages write files to this directory,
## thus its contents might be wiped out when bootc deploys an image, making it troublesome for
## some packages. Eg, google-chrome, docker-desktop.
##
## Uncomment the following line if one desires to make /opt immutable and be able to be used
## by the package manager.

# RUN rm /opt && mkdir /opt

### MODIFICATIONS
## make modifications desired in your image and install packages by modifying the build.sh script
## the following RUN directive does all the things required to run "build.sh" as recommended.

RUN --mount=type=bind,from=ctx,source=/,target=/ctx \
    --mount=type=cache,dst=/var/cache \
    --mount=type=cache,dst=/var/log \
    --mount=type=tmpfs,dst=/tmp \
    /ctx/build.sh

### LINTING
## Verify final image and contents are correct.
RUN bootc container lint
