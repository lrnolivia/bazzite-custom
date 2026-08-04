# Allow build scripts to be referenced without being copied into the final image
FROM scratch AS ctx
COPY build_files /
COPY system_files /system_files

# Base Image — KDE Plasma, Nvidia drivers, Game Mode (gamescope-session) included
FROM ghcr.io/ublue-os/bazzite-deck-nvidia:stable

## Remove Branding
##

# 1) Change Plymouth Boot Logo — DE-agnostic, runs before any desktop loads
COPY system_files/steamos-watermark.png /usr/share/plymouth/themes/spinner/watermark.png
COPY system_files/steamos-watermark.png /usr/share/plymouth/themes/bgrt/watermark.png

RUN \
    --mount=type=bind,from=ghcr.io/blue-build/modules:latest,src=/modules,dst=/tmp/modules,rw \
    --mount=type=bind,from=ghcr.io/blue-build/cli/build-scripts:latest,src=/scripts/,dst=/tmp/scripts/ \
    /tmp/scripts/run_module.sh 'initramfs' '{"type":"initramfs"}'

# 2) Remove Bazzite Steam Videos — DE-agnostic, not tied to GNOME or KDE
RUN printf '#!/usr/bin/bash\nexit 0\n' > /usr/bin/bazzite-steam-brand && \
    chmod +x /usr/bin/bazzite-steam-brand

# 3) Rename Bazzite across OS, including the LOGO= key Plasma's About page
#    (kinfocenter) actually reads — this replaces the GNOME banner-path
#    mechanism, which doesn't exist on KDE
RUN sed -i \
    -e 's/^NAME=.*/NAME="SteamOS"/' \
    -e 's/^PRETTY_NAME=.*/PRETTY_NAME="SteamOS"/' \
    -e 's/^LOGO=.*/LOGO=steamos-logo-icon/' \
    /usr/lib/os-release && \
    grep -q '^LOGO=' /usr/lib/os-release || echo 'LOGO=steamos-logo-icon' >> /usr/lib/os-release

# 4) Replace OS logo for KDE/Plasma (untested upstream — confirm on your own
#    install). kinfocenter resolves the distro logo through the LOGO= name
#    above via standard icon-theme lookup, at 8 fixed sizes, rather than the
#    two hardcoded banner paths GNOME uses.
#
#    Rather than requiring 8 manually-exported PNGs, this generates the full
#    icon set at build time from the single steamos-logo.svg you already
#    have in system_files/ — scaled to fit and padded onto a transparent
#    square canvas at each size, per the sizing note in the guide.
COPY system_files/steamos-logo.svg /usr/share/icons/hicolor/scalable/apps/steamos-logo-icon.svg

RUN dnf install -y ImageMagick && \
    for size in 16 22 24 32 36 48 96 256; do \
        mkdir -p /usr/share/icons/hicolor/${size}x${size}/apps && \
        convert -background none -resize ${size}x${size} -gravity center -extent ${size}x${size} \
            /usr/share/icons/hicolor/scalable/apps/steamos-logo-icon.svg \
            /usr/share/icons/hicolor/${size}x${size}/apps/steamos-logo-icon.png; \
    done && \
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor || true && \
    dnf remove -y ImageMagick && \
    dnf clean all

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
