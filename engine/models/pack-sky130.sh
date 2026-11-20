#!/usr/bin/env bash
# Build a trimmed SKY130 model pack for the game (1.8V nfet/pfet, 5 corners + mismatch).
# Source: https://github.com/google/skywater-pdk-libs-sky130_fd_pr (Apache-2.0)
# Usage (WSL): bash pack-sky130.sh
set -euo pipefail
PDK=/opt/pdk/sky130_fd_pr
OUT="$(cd "$(dirname "$0")" && pwd)/sky130"
DEVICES="nfet_01v8 pfet_01v8"
CORNERS="tt ff ss sf fs"

rm -rf "$OUT" && mkdir -p "$OUT/cells"
cp "$PDK/LICENSE" "$OUT/LICENSE" 2>/dev/null || true
( cd "$PDK" && git log -1 --format='sky130_fd_pr commit %H (%cd)' ) > "$OUT/SOURCE.txt"

for d in $DEVICES; do
  mkdir -p "$OUT/cells/$d"
  for c in $CORNERS; do
    cp "$PDK/cells/$d/sky130_fd_pr__${d}__${c}.corner.spice" "$OUT/cells/$d/"
    cp "$PDK/cells/$d/sky130_fd_pr__${d}__${c}.pm3.spice"    "$OUT/cells/$d/"
  done
  cp "$PDK/cells/$d/sky130_fd_pr__${d}__mismatch.corner.spice" "$OUT/cells/$d/"
done

# Shared parameters: LOD (length-of-diffusion) params + dlc_rotweak block from all.spice
mkdir -p "$OUT/parameters"
cp "$PDK/models/parameters/lod.spice" "$OUT/parameters/"
{
  echo "* Shared parameters (extracted from sky130_fd_pr models/all.spice)"
  echo ".include \"parameters/lod.spice\""
  sed -n '/^\.param/,/^[^+]/p' "$PDK/models/all.spice" | sed '$d' | head -n 40
} > "$OUT/common.spice"

LIB="$OUT/sky130_game.lib.spice"
{
  echo "* Trimmed SKY130 model library for AnalogDesignGame"
  echo "* Devices: $DEVICES   Corners: $CORNERS"
  echo "* Derived from SkyWater sky130_fd_pr (Apache-2.0), see LICENSE / SOURCE.txt"
  echo "* Set mc_mm_switch=1 to enable device mismatch (Monte Carlo)."
  echo
  for c in $CORNERS; do
    echo ".lib $c"
    echo ".param mc_mm_switch=0 mc_pr_switch=0"
    echo ".include \"common.spice\""
    for d in $DEVICES; do
      echo ".include \"cells/$d/sky130_fd_pr__${d}__${c}.corner.spice\""
      echo ".include \"cells/$d/sky130_fd_pr__${d}__mismatch.corner.spice\""
    done
    echo ".endl"
    echo
  done
} > "$LIB"
# manifest.json: list of model files (relative paths) for the browser loader
( cd "$OUT" && find . -name '*.spice' | sed 's|^\./||' | sort | awk 'BEGIN{printf "["} {printf "%s\"%s\"", (NR>1?",":""), $0} END{print "]"}' ) > "$OUT/manifest.json"
du -sh "$OUT"
echo PACK_OK
