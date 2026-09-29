#!/usr/bin/env bash
# Extracts the inline theme script from every published HTML page, computes its
# sha256 CSP hash, and fails if any page's script differs or is missing from
# scripts/csp-hashes.txt. Run locally after editing the inline theme script,
# and it also runs in CI (see .github/workflows/check-csp-hashes.yml).
set -euo pipefail

cd "$(dirname "$0")/.."

PAGES="index.html doctrine.html portfolio.html now.html governance.html 404.html"
RECORDED_FILE="scripts/csp-hashes.txt"
HASHES_FILE=$(mktemp)
trap 'rm -f "$HASHES_FILE"' EXIT

for page in $PAGES; do
  script=$(python3 -c "
import re, sys
content = open('$page').read()
m = re.search(r'<script>(\s*\(function \(\) \{\s*var s = localStorage.*?\)\(\);\s*)</script>', content, re.DOTALL)
if not m:
    sys.exit('No inline theme script found in $page')
sys.stdout.write(m.group(1))
")
  hash=$(printf '%s' "$script" | openssl dgst -sha256 -binary | openssl base64 -A)
  echo "$page: sha256-$hash"
  echo "$hash" >> "$HASHES_FILE"
done

unique_count=$(sort -u "$HASHES_FILE" | wc -l | tr -d ' ')
if [ "$unique_count" -ne 1 ]; then
  echo "::error::Inline theme script differs across pages. All pages must share byte-identical script content for a single CSP hash to cover them all." >&2
  exit 1
fi

final_hash=$(sort -u "$HASHES_FILE" | head -1)
echo "sha256-$final_hash" > "$RECORDED_FILE"
echo ""
echo "Recorded hash: sha256-$final_hash"
echo "Paste into the Cloudflare Transform Rule's script-src: 'self' 'sha256-$final_hash'"
