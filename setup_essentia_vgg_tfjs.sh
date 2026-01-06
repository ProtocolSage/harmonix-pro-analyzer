#!/usr/bin/env bash
set -euo pipefail

# ---------- Guardrails ----------
ROOT="$(pwd)"
if [[ "$ROOT" == /mnt/* ]]; then
  echo "ERROR: Repo is on DrvFS ($ROOT). Move it to WSL ext4 (e.g., ~/dev/...)."
  exit 1
fi

command -v python3 >/dev/null || { echo "ERROR: python3 not found"; exit 1; }
command -v curl >/dev/null || { echo "ERROR: curl not found (install: sudo apt-get update && sudo apt-get install -y curl)"; exit 1; }

# ---------- Config ----------
MODEL_URL="https://essentia.upf.edu/models/autotagging/msd/msd-vgg-1.onnx"
WORKDIR="$ROOT/.essentia_build/msd-vgg-1"
VENV="$ROOT/.tfjs_conv_env"
TARGET="$ROOT/frontend/public/models/musicvgg"

# ---------- Clean build dirs ----------
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR" "$TARGET"

# ---------- Create venv ----------
python3 -m venv "$VENV"
"$VENV/bin/python" -m pip install -U pip wheel setuptools

# ---------- Install pinned toolchain ----------
# Key pins:
# - onnx<1.20 to avoid onnx_graphsurgeon breakage
# - onnx-graphsurgeon from NVIDIA index
"$VENV/bin/pip" uninstall -y onnx onnx-graphsurgeon onnx_graphsurgeon >/dev/null 2>&1 || true
"$VENV/bin/pip" install "onnx==1.19.1" "onnxruntime==1.20.1" "onnx2tf==1.28.8" "tensorflow==2.19.0" "tensorflowjs==4.22.0"

# NVIDIA hosted package index for onnx-graphsurgeon
"$VENV/bin/pip" install --extra-index-url https://pypi.ngc.nvidia.com "onnx-graphsurgeon==0.5.8"

# ---------- Sanity checks ----------
"$VENV/bin/python" - <<'PY'
import onnx
import onnx_graphsurgeon as gs
import tensorflow as tf
print("OK:", "onnx", onnx.__version__, "| tf", tf.__version__, "| onnx_graphsurgeon imported")
PY

# ---------- Download ONNX ----------
ONNX_PATH="$WORKDIR/model.onnx"
echo "Downloading: $MODEL_URL"
curl -L --fail --retry 3 --retry-delay 2 -o "$ONNX_PATH" "$MODEL_URL"

# Verify ONNX parses
"$VENV/bin/python" - <<PY
import onnx
m = onnx.load("$ONNX_PATH")
onnx.checker.check_model(m)
print("OK: ONNX model loads + validates")
PY

# ---------- Convert ONNX -> SavedModel ----------
# onnx2tf CLI usage supports: -i input.onnx -o output_folder -osd (SavedModel) :contentReference[oaicite:1]{index=1}
pushd "$WORKDIR" >/dev/null
"$VENV/bin/onnx2tf" -i "$ONNX_PATH" -o "$WORKDIR/out" -osd
popd >/dev/null

SAVED_MODEL_DIR="$WORKDIR/out/saved_model"
if [[ ! -d "$SAVED_MODEL_DIR" ]]; then
  echo "ERROR: Expected SavedModel at: $SAVED_MODEL_DIR"
  find "$WORKDIR/out" -maxdepth 3 -type f | head -n 50
  exit 1
fi

# ---------- Convert SavedModel -> TFJS ----------
# TensorFlow.js converter docs: input_format=tf_saved_model and output_format=tfjs_graph_model :contentReference[oaicite:2]{index=2}
TFJS_TMP="$WORKDIR/tfjs"
rm -rf "$TFJS_TMP"
mkdir -p "$TFJS_TMP"

"$VENV/bin/tensorflowjs_converter" \
  --input_format=tf_saved_model \
  --output_format=tfjs_graph_model \
  "$SAVED_MODEL_DIR" \
  "$TFJS_TMP"

# ---------- Deploy into frontend/public/models/musicvgg ----------
rm -rf "$TARGET"/*
cp -a "$TFJS_TMP"/* "$TARGET/"

# Verify model.json exists
test -f "$TARGET/model.json" || { echo "ERROR: model.json missing in $TARGET"; ls -la "$TARGET"; exit 1; }

echo "DONE"
echo "TFJS model deployed to: $TARGET"
echo "Files:"
ls -la "$TARGET"
