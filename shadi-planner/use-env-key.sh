#!/usr/bin/env bash
set -euo pipefail

KEY="${GOOGLE_PLACES_API_KEY:-}"

if [ -z "$KEY" ]; then
  echo "Set GOOGLE_PLACES_API_KEY first."
  exit 1
fi

cat > "$(dirname "$0")/config.local.js" <<EOF
window.SHADI_PLANNER_GOOGLE_API_KEY = ${KEY@Q};
EOF

echo "Wrote shadi-planner/config.local.js from GOOGLE_PLACES_API_KEY"
