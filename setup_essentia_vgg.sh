#!/usr/bin/env bash

set -euo pipefail

MODEL_URL="https://essentia.upf.edu/models/autotagging/msd/msd-vgg-1-tfjs.zip"
TARGET_DIR="frontend/public/models/musicvgg"
TMP_ZIP="/tmp/msd-vgg-1-tfjs.zip"

mkdir -p "$TARGET_DIR"

echo "Attempting to download Essentia VGG TFJS model from:"
echo "  $MODEL_URL"

# Attempt up to 3 downloads
for i in 1 2 3; do
  echo "Download attempt $i..."
  wget -q --show-progress -O "$TMP_ZIP" "$MODEL_URL" || true

  # Quick sanity check: file exists and > 100KB
  if [[ -f "$TMP_ZIP" && $(stat -c%s "$TMP_ZIP") -gt 100000 ]]; then
    # Check valid zip
    unzip -t "$TMP_ZIP" &> /dev/null && break
    echo "Downloaded file is not a valid ZIP, retrying..."
  else
    echo "Download failed or file too small, retrying..."
  fi

  sleep 2
done

if ! unzip -t "$TMP_ZIP" &> /dev/null; then
  echo "ERROR: Unable to download a valid TFJS zip. Exiting." >&2
  exit 1
fi

echo "Extracting to $TARGET_DIR..."
unzip -o "$TMP_ZIP" -d "$TARGET_DIR"

echo "Cleaning up..."
rm -f "$TMP_ZIP"

echo "Done. Model files in $TARGET_DIR:"
ls -1 "$TARGET_DIR"
