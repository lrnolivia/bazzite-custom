# Allow build scripts to be referenced without being copied into the final image
FROM scratch AS ctx
COPY build_files /
COPY system_files /system_files

# Base Image
FROM ghcr.io/ublue-os/bazzite-gnome-nvidia:testing

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
            magick "$f" -resize 350x "$f"; \
        else \
            convert "$f" -resize 350x "$f"; \
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
