#!/usr/bin/env bash

set -euo pipefail

echo "=== Setting up Python virtualenv ==="

# Create a virtual environment for conversion
PYENV_DIR=".tfjs_conv_env"
python3 -m venv "$PYENV_DIR"
source "$PYENV_DIR/bin/activate"

echo "=== Installing converter dependencies ==="
# Upgrade pip + install tensorflowjs (which includes the converter CLI)
pip install --upgrade pip
pip install tensorflowjs

echo "=== Downloading Essentia ONNX model ==="
MODEL_ONNX="msd-vgg-1.onnx"
wget -O "$MODEL_ONNX" "https://essentia.upf.edu/models/autotagging/msd/msd-vgg-1.onnx"

echo "=== Ensuring target directory exists ==="
TARGET="frontend/public/models/musicvgg"
mkdir -p "$TARGET"

echo "=== Converting ONNX → TFJS model ==="

# Convert to TensorFlow SavedModel directory
TF_SAVED="saved_model_musicvgg"
onnx2tf_output="$TF_SAVED"

python3 - <<PYCODE
import onnx
from onnx2tf import onnx2tf

print("Loading ONNX model")
model = onnx.load("$MODEL_ONNX")

print("Converting to TensorFlow SavedModel")
onnx2tf.convert(
    input_onnx_model=model,
    output_saved_model_path="$onnx2tf_output"
)
PYCODE

echo "=== Converting TensorFlow SavedModel → TFJS ==="
tensorflowjs_converter \
  --input_format=tf_saved_model \
  "$TF_SAVED" \
  "$TARGET"

echo "=== Cleaning up ==="
deactivate
rm -rf "$PYENV_DIR" "$MODEL_ONNX" "$TF_SAVED"

echo "=== TFJS model ready under $TARGET ==="
ls -1 "$TARGET"
