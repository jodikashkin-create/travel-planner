#!/bin/bash
set -e

cd "$(dirname "$0")"
echo "Installing Python dependencies..."
pip install -r requirements.txt

cd ..
echo "Starting Travel Planner API on port ${PORT:-10000}..."
uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000}
