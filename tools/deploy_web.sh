#!/usr/bin/env bash
# Builds the app for the web and copies it into the website repo at /app.
# Usage: tools/deploy_web.sh /path/to/six-pack-stack   (then commit + push the website repo; Vercel deploys it)
set -euo pipefail
SITE="${1:?path to the six-pack-stack website repo}"
OUT=$(mktemp -d)
EXPO_BASE_URL=/app npx expo export -p web --output-dir "$OUT"
# Vercel never serves folders named node_modules, so the font files move to assets/nm.
mv "$OUT/assets/node_modules" "$OUT/assets/nm"
grep -rl "assets/node_modules/" "$OUT/_expo" | xargs sed -i 's#assets/node_modules/#assets/nm/#g'
# Keep the hand-written <head> (title, share tags, home-screen icon) and share image from the current deploy.
python3 - "$OUT/index.html" "$SITE/app/index.html" <<'PY'
import re, sys
new, old = open(sys.argv[1]).read(), open(sys.argv[2]).read()
head = re.search(r'<title>.*?(?=\n\s*<style|</head>)', old, re.S).group(0)
open(sys.argv[1], 'w').write(re.sub(r'<title>.*?</title>', head, new, count=1, flags=re.S))
PY
cp "$SITE/app/og.jpg" "$SITE/app/apple-touch-icon.png" "$OUT/"
rm -rf "$SITE/app" && cp -r "$OUT" "$SITE/app"
echo "Copied to $SITE/app. Commit and push the website repo to go live."
