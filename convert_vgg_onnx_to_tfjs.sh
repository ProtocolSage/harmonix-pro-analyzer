#!/usr/bin/env bash
set -euo pipefail

echo "=== Make a Python virtualenv for conversion ==="
ENV=".tfjs_conv_env"
python3 -m venv "$ENV"
source "$ENV/bin/activate"

echo "=== Install required Python packages ==="
pip install --upgrade pip
pip install onnx onnx2tf tensorflowjs

echo "=== Download the Essentia ONNX model ==="
MODEL_ONNX="msd-vgg-1.onnx"
wget -O "$MODEL_ONNX" "https://essentia.upf.edu/models/autotagging/msd/msd-vgg-1.onnx"

echo "=== Prepare output directories ==="
TARGET="frontend/public/models/musicvgg"
mkdir -p "$TARGET"
SAVEDMODEL_DIR="saved_vgg_model"
rm -rf "$SAVEDMODEL_DIR"

echo "=== Convert ONNX -> TensorFlow SavedModel ==="
/usr/bin/env python3 - <<PYCODE
import onnx
from onnx2tf import convert

print("Loading ONNX model...")
onnx_model = onnx.load("$MODEL_ONNX")

print("Running ONNX -> TensorFlow conversion...")
# writes a SavedModel to SAVEDMODEL_DIR
convert(
    input_onnx_file_path="$MODEL_ONNX",
    output_folder_path="$SAVEDMODEL_DIR",
    not_use_onnxsim=True,
)
PYCODE

echo "=== Convert SavedModel -> TFJS ==="
tensorflowjs_converter \
  --input_format=tf_saved_model \
  "$SAVEDMODEL_DIR" \
  "$TARGET"

echo "=== Cleanup temporary files ==="
deactivate
rm -rf "$ENV" "$MODEL_ONNX" "$SAVEDMODEL_DIR"

echo "=== TFJS model files are in $TARGET ==="
ls -l "$TARGET"
