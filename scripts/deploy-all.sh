#!/usr/bin/env bash
# =============================================================================
# Deploy to all client instances (migrations + edge functions)
# =============================================================================
# Usage:
#   ./scripts/deploy-all.sh              # Deploy to all instances
#   ./scripts/deploy-all.sh <project_ref> # Deploy to single instance
#
# Prerequisites:
#   - supabase CLI: npm install -g supabase
#   - supabase login (creates access token)
#   - yq (for YAML): brew install yq  OR  pip install yq
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INSTANCES_FILE="$REPO_ROOT/deployments/instances.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check supabase CLI
if ! command -v supabase &> /dev/null; then
  log_error "Supabase CLI not found. Install: npm install -g supabase"
  exit 1
fi

# Parse project refs from instances.yaml
get_project_refs() {
  if [ -n "$1" ]; then
    # Single project passed as argument
    echo "$1"
    return
  fi

  if [ ! -f "$INSTANCES_FILE" ]; then
    log_error "instances.yaml not found at $INSTANCES_FILE"
    exit 1
  fi

  # Try yq (v4) first: .instances[].project_ref
  if command -v yq &> /dev/null; then
    yq eval '.instances[].project_ref' "$INSTANCES_FILE" 2>/dev/null | \
      grep -v "your-project-id-here" || true
    return
  fi

  # Fallback: grep for project_ref (simple extraction)
  grep -E "project_ref:" "$INSTANCES_FILE" 2>/dev/null | \
    sed -E 's/.*project_ref:\s*["]?([a-zA-Z0-9_-]{20,})["]?.*/\1/' | \
    grep -v "your-project-id" || true
}

deploy_instance() {
  local project_ref="$1"
  if [ -z "$project_ref" ] || [ "$project_ref" = "your-project-id-here" ]; then
    log_warn "Skipping placeholder project_ref"
    return 0
  fi

  log_info "Deploying to project: $project_ref"
  cd "$REPO_ROOT"

  # Link to this project (overwrites previous link)
  log_info "  Linking..."
  supabase link --project-ref "$project_ref"

  # Push migrations (all tables, RLS, triggers)
  log_info "  Pushing migrations..."
  if supabase db push; then
    log_info "  Migrations OK"
  else
    log_error "  Migrations failed for $project_ref"
    return 1
  fi

  # Deploy all edge functions
  log_info "  Deploying edge functions..."
  supabase functions deploy
  log_info "  Functions deployed"

  log_info "  Done: $project_ref"
  echo ""
}

# Main
log_info "=== Multi-Instance Deployment ==="
log_info "Repo: $REPO_ROOT"
echo ""

# Get list of project refs
PROJECT_REFS=()
while IFS= read -r line; do
  [ -n "$line" ] && PROJECT_REFS+=("$line")
done < <(get_project_refs "$1")

if [ ${#PROJECT_REFS[@]} -eq 0 ]; then
  log_warn "No instances to deploy. Add project_refs to deployments/instances.yaml"
  exit 0
fi

for ref in "${PROJECT_REFS[@]}"; do
  deploy_instance "$ref" || true  # Continue on error
done

log_info "=== Deployment complete ==="
