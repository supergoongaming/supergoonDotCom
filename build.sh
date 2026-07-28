#!/bin/bash
set -e

cd "$(dirname "$0")"

pip install -q -r src/requirements.txt
python src/build.py dist/

echo ""
echo "To preview locally:"
echo "  python -m http.server 8080 -d dist"
