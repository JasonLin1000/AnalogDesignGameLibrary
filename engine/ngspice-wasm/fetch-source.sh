#!/usr/bin/env bash
# Fetch ngspice source into /opt/build/ngspice (WSL / Linux).
set -euo pipefail
BUILD=/opt/build
mkdir -p "$BUILD" && cd "$BUILD"
if [ ! -d ngspice ]; then
  git clone -q https://git.code.sf.net/p/ngspice/ngspice ngspice
fi
cd ngspice
# Pick the newest release tag (ngspice-NN or ngspice-NN.N)
TAG=$(git tag -l 'ngspice-[0-9]*' | grep -E '^ngspice-[0-9]+(\.[0-9]+)?$' | sort -V | tail -1)
echo "Using tag: $TAG"
git checkout -q "$TAG"
git log -1 --format='%h %cd'
