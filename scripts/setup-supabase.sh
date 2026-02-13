#!/usr/bin/env bash
# =============================================================================
# One-time Supabase setup: link project, push migrations, deploy Edge Functions
# =============================================================================
# Usage:
#   ./scripts/setup-supabase.sh                    # Use project from instances.yaml
#   ./scripts/setup-supabase.sh YOUR_PROJECT_REF   # Use specific project
#
# Before running:
#   1. Run: supabase login   (opens browser, one-time)
#   2. Get project ref from: Supabase Dashboard → Settings → General → Reference ID
#
# Database password (when prompted):
#   - Password input is HIDDEN — type/paste and press Enter (you won't see characters)
#   - Or set SUPABASE_DB_PASSWORD in env to skip the prompt:
#     export SUPABASE_DB_PASSWORD='your-db-password'
#     ./scripts/setup-supabase.sh
#   - Reset password: Supabase Dashboard → Settings → Database
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INSTANCES_FILE="$REPO_ROOT/deployments/instances.yaml"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Resolve project ref
if [ -n "$1" ]; then
  PROJECT_REF="$1"
  log_info "Using project ref: $PROJECT_REF"
elif [ -f "$INSTANCES_FILE" ]; then
  PROJECT_REF=$(grep -E "project_ref:" "$INSTANCES_FILE" 2>/dev/null | head -1 | sed -E 's/.*project_ref:\s*["]?([a-zA-Z0-9_-]{20,})["]?.*/\1/')
  if [ -z "$PROJECT_REF" ]; then
    log_error "No project_ref found. Run: ./scripts/setup-supabase.sh YOUR_PROJECT_REF"
    exit 1
  fi
  log_info "Using project ref from instances.yaml: $PROJECT_REF"
else
  log_error "Pass project ref: ./scripts/setup-supabase.sh YOUR_PROJECT_REF"
  exit 1
fi

# Check supabase CLI
if ! command -v supabase &> /dev/null; then
  log_error "Supabase CLI not found. Install: npm install -g supabase"
  exit 1
fi

# Check login
if ! supabase projects list &> /dev/null; then
  log_error "Not logged in. Run: supabase login"
  exit 1
fi

cd "$REPO_ROOT"

# 1. Link project
log_info "Step 1/3: Linking to Supabase project..."
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  log_info "If prompted for database password: type it (input is hidden) and press Enter"
fi
supabase link --project-ref "$PROJECT_REF"

# 2. Push migrations
log_info "Step 2/3: Pushing database migrations..."
supabase db push

# 3. Deploy Edge Functions
log_info "Step 3/3: Deploying Edge Functions..."
supabase functions deploy

log_info "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Add Edge Function secrets in Supabase Dashboard → Edge Functions → Secrets:"
echo "     - MAILGUN_API_KEY"
echo "     - BEE_CLIENT_ID"
echo "     - BEE_CLIENT_SECRET"
echo ""
echo "  2. Add env vars to Webflow Cloud (or .env.local for local):"
echo "     - NEXT_PUBLIC_SUPABASE_URL=https://$PROJECT_REF.supabase.co"
echo "     - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key from Settings → API>"
echo ""
