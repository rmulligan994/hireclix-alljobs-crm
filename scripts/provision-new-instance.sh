#!/usr/bin/env bash
# =============================================================================
# Provision a new client instance (creates Supabase project + deploys)
# =============================================================================
# This script guides you through adding a new client. Supabase projects
# must be created manually (or via Terraform) - this script helps with the rest.
#
# Usage: ./scripts/provision-new-instance.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INSTANCES_FILE="$REPO_ROOT/deployments/instances.yaml"

echo "=============================================="
echo "  New Client Instance Setup"
echo "=============================================="
echo ""
echo "You will need:"
echo "  1. A new Supabase project (create at supabase.com/dashboard)"
echo "  2. The Project ID (Settings → General → Reference ID)"
echo ""
read -p "Client name (e.g. acme-corp): " CLIENT_NAME
read -p "Supabase Project ID: " PROJECT_REF

if [ -z "$CLIENT_NAME" ] || [ -z "$PROJECT_REF" ]; then
  echo "Error: Both client name and project ID are required."
  exit 1
fi

# Add to instances.yaml (simple append - user can tidy format)
echo ""
echo "Add this to deployments/instances.yaml:"
echo ""
echo "  - name: $CLIENT_NAME"
echo "    project_ref: \"$PROJECT_REF\""
echo ""

# Configure Edge Function secrets reminder
echo "Then configure secrets in Supabase Dashboard for project $PROJECT_REF:"
echo "  Edge Functions → Secrets:"
echo "    MAILGUN_API_KEY"
echo "    BEE_CLIENT_ID"
echo "    BEE_CLIENT_SECRET"
echo ""
read -p "Deploy now? (y/n): " DEPLOY_NOW

if [ "$DEPLOY_NOW" = "y" ] || [ "$DEPLOY_NOW" = "Y" ]; then
  echo ""
  echo "Deploying to $PROJECT_REF..."
  "$SCRIPT_DIR/deploy-all.sh" "$PROJECT_REF"
fi
