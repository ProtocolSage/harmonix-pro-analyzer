#!/usr/bin/env bash
set -euo pipefail

# Guardrail: refuse DrvFS (/mnt/c etc.)
if df -T . | awk 'NR==2{print $2}' | grep -qiE 'drvfs|fuseblk|cifs|smb'; then
  echo "Refusing to run from DrvFS-mounted path. Move repo under ~/dev (ext4)." >&2
  exit 1
fi

SRC=".essentia_build/msd-vgg-1/tfjs"
DST="public/models/msd-vgg-1"

test -f "$SRC/model.json"
mkdir -p "$DST"
cp -f "$SRC/model.json" "$DST/"
cp -f "$SRC/"*shard*.bin "$DST/"
echo "Copied TFJS model to $DST"
