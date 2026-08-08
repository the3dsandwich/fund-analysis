#!/bin/bash
set -e

LOCK_FILE=/tmp/refresh.lock
SNAPSHOTS_DIR=/data/snapshots
APP_DIR=/app

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# Prevent concurrent runs
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  log "Another refresh is already running, skipping."
  exit 0
fi

log "=== Starting refresh pipeline ==="

# Step 1: Fetch fund list from API
log "Step 1/6: Fetching fund list from Cathay API..."
node "$APP_DIR/research/fetch-fund-list/index.js"
log "Step 1/6: Fund list fetched."

# Step 2: Scrape fund details with Playwright
log "Step 2/6: Scraping fund details (this may take ~30 minutes)..."
# Remove stale progress file to force clean scrape
rm -f "$APP_DIR/research/scrape-details/data/progress.json"
node "$APP_DIR/research/scrape-details/index.js"
log "Step 2/6: Scraping complete."

# Step 3: Merge and categorize
log "Step 3/6: Merging and categorizing funds..."
node "$APP_DIR/research/merge-output/index.js"
log "Step 3/6: Merge complete."

# Step 4: Fold today's NAVs into the long-term series and write the snapshot
TODAY=$(date +%Y-%m-%d)
mkdir -p "$SNAPSHOTS_DIR"
log "Step 4/6: Updating NAV history and writing snapshot..."
node "$APP_DIR/docker/nav-history.mjs" \
  "$SNAPSHOTS_DIR/nav-series.json" \
  "$APP_DIR/research/merge-output/output/merged-funds.json" \
  "$SNAPSHOTS_DIR/$TODAY.json" \
  "$TODAY"
log "Step 4/6: Snapshot saved as $TODAY.json"

# Step 5: Retention cleanup
log "Step 5/6: Running retention policy..."
node "$APP_DIR/docker/retention.mjs" "$SNAPSHOTS_DIR"
log "Step 5/6: Retention complete."

# Step 6: Regenerate manifest
log "Step 6/6: Generating manifest..."
node "$APP_DIR/docker/manifest.mjs" "$SNAPSHOTS_DIR"
log "Step 6/6: Manifest generated."

log "=== Refresh pipeline complete ==="
